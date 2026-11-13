process.env.NODE_ENV='test';
process.env.IGNORE_LOCAL_ENV='true';
await import('./chrome-fixture.mjs');
const {app}=await import('../../server/index.mjs');
const {collectorServices}=await import('../../server/collection.mjs');
const {recruitmentServices}=await import('../../server/recruitment.mjs');
recruitmentServices.text=async url=>{await new Promise(r=>setTimeout(r,80));if(url.includes('careers.tencent'))return {ok:true,status:200,url:'https://new-tencent.example.com/',text:'<title>招聘</title>'};if(url.includes('zhipin'))return {ok:false,status:403,url,text:'blocked'};return {ok:true,status:200,url:url.includes('join.qq.com')?'https://join.qq.com/campus/':url,text:'<title>招聘入口</title>'}};
const {safariServices}=await import('../../server/boss-safari.mjs');
let safariBlocked=false,selectedBoss='';
const bossRows=[{externalId:'boss-one',role:'BOSS前端实习生',company:'Safari浏览器合成公司',url:'https://www.zhipin.com/job_detail/boss-one.html',city:'上海',salary:'',description:'React TypeScript',fieldWarnings:['薪资使用特殊字体，需查看原页面核实'],detailStatus:'list'}];
// This fixture replaces the Apple Events boundary, never the user's Safari process.
safariServices.wait=async()=>{};
safariServices.run=async(action,payload)=>{if(action==='open'){safariBlocked=new URL(payload).searchParams.get('query')==='验证阻塞';return {opened:true}}if(action==='select'){selectedBoss='boss-one';return {value:true}}return {windowId:'fixture-window',tabIndex:1,value:{state:safariBlocked?'captcha':'ready',url:'https://www.zhipin.com/web/geek/jobs?query=实习&city=101020100',jobs:safariBlocked?[]:bossRows,detail:selectedBoss?{url:bossRows[0].url,description:'React 与 TypeScript 开发。每周3天，实习3个月。',salary:'',fieldWarnings:bossRows[0].fieldWarnings,detailStatus:'detail'}:null}}};
const fixture={jobs:[
  {id:'fixture-frontend',title:'前端开发实习生',location:{name:'Shanghai, China'},content:'<p>参与 React 与 TypeScript 开发。每周至少3天，实习3个月。</p>',absolute_url:'https://careers.example.com/jobs/frontend',updated_at:'2026-10-25T10:00:00Z'},
  {id:'fixture-backend',title:'Backend Engineer',location:{name:'Beijing, China'},content:'<p>Full-time backend engineering role.</p>',absolute_url:'https://careers.example.com/jobs/backend',updated_at:'2026-10-25T09:00:00Z'},
]};
// Only external upstream responses are fixtures; HTTP routes, tasks, SQLite and UI are real.
collectorServices.text=async url=>{
  if(url==='https://boards-api.greenhouse.io/v1/boards/test-discovery/jobs?content=true'){await new Promise(r=>setTimeout(r,1000));return {ok:true,status:200,url,text:JSON.stringify(fixture)};}
  if(url==='https://boards-api.greenhouse.io/v1/boards/unavailable/jobs?content=true')return {ok:false,status:503,url,text:'upstream unavailable'};
  throw new Error('Browser fixture does not cover this external URL');
};
app.listen(Number(process.env.PORT)||4319,'127.0.0.1',()=>console.log('独立浏览器测试服务已启动'));
