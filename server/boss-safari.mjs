import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {normalizeJob} from './job-parsers.mjs';
import {readBossPage,selectBossJob} from './boss-dom.mjs';
const exec=promisify(execFile),script=fileURLToPath(new URL('./safari-boss.applescript',import.meta.url));
let activeSearchTarget=null;
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const schema=z.object({state:z.string(),url:z.string().max(2200).optional(),jobs:z.array(z.object({externalId:z.string().regex(/^[\w-]{1,160}$/),role:z.string().min(1).max(250),company:z.string().min(1).max(200),url:z.string().max(2000),city:z.string().max(500).default(''),employment:z.enum(['intern','parttime']).optional(),daysPerWeek:z.number().int().min(1).max(7).optional(),durationMonths:z.number().int().min(1).max(24).optional(),salary:z.string().max(250).default(''),description:z.string().max(30000).default(''),fieldWarnings:z.array(z.string().max(150)).max(5).default([]),detailStatus:z.enum(['list','detail']).default('list')})).max(100),detail:z.object({url:z.string(),description:z.string().max(30000),salary:z.string().max(250),fieldWarnings:z.array(z.string()).default([]),detailStatus:z.literal('detail')}).nullish()});
export function bossJobURL(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.zhipin.com','zhipin.com'].includes(url.hostname)||!/^\/job_detail\/[\w-]+\.html$/.test(url.pathname))throw fail('岗位链接不是有效的 BOSS 岗位地址',400);return `https://www.zhipin.com${url.pathname}`;}
function connectionError(error){const raw=String(error.stderr||error.message||'');
  if(/SAFARI_NOT_RUNNING/.test(raw))return fail('请先打开 Safari，并登录 BOSS 直聘');
  if(/BOSS_TAB_AMBIGUOUS/.test(raw))return fail('Safari 中有多个 BOSS 标签页，请切到要采集的岗位页后重试');
  if(/BOSS_TAB_CHANGED/.test(raw))return fail('采集中的 BOSS 标签页已关闭或改变，请重新开始');
  if(/BOSS_TAB_NOT_FOUND/.test(raw))return fail('Safari 中未找到 BOSS 标签页，请先打开职位列表');
  if(/JavaScript.*Apple|Apple.*JavaScript|允许.*JavaScript|javascript.*disabled/i.test(raw))return fail('Safari 尚未允许来自 Apple 事件的 JavaScript；请在 Safari 开发者设置中开启后重试');
  if(/1743|not authorized|not permitted|不允许|未获授权|无权发送/i.test(raw))return fail('macOS 未授权本地服务控制 Safari，请在系统设置的自动化权限中检查');
  return fail('Safari 读取失败，请确认浏览器已登录、允许本地自动化且页面加载完成');
}
async function appleEvent(action,payload,target){
  if(process.platform!=='darwin')throw fail('Safari 登录态采集需要 macOS',400);
  try{const {stdout}=await exec('/usr/bin/osascript',[script,action,payload,target?.windowId||'',String(target?.tabIndex||'')],{timeout:20000,maxBuffer:2*1024*1024});const [windowId,index,...json]=stdout.trim().split('\n');return {windowId,tabIndex:Number(index),value:JSON.parse(json.join('\n'))}}
  catch(error){if(error.status)throw error;throw connectionError(error)}
}
// Tests replace only this OS boundary; no test may touch the user's logged-in Safari.
export const safariServices={run:appleEvent,wait:ms=>new Promise(r=>setTimeout(r,ms))};
export async function readSafariBoss(target){const result=await safariServices.run('read',`JSON.stringify((${readBossPage.toString()})())`,target||activeSearchTarget);const value=schema.parse(result.value);return {...value,target:{windowId:result.windowId,tabIndex:result.tabIndex}};}
function assertReady(snapshot){const messages={wrong_page:'请将 Safari 切换到 BOSS 直聘岗位列表',login_required:'BOSS 登录已失效，请在 Safari 完成登录',captcha:'BOSS 出现安全验证，请在原页面自行完成后再采集',blocked:'BOSS 暂时限制访问，本次采集已停止',loading:'BOSS 页面仍在加载，请稍后重试',structure_changed:'BOSS 页面结构未能识别，请切换到有岗位列表的页面'};if(snapshot.state!=='ready')throw fail(messages[snapshot.state]||'当前页面没有可采集的岗位');}
export async function checkSafariBoss(){const snapshot=await readSafariBoss();assertReady(snapshot);return {connected:true,count:snapshot.jobs.length,url:snapshot.url};}
export const bossManualSafariSource={id:'boss-manual-safari',kind:'boss_safari',name:'BOSS · 当前浏览岗位（Safari）',url:'https://www.zhipin.com/web/geek/jobs'};
// 采集 Safari 当前浏览的岗位：要求处于列表页且已选中岗位（右侧显示职位描述）。
export async function collectCurrentSafariBossJob(){
  const snapshot=await readSafariBoss();
  if(/\/job_detail\//.test(snapshot.url||''))throw fail('检测到你正在浏览岗位详情页：请回到岗位列表，点击选中该岗位（右侧出现职位描述）后再采集');
  assertReady(snapshot);
  const detail=snapshot.detail;
  if(!detail)throw fail('未找到正在浏览的岗位：请在列表中点击选中一个岗位（右侧出现职位描述）后再采集');
  const url=bossJobURL(detail.url);
  const card=snapshot.jobs.find(j=>bossJobURL(j.url)===url);
  if(!card)throw fail('选中岗位与列表不同步，请重新点击该岗位后再采集');
  const normalized=normalizeJob({...card,description:detail.description||card.description,salary:detail.salary||card.salary,url},bossManualSafariSource);
  if(!normalized)throw fail('岗位信息不完整，无法保存');
  const saved={...card,...normalized,description:detail.description||normalized.description,salary:detail.salary||normalized.salary,fieldWarnings:[...new Set([...(card.fieldWarnings||[]),...(detail.fieldWarnings||[])])],detailStatus:'detail',detailCapturedAt:new Date().toISOString()};
  return {job:saved,source:bossManualSafariSource,note:`已采集「${saved.company} · ${saved.role}」，进入机会池`};
}
export async function collectSafariBoss(source){  const first=await readSafariBoss();assertReady(first);const byURL=new Map(first.jobs.map(j=>[bossJobURL(j.url),{...j,url:bossJobURL(j.url)}]));
  function merge(snapshot){if(snapshot.detail){const key=bossJobURL(snapshot.detail.url);if(byURL.has(key)){const previous=byURL.get(key),salary=snapshot.detail.salary||previous.salary;byURL.set(key,{...previous,...snapshot.detail,url:key,salary,fieldWarnings:[...new Set([...previous.fieldWarnings,...snapshot.detail.fieldWarnings])].filter(w=>!salary||!w.includes('薪资'))})}}}
  merge(first);let detailsRead=0,detailError='';
  for(const job of [...byURL.values()].slice(0,source.detailLimit??5)){
    try{
      const click=await safariServices.run('select',`JSON.stringify((${selectBossJob.toString()})(${JSON.stringify(job.externalId)}))`,first.target);
      if(!click.value)continue;
      for(let attempt=0;attempt<4;attempt++){await safariServices.wait(700);const next=await readSafariBoss(first.target);assertReady(next);if(next.url!==first.url)throw fail('BOSS 搜索页面已改变，详情读取已停止');if(next.detail&&bossJobURL(next.detail.url)===job.url){merge(next);detailsRead++;break;}}
    }catch(error){detailError=error.message;break;}
  }
  const jobs=[...byURL.values()].map(raw=>{const normalized=normalizeJob(raw,source);return normalized?{...normalized,daysPerWeek:raw.daysPerWeek??normalized.daysPerWeek,durationMonths:raw.durationMonths??normalized.durationMonths,fieldWarnings:raw.fieldWarnings,detailStatus:raw.detailStatus,browserEvidence:{browser:'Safari',page:first.url,capturedAt:new Date().toISOString(),...(raw.detailStatus==='detail'?{detailCapturedAt:new Date().toISOString()}:{})}}:null}).filter(Boolean);
  if(!jobs.length)throw fail('没有读取到完整的 BOSS 岗位记录，旧数据已保留');
  return {jobs,complete:false,note:`Safari 当前列表 ${jobs.length} 个岗位，补充读取 ${detailsRead} 个详情。${detailError?'详情读取提前停止：'+detailError+'。':''}未读取的详情保持待补充；当前页不是全量列表，不据此标记岗位下架。`};
}
export const bossCities={'北京':'101010100','上海':'101020100','广州':'101280100','深圳':'101280600','杭州':'101210100','成都':'101270100','南京':'101190100','武汉':'101200100','西安':'101110100','苏州':'101190400','天津':'101030100','重庆':'101040100'};
export async function openBossSearch(input){const {keyword,city,internOnly}=z.object({keyword:z.string().trim().min(1).max(100),city:z.enum(Object.keys(bossCities)),internOnly:z.boolean().default(true)}).parse(input);const params=new URLSearchParams({query:keyword,city:bossCities[city]});if(internOnly)params.set('jobType','1902');const url=`https://www.zhipin.com/web/geek/jobs?${params}`;const result=await safariServices.run('open',url);activeSearchTarget=result.windowId&&result.tabIndex?{windowId:result.windowId,tabIndex:result.tabIndex}:null;return {opened:true,url};}
export function attachBossSafariRoutes(app,{saveSourceResult=()=>{}}={}){
  const real=req=>{if(req.workspace==='demo')throw fail('BOSS 账号连接请切换到「我的空间」',400)};
  app.post('/api/boss-safari/check',async(req,res,next)=>{try{real(req);res.json(await checkSafariBoss())}catch(error){next(error)}});
  app.post('/api/boss-safari/search',async(req,res,next)=>{try{real(req);res.json(await openBossSearch(req.body))}catch(error){next(error)}});
  app.post('/api/boss-safari/current',async(req,res,next)=>{try{real(req);const result=await collectCurrentSafariBossJob();saveSourceResult(req.db,result.source,{jobs:[result.job],complete:false});res.json({job:result.job,note:result.note})}catch(error){next(error)}});
}
