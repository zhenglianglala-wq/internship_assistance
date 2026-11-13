import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {dataDir} from './store.mjs';
const profile=resolve(dataDir,'boss-chrome'),binding=resolve(profile,'boss-target.json');
const fail=message=>Object.assign(Error(message),{status:409});
let opening;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function chromeExecutable(){
 const candidates=[process.env.BOSS_CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':null,'/usr/bin/google-chrome','/usr/bin/chromium'];
 for(const root of [resolve(dataDir,'browsers'),process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean))if(existsSync(root))for(const d of readdirSync(root).filter(n=>/^chromium-/.test(n)).reverse())for(const sub of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing','chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing','chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium','chrome-mac/Chromium.app/Contents/MacOS/Chromium','chrome-linux/chrome','chrome-linux64/chrome','chrome-win/chrome.exe','chrome-win64/chrome.exe'])candidates.push(join(root,d,sub));
 const file=candidates.find(p=>p&&existsSync(p));if(!file)throw fail('未找到 Chrome / Chromium。请安装 Chrome，或在 .env 设置 BOSS_CHROME_PATH');return file;
}
function localEndpoint(value,port){const u=new URL(value);if(u.protocol!=='ws:'||u.hostname!=='127.0.0.1'||u.port!==String(port))throw fail('浏览器调试地址无效');return u.href}
async function allocatePort(){return new Promise((resolvePort,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(error=>error?reject(error):resolvePort(port))})})}
async function endpoint(starting){
 let port,wsPath;
 if(starting)port=starting.port;
 else if(existsSync(join(profile,'cdp-endpoint.json')))({port,wsPath}=JSON.parse(readFileSync(join(profile,'cdp-endpoint.json'),'utf8')));
 else [port,wsPath]=readFileSync(join(profile,'DevToolsActivePort'),'utf8').trim().split('\n');
 if(!/^\d+$/.test(String(port))||Number(port)<1||Number(port)>65535||(!starting&&!wsPath?.startsWith('/devtools/browser/')))throw fail('浏览器尚未就绪');
 const response=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1500)}),v=await response.json();const ws=localEndpoint(v.webSocketDebuggerUrl,port),actualPath=new URL(ws).pathname;
 if(!/^\/devtools\/browser\/[\w-]+$/.test(actualPath)||wsPath&&actualPath!==wsPath)throw fail('浏览器连接已改变，请重新打开');
 if(starting){const pages=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1500)}).then(r=>r.json());if(!pages.some(p=>p.url===starting.marker))throw fail('专用浏览器仍在启动');writeFileSync(join(profile,'cdp-endpoint.json'),JSON.stringify({port:Number(port),wsPath:actualPath}),{mode:0o600})}
 return {port:Number(port),ws};
}
// Tests replace the process/endpoint boundary, never the user's browser profile.
export const chromeRuntime={endpoint,spawn,wait:sleep,now:()=>Date.now(),startupTimeout:15000,executable:chromeExecutable,port:allocatePort};
export async function ensureChrome({launch=false}={}){
 if(opening)return opening;
 try{return await chromeRuntime.endpoint()}catch{if(!launch)throw fail('请先点击「打开 Chrome 并登录」')}
 // Another request may have started the browser while the endpoint check awaited.
 if(opening)return opening;
 opening=(async()=>{
  mkdirSync(profile,{recursive:true,mode:0o700});const port=await chromeRuntime.port(),marker=`http://127.0.0.1:${process.env.PORT||4318}/#browser-${randomUUID()}`;
  const child=chromeRuntime.spawn(chromeRuntime.executable(),['--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',marker],{detached:true,stdio:'ignore'});
  let launchError=false;child.once('error',()=>{launchError=true});child.once('exit',code=>{if(code!==0)launchError=true});child.unref();
  const deadline=chromeRuntime.now()+chromeRuntime.startupTimeout;
  while(chromeRuntime.now()<deadline){await chromeRuntime.wait(Math.min(300,deadline-chromeRuntime.now()));if(launchError)break;try{return await chromeRuntime.endpoint({port,marker})}catch{}}
  throw fail('Chrome 启动未成功，请检查 BOSS_CHROME_PATH 或重新打开浏览器');
 })();
 try{return await opening}finally{opening=null}
}
export async function connectCDP(url){
 const ws=new WebSocket(url),pending=new Map(),handlers=new Map();let id=0;
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>{ws.close();reject(fail('Chrome 连接超时'))},5000);ws.addEventListener('open',()=>{clearTimeout(t);resolve()},{once:true});ws.addEventListener('error',()=>{clearTimeout(t);reject(fail('Chrome 连接失败'))},{once:true});ws.addEventListener('close',()=>{clearTimeout(t);reject(fail('Chrome 连接已关闭，请重新打开浏览器'))},{once:true})});
 function disconnect(){for(const p of pending.values()){clearTimeout(p.t);p.reject(fail('Chrome 已断开连接，已有岗位已保留'))}pending.clear()}
 ws.addEventListener('close',disconnect);ws.addEventListener('error',disconnect);
 ws.addEventListener('message',e=>{if(typeof e.data!=='string'||e.data.length>8*1024*1024)return;let v;try{v=JSON.parse(e.data)}catch{return}if(v.id){const p=pending.get(v.id);if(!p)return;pending.delete(v.id);clearTimeout(p.t);v.error?p.reject(fail('Chrome 页面操作失败，请重新连接')):p.resolve(v.result)}else for(const h of handlers.get(v.method)||[])h(v.params)});
 return {send(method,params={},timeout=12000){return new Promise((resolve,reject)=>{if(ws.readyState!==1){reject(fail('Chrome 已断开连接，请重新打开浏览器'));return}const n=++id,t=setTimeout(()=>{pending.delete(n);reject(fail('Chrome 页面响应超时'))},timeout);pending.set(n,{resolve,reject,t});try{ws.send(JSON.stringify({id:n,method,params}))}catch{clearTimeout(t);pending.delete(n);reject(fail('Chrome 已断开连接'))}})},on(method,fn){if(!handlers.has(method))handlers.set(method,new Set());handlers.get(method).add(fn);return()=>handlers.get(method)?.delete(fn)},close(){ws.close();disconnect()}};
}
export async function bossTarget({launch=false}={}){
 const ep=await ensureChrome({launch}),browser=await connectCDP(ep.ws);
 try{const {targetInfos}=await browser.send('Target.getTargets');let id;try{id=JSON.parse(readFileSync(binding,'utf8')).id}catch{}
 let target=targetInfos.find(t=>t.targetId===id&&t.type==='page'&&/^https:\/\/(www\.)?zhipin\.com(?:\/|$)/.test(t.url));
 if(!target){if(!launch)throw fail('BOSS 专用标签页已关闭或已跳转，请重新打开 Chrome 搜索');const created=await browser.send('Target.createTarget',{url:'https://www.zhipin.com/'});id=created.targetId;writeFileSync(binding,JSON.stringify({id}),{mode:0o600});target={targetId:id}}
 return {client:await connectCDP(`ws://127.0.0.1:${ep.port}/devtools/page/${target.targetId}`),id:target.targetId};
 }finally{browser.close()}
}
