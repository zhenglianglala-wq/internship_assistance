import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.NODE_ENV='test';process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'internship-safari-'));
const {app}=await import('../server/index.mjs');
const {safariServices,collectSafariBoss,bossJobURL}=await import('../server/boss-safari.mjs');
const {store}=await import('../server/store.mjs');
const {startCollection,saveSourceResult}=await import('../server/collection.mjs');
let server,base,token,source;
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;token=(await call('/bootstrap')).body.token;safariServices.wait=async()=>{}});
after(async()=>{await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true})});
async function call(path,body,method=body===undefined?'GET':'POST',workspace='personal'){const r=await fetch(base+'/api'+path,{method,headers:{'X-Workspace':workspace,'X-Local-Token':token||'','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()}}
const jobs=[{externalId:'one',role:'前端开发实习生',company:'Safari 合成公司',url:'https://www.zhipin.com/job_detail/one.html?securityId=PRIVATE',city:'武汉',salary:'',description:'React · 本科',fieldWarnings:['薪资使用特殊字体，需查看原页面核实'],detailStatus:'list'},{externalId:'two',role:'后端开发实习生',company:'Safari 第二公司',url:'https://www.zhipin.com/job_detail/two.html',city:'武汉',salary:'200元/天',description:'实习',fieldWarnings:[],detailStatus:'list'}];
const snapshot=()=>({windowId:'3',tabIndex:2,value:{state:'ready',url:'https://www.zhipin.com/web/geek/jobs?city=101200100',jobs:structuredClone(jobs),detail:null}});
async function finish(){for(let i=0;i<100;i++){const c=(await call('/collection')).body;if(!c.activeRun)return c;await new Promise(r=>setTimeout(r,10))}throw new Error('task did not finish')}
test('Safari source accepts only BOSS list pages and check does not persist job data',async()=>{
 const r=await call('/collection/sources',{name:'BOSS直聘 · Safari',url:'https://www.zhipin.com/web/geek/jobs'});assert.equal(r.status,201);source=r.body;assert.equal(source.kind,'boss_safari');
 assert.equal((await call('/collection/sources',{name:'Duplicate',url:'https://www.zhipin.com/web/geek/job?query=xx'})).status,409);
 assert.equal((await call('/collection/sources',{name:'Wrong',url:'https://www.zhipin.com.attacker.example/web/geek/jobs',kind:'boss_safari'})).status,400);
 safariServices.run=async action=>{assert.equal(action,'read');return snapshot()};const check=await call('/boss-safari/check',{});assert.equal(check.status,200);assert.equal(check.body.count,2);assert(!JSON.stringify(check.body).includes('PRIVATE'));assert.equal((await call('/collection')).body.jobs.length,0);assert.equal((await call('/boss-safari/check',{},'POST','demo')).status,400);
});
test('Safari collection merges matching details, normalizes URLs and deduplicates repeated snapshots',async()=>{
 let selected='';safariServices.run=async(action,script,target)=>{if(action==='select'){assert.deepEqual(target,{windowId:'3',tabIndex:2});selected=script.includes('"one"')?'one':'two';return {value:true}}const s=snapshot();if(selected)s.value.detail={url:`https://www.zhipin.com/job_detail/${selected}.html`,description:'每周3天，实习3个月；React 项目开发。',salary:selected==='one'?'':'200元/天',fieldWarnings:selected==='one'?jobs[0].fieldWarnings:[],detailStatus:'detail'};return s;};
 await call('/collection/runs',{sourceId:source.id});let c=await finish();assert.equal(c.runs[0].status,'success');assert.equal(c.jobs.length,2);assert(c.jobs.every(j=>j.detailStatus==='detail'));assert(c.jobs.every(j=>!j.url.includes('PRIVATE')));assert.equal(c.jobs[0].daysPerWeek,3);assert.equal((await call('/bootstrap')).body.applications.length,0);
 await call('/collection/runs',{sourceId:source.id});c=await finish();assert.equal(c.runs[0].added,0);assert.equal(c.runs[0].updated,0);assert.equal(c.runs[0].results[0].unchanged,2);
 const saved=await call(`/collection/jobs/${c.jobs[0].id}/save`,{});assert.equal(saved.body.source,'BOSS直聘');assert.match(saved.body.events[0].evidence,/浏览器：Safari/);
});
test('login walls and verification stop collection and retain earlier jobs',async()=>{
 for(const state of ['login_required','captcha','blocked','structure_changed']){let count=0;safariServices.run=async()=>{count++;const s=snapshot();s.value={state,jobs:[]};return s};await call('/collection/runs',{sourceId:source.id});const c=await finish();assert.equal(c.runs[0].status,'failed');assert.equal(c.jobs.length,2);assert(c.jobs.every(j=>j.availability==='open'));assert.equal(count,1);}
});
test('mismatched detail snapshots are never merged and verification prevents further clicks',async()=>{
 let clicks=0,reads=0;safariServices.run=async action=>{if(action==='select'){clicks++;return {value:true}}const s=snapshot();if(reads++)s.value={state:'captcha',jobs:[]};return s};const r=await collectSafariBoss(source);assert.equal(clicks,1);assert.equal(r.jobs.length,2);assert(r.jobs.every(j=>j.detailStatus==='list'));assert.match(r.note,/安全验证/);assert.equal(r.complete,false);
});
test('Safari sources are excluded from scheduled collection and search destinations are fixed',async()=>{
 assert.throws(()=>startCollection(store('personal'),{trigger:'scheduled'}),/定时采集/);
 let opened;safariServices.run=async(action,url)=>{assert.equal(action,'open');opened=new URL(url);return {opened:true}};
 const result=await call('/boss-safari/search',{keyword:'算法 实习',city:'杭州'});assert.equal(result.status,200);assert.equal(opened.hostname,'www.zhipin.com');assert.equal(opened.searchParams.get('city'),'101210100');assert.equal(opened.searchParams.get('query'),'算法 实习');assert.equal(opened.searchParams.get('jobType'),'1902');await call('/boss-safari/search',{keyword:'设计',city:'上海',internOnly:false});assert.equal(opened.searchParams.has('jobType'),false);
 assert.equal((await call('/boss-safari/search',{keyword:'x',city:'http://localhost'})).status,400);assert.throws(()=>bossJobURL('https://attacker.example/job_detail/a.html'));
});

test('list refresh retains an earlier detail and its capture time',async()=>{
 safariServices.run=async()=>snapshot();const partial=await collectSafariBoss({...source,detailLimit:0});const before=store('personal').get('discoveredJobs',partial.jobs[0].id);assert.equal(before.detailStatus,'detail');saveSourceResult(store('personal'),source,partial);const after=store('personal').get('discoveredJobs',partial.jobs[0].id);assert.equal(after.description,before.description);assert.equal(after.detailStatus,'detail');assert.equal(after.browserEvidence.detailCapturedAt,before.browserEvidence.detailCapturedAt);
});

test('Safari current-job capture saves the selected job and rejects detail pages',async()=>{
  let showDetail=true;
  safariServices.run=async()=>{const s=snapshot();if(showDetail)s.value.detail={url:'https://www.zhipin.com/job_detail/one.html',description:'每周3天，React 项目开发。',salary:'',fieldWarnings:[],detailStatus:'detail'};return s;};
  const r=await call('/boss-safari/current',{});assert.equal(r.status,200);assert.match(r.body.note,/前端开发实习生/);
  const saved=store('personal').all('discoveredJobs').find(j=>j.externalId==='one'&&j.detailStatus==='detail');assert(saved);assert.match(saved.description,/每周3天/);assert.equal(saved.salary,'');
  safariServices.run=async()=>{const s=snapshot();s.value.url='https://www.zhipin.com/job_detail/one.html';s.value.detail={url:'https://www.zhipin.com/job_detail/one.html',description:'x',salary:'',fieldWarnings:[],detailStatus:'detail'};s.value.jobs=[];return s;};
  const reject=await call('/boss-safari/current',{});assert.equal(reject.status,409);assert.match(String(reject.body.error),/回到岗位列表/);
  showDetail=false;safariServices.run=async()=>{const s=snapshot();return s;};const none=await call('/boss-safari/current',{});assert.equal(none.status,409);assert.match(String(none.body.error),/未找到正在浏览的岗位/);
  assert.equal((await call('/boss-safari/current',{},'POST','demo')).status,400);
});
