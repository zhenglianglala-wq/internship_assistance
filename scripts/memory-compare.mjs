// 记忆前后对比脚本：同一份简历与岗位，在有记忆/无记忆两种条件下各生成 N 次建议，机械评分后输出报告。
// 用法：
//   node scripts/memory-compare.mjs            离线模式（假模型，仅验证链路与注入机制，不代表模型质量差异）
//   node scripts/memory-compare.mjs --real     真实模式（使用本机 .env 的百炼密钥发起约 18 次真实调用，费用极低但非零）
//   node scripts/memory-compare.mjs --real --reps 3   每条件重复次数（默认 3）
// 数据库使用系统临时目录（隔离），绝不写入个人空间；报告写入 artifacts/（已 Git 忽略）。
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const argv=process.argv.slice(2),real=argv.includes('--real'),reps=Math.max(1,Number(argv[argv.indexOf('--reps')+1]||3)),only=argv.includes('--only')?argv[argv.indexOf('--only')+1]:null;
const testDir=mkdtempSync(join(tmpdir(),'memory-compare-'));
// 两种模式都以 NODE_ENV=test 启动：跳过采集调度器与 4318 端口监听（调度器会真实请求招聘网站，且超时上限内跑不完）。
// 真实模式的密钥由本行手动加载 .env 获得，数据库仍使用临时目录隔离。
process.env.NODE_ENV='test';
if(!real){process.env.AI_PROVIDER='compatible';process.env.AI_BASE_URL='https://offline.example.com/v1';process.env.AI_API_KEY='OFFLINE';process.env.AI_MODEL='offline-model';}
process.env.DATA_DIR=testDir;
if(real)await import('dotenv/config');
const {app}=await import('../server/index.mjs');
const {aiServices}=await import('../server/ai.mjs');
const {store}=await import('../server/store.mjs');
if(!real)aiServices.fetch=async(url,init)=>{const body=JSON.parse(init.body);return {ok:true,status:200,json:async()=>({choices:[{message:{content:'[离线回显] '+body.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n')}}],usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}})};};
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
let token='';
const call=async(path,body,method)=>{const response=await fetch(`${base}/api${path}`,{method:method||(body===undefined?'GET':'POST'),headers:{'X-Workspace':'personal','X-Local-Token':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const out=await response.json();if(!response.ok)throw new Error(out.error||`HTTP ${response.status}`);return out;};
token=(await call('/bootstrap')).token;
const application=await call('/applications',{company:'星河网络',role:'前端开发实习生',city:'武汉',description:'参与教育类 SaaS 前端开发，使用 React 与 TypeScript，每周到岗 4 天，实习 3 个月。'});
const resume=await call('/resumes',{name:'对比用简历',content:'# 个人简历\n\n## 项目经历\n校园二手交易平台：React + TypeScript，负责列表与详情页。\n\n## 技能\nJavaScript、React、Git。'});
const scenarios=[
 {name:'事实注入',memories:[{type:'core',content:'求职方向：武汉的前端开发实习，主打 React 与 TypeScript',keywords:['武汉','React']},{type:'preference',content:'期望日薪 200–300 元，每周到岗 4 天'}],include:['武汉','React'],avoid:[]},
 {name:'否定约束',memories:[{type:'negative',content:'简历自评避免使用“精通”一词，用“熟悉/掌握”代替'}],include:[],avoid:['精通']},
 {name:'时序新旧',memories:[{type:'core',content:'主投城市：北京',keywords:['北京'],createdAt:new Date(Date.now()-30*86400000).toISOString(),confirmedAt:new Date(Date.now()-30*86400000).toISOString()},{type:'core',content:'主投城市：武汉（最新决定）',keywords:['武汉'],createdAt:new Date().toISOString(),confirmedAt:new Date().toISOString()}],include:['武汉'],avoid:['北京']},
];
async function clearMemories(){const {memories}=await call('/memories');for(const m of memories)await call(`/memories/${m.id}`,undefined,'DELETE');}
async function addMemories(list){for(const {createdAt,confirmedAt,...rest} of list){const created=await call('/memories',rest);store('personal').put('memories',{...created,createdAt:createdAt||created.createdAt,confirmedAt:confirmedAt||created.confirmedAt});}}
async function improveOnce(){const out=await call(`/resumes/${resume.id}/improve`,{applicationId:application.id});if(!out.ai)throw new Error('模型未配置，请检查 .env 后使用 --real');return out.content;}
const count=(text,terms)=>terms.map(t=>({term:t,hits:text.split(t).length-1}));
const rows=[],collected=[];
console.log(`模式：${real?'真实百炼调用':'离线回显（仅验证链路）'}；每条件重复 ${reps} 次；数据库：${testDir}`);
for(const scene of scenarios){
  if(only&&scene.name!==only)continue;
  const record={name:scene.name,conditions:{}};
  for(const condition of ['无记忆','有记忆']){
    await clearMemories();
    if(condition==='有记忆')await addMemories(scene.memories);
    const runs=[];
    for(let i=0;i<reps;i++){const text=await improveOnce();runs.push({include:count(text,scene.include),avoid:count(text,scene.avoid),chars:text.length,text});}
    record.conditions[condition]={runs};collected.push({scenario:scene.name,condition,outputs:runs.map(r=>r.text)});
    const hitAvg=(scene.include.length?scene.include.map(t=>runs.reduce((a,r)=>a+r.include.find(x=>x.term===t).hits,0)/reps):[]).map(v=>v.toFixed(1)).join('/');
    const avoidTotal=scene.avoid.length?runs.reduce((a,r)=>a+r.avoid.reduce((s,x)=>s+x.hits,0),0):0;
    rows.push(`| ${scene.name} | ${condition} | 命中均值（${scene.include.join('、')||'—'}）：${hitAvg||'—'} | 违禁词出现总次数（${scene.avoid.join('、')||'—'}）：${avoidTotal} | 平均长度：${Math.round(runs.reduce((a,r)=>a+r.chars,0)/reps)} 字 |`);
  }
}
await clearMemories();
server.close();rmSync(testDir,{recursive:true,force:true});
mkdirSync('artifacts',{recursive:true});
const report=`# 记忆前后对比报告

- 时间：${new Date().toISOString()}；模式：${real?'真实百炼调用':'离线回显（仅验证链路，不代表质量差异）'}；每条件重复 ${reps} 次
- 判读：事实注入/时序场景看"命中均值"（有记忆应显著更高，时序场景含"北京"越少越好）；否定约束看"违禁词总次数"（有记忆应为 0，无记忆可作为基线）
- Token 用量：本次脚本未直接采集，真实模式的调用可在 Langfuse 控制台按 trace 名 \`resume-improve\` 与 metadata.memoryVersion 区分两条件查看

| 场景 | 条件 | 事实命中 | 违禁词 | 长度 |
|---|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(resolve('artifacts/memory-compare-report.md'),report);
writeFileSync(resolve('artifacts/memory-compare-report.json'),JSON.stringify({real,reps,generatedAt:new Date().toISOString(),outputs:collected},null,2));
console.log(report);
console.log('报告已写入 artifacts/memory-compare-report.md');
