import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'internship-mobile-'));
const {app}=await import('../server/index.mjs');
const {store}=await import('../server/store.mjs');
const {parseSharedText,createReceiver,mobileServices,bridgeStatus,stopBridge}=await import('../server/mobile.mjs');
const {aiServices}=await import('../server/ai.mjs');
let server,base,token;
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;token=(await call('/bootstrap')).body.token});
after(async()=>{await stopBridge();await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true})});
async function call(path,body,method=body===undefined?'GET':'POST',workspace='personal'){const r=await fetch(base+'/api'+path,{method,headers:{'X-Local-Token':token||'','X-Workspace':workspace,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
const content='BOSS直聘\n公司：手机样例公司\n岗位：前端开发实习生\n城市：上海\n薪资：200元/天\n每周3天，实习3个月。\nhttps://www.zhipin.com/job_detail/example.html?utm_source=share';
let item,job;
test('shared text preserves evidence and detects platform without fetching app links',async()=>{
 const parsed=parseSharedText(content);assert.equal(parsed.platform,'boss');assert.equal(parsed.company,'手机样例公司');assert.equal(parsed.role,'前端开发实习生');assert.equal(parsed.url,'https://www.zhipin.com/job_detail/example.html');
 assert.equal(parseSharedText('实习僧\nhttps://www.shixiseng.com/intern/example').platform,'shixiseng');
 const response=await call('/mobile/inbox',{text:content,device:'iPhone'});assert.equal(response.status,201);item=response.body;assert.equal(item.text,content);assert.equal((await call('/collection')).body.jobs.length,0);assert.equal((await call('/bootstrap')).body.applications.length,0);
 assert.equal((await call('/mobile/inbox',{text:content,device:'Android'})).body.id,item.id);
});
test('review is required; import persists preferences-compatible jobs but creates no application',async()=>{
 assert.equal((await call(`/mobile/inbox/${item.id}/commit`,{...item.suggested,company:''})).status,400);
 const r=await call(`/mobile/inbox/${item.id}/commit`,item.suggested);assert.equal(r.status,200);job=r.body;assert.equal(job.provider,'mobile');assert.equal(job.daysPerWeek,3);assert.equal(job.durationMonths,3);assert.equal(job.mobileOriginal.device,'iPhone');
 assert.equal((await call(`/mobile/inbox/${item.id}/commit`,item.suggested)).body.id,job.id);
 const snapshot=(await call('/collection')).body;assert.equal(snapshot.jobs.length,1);assert(snapshot.jobs[0].match.matched);assert.equal((await call('/bootstrap')).body.applications.length,0);assert.equal((await call('/mobile')).body.inbox[0].status,'imported');
 const a=await call(`/collection/jobs/${job.id}/save`,{});assert.equal(a.status,201);assert.equal(a.body.source,'BOSS直聘');assert.match(a.body.events[0].evidence,/手机分享时间/);assert(a.body.events[0].evidence.includes(content));
});
test('linkless screenshots never invent a link or match unrelated linkless applications',async()=>{
 const r=(await call('/mobile/inbox',{text:'公司：第二家公司\n岗位：设计实习生\n城市：深圳',device:'Android'})).body;
 const j=(await call(`/mobile/inbox/${r.id}/commit`,r.suggested)).body;assert(j.id);assert.equal(j.url,'');assert.equal((await call('/collection')).body.jobs.find(x=>x.id===j.id).applicationId,null);
 const a=await call(`/collection/jobs/${j.id}/save`,{});assert.equal(a.status,201);assert.notEqual(a.body.id,job.id);const a2=await call(`/collection/jobs/${j.id}/save`,{});assert.equal(a.body.id,a2.body.id);
 const r2=(await call('/mobile/inbox',{text:'公司：第三家公司\n岗位：设计实习生'})).body;const j2=(await call(`/mobile/inbox/${r2.id}/commit`,r2.suggested)).body;
 assert.notEqual(j.id,j2.id);assert.equal((await call('/collection')).body.jobs.find(x=>x.id===j2.id).applicationId,null);
});
test('mobile import rejects unsafe links, oversized files, invalid images and demo writes',async()=>{
 assert.equal((await call('/mobile/inbox',{text:''})).status,400);
 assert.equal((await call('/mobile/inbox',{text:content},'POST','demo')).status,400);
 assert.equal((await call('/mobile/inbox',{text:'x'.repeat(30001)})).status,400);
 for(const link of ['https://127.0.0.1/','https://192.168.1.3/a','https://user:pass@public.example/a'])assert.equal((await call('/mobile/inbox',{text:link})).status,400);
 const form=new FormData();form.append('image',new Blob(['not an image'],{type:'image/png'}),'image.png');assert.equal((await call('/mobile/inbox',form)).status,400);
 const large=new FormData();large.append('image',new Blob([new Uint8Array(8*1024*1024+1)],{type:'image/png'}),'large.png');assert.equal((await call('/mobile/inbox',large)).status,413);
 assert.equal((await call('/mobile/bridge',{address:'0.0.0.0'})).status,400);assert.equal(bridgeStatus().enabled,false);
});
test('OCR transport receives only the image; extraction failure preserves existing inbox data',async()=>{
 const original=mobileServices.ocr;let count=0;mobileServices.ocr=async buffer=>{assert.equal(buffer[0],137);count++;return '公司：OCR 样例公司\n岗位：算法实习生';};
 try{const form=new FormData();form.append('device','iPhone');form.append('image',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,1])],{type:'image/png'}),'sample.png');const r=await call('/mobile/inbox',form);assert.equal(r.status,201);assert.equal(r.body.method,'screenshot');assert.equal(r.body.suggested.company,'OCR 样例公司');assert.equal(count,1);
 const before=(await call('/mobile')).body.inbox.length;mobileServices.ocr=async()=>{throw Object.assign(new Error('识别失败'),{status:422})};assert.equal((await call('/mobile/inbox',form)).status,422);assert.equal((await call('/mobile')).body.inbox.length,before);
 }finally{mobileServices.ocr=original;}
});
test('isolated phone receiver authenticates intake and exposes no workspace or model APIs',async()=>{
 const secret='pairing-test-token',receiver=createReceiver({token:secret,address:'127.0.0.1',expiresAt:Date.now()+60000}),phone=receiver.listen(0,'127.0.0.1');await new Promise(r=>phone.once('listening',r));const url=`http://127.0.0.1:${phone.address().port}`;
 try{assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/api/bootstrap')).status,404);assert.equal((await fetch(url+'/api/model')).status,404);
 const send=(headers={},text=content)=>fetch(url+'/api/share',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({text})});
 assert.equal((await send()).status,403);assert.equal((await send({'X-Pairing-Token':'wrong'})).status,403);assert.equal((await send({'X-Pairing-Token':secret,Origin:'https://foreign.example'})).status,403);
 const r=await send({'X-Pairing-Token':secret,'User-Agent':'Android'});assert.equal(r.status,201);const body=await r.json();assert.deepEqual(Object.keys(body).sort(),['message','ok','status']);assert(!JSON.stringify(body).includes(content));
 for(let i=0;i<11;i++)assert.equal((await send({'X-Pairing-Token':secret})).status,201);assert.equal((await send({'X-Pairing-Token':secret})).status,429);
 }finally{await new Promise(r=>phone.close(r))}
 const expired=createReceiver({token:secret,address:'127.0.0.1',expiresAt:0}).listen(0,'127.0.0.1');await new Promise(r=>expired.once('listening',r));try{assert.equal((await fetch(`http://127.0.0.1:${expired.address().port}/`)).status,410)}finally{await new Promise(r=>expired.close(r))}
});
test('optional model structuring changes only suggestions and cannot replace the source link',async()=>{
 const pending=(await call('/mobile/inbox',{text:'公司：百炼整理样例\n岗位：数据分析实习生\nhttps://www.shixiseng.com/intern/sample'})).body;
 process.env.AI_API_KEY='TEST-ONLY';process.env.AI_BASE_URL='https://dashscope.aliyuncs.com/compatible-mode/v1';process.env.AI_MODEL='qwen-plus';
 const original=aiServices.fetch;aiServices.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({company:'百炼整理样例',role:'数据分析实习生',url:'https://invented.example/'})}}]})});
 try{const before=store('personal').all('discoveredJobs').length;const r=await call(`/mobile/inbox/${pending.id}/structure`,{});assert.equal(r.status,200);assert.equal(r.body.url,pending.suggested.url);assert.equal(store('personal').all('discoveredJobs').length,before);assert.equal(store('personal').get('mobileInbox',pending.id).status,'pending');}
 finally{aiServices.fetch=original;delete process.env.AI_API_KEY;delete process.env.AI_BASE_URL;delete process.env.AI_MODEL;}
});
