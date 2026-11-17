import {randomUUID} from 'node:crypto';
import {extraRecruitmentCatalog} from './recruitment-catalog.mjs';
import {z} from 'zod';
import {publicText,publicUrl} from './public-fetch.mjs';
const day=86400000,active=new WeakMap();
const entries=[
 ['boss','BOSS直聘','招聘平台','https://www.zhipin.com/','https://www.zhipin.com/web/geek/resume','blue','进入「简历」管理在线简历与附件。'],
 ['shixiseng','实习僧','招聘平台','https://www.shixiseng.com/','https://www.shixiseng.com/','green','登录学生账号后，在个人简历中导入或填写。'],
 ['liepin','猎聘','招聘平台','https://www.liepin.com/','https://www.liepin.com/','orange','登录求职账号，进入个人简历页面。'],
 ['tencent-campus','腾讯校园招聘','公司官网','https://join.qq.com/','https://join.qq.com/','blue','选择实习或校招岗位，按官网表单填写和上传附件。'],
 ['tencent','腾讯招聘','公司官网','https://careers.tencent.com/','https://careers.tencent.com/','purple','进入个人中心维护简历，再选择目标岗位。'],
 ['bytedance','字节跳动招聘','公司官网','https://jobs.bytedance.com/','https://jobs.bytedance.com/','rose','选择校招或实习入口，登录后完善个人简历。'],
 ['alibaba','阿里巴巴招聘','公司官网','https://talent.alibaba.com/','https://talent.alibaba.com/','orange','选择招聘类别，登录官网后维护个人简历。'],
 ['netease','网易招聘','公司官网','https://hr.163.com/','https://hr.163.com/','green','选择校园招聘或实习项目，进入个人中心填写。'],
].map(([id,name,category,url,resumeUrl,color,instructions])=>({id,name,category,url,resumeUrl,color,instructions,referenceUrl:url}));
entries.push(...extraRecruitmentCatalog);
export const recruitmentServices={text:publicText};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function recruitmentSnapshot(s){const settings=s.get('meta','recruitment-settings')||{intervalDays:7,autoCheck:true};return {settings:{intervalDays:settings.intervalDays,autoCheck:settings.autoCheck},checking:active.has(s),portals:[...entries,...s.all('recruitmentPortals').filter(p=>p.userAdded&&!entries.some(e=>e.id===p.id))].map(e=>{const p=s.get('recruitmentPortals',e.id);return {selected:e.selected!==false,...e,...p,nextCheckAt:p?.lastCheckedAt?new Date(Date.parse(p.lastCheckedAt)+settings.intervalDays*day).toISOString():null}}),transfers:s.all('resumeTransfers')};}
export function checkRecruitment(s,{force=false}={}){
 if(active.has(s))return;const snapshot=recruitmentSnapshot(s),due=snapshot.portals.filter(p=>p.selected&&(force||!p.lastCheckedAt||Date.now()-Date.parse(p.lastCheckedAt)>=snapshot.settings.intervalDays*day));if(!due.length)return;
 const promise=(async()=>{let index=0;async function run(){while(index<due.length){const p=due[index++],checked=new Date().toISOString();let update;
  try{const result=await recruitmentServices.text(p.url,{maxBytes:2*1024*1024,timeout:8000});const final=publicUrl(result.url);final.pathname=final.pathname.replace(/;jsessionid=[^/;?]*/ig,'');for(const key of [...final.searchParams.keys()])if(/^(?:utm_|session|token|securityId|code$)/i.test(key))final.searchParams.delete(key);const old=publicUrl(p.url),known=entries.find(e=>e.id===p.id);const allowed=new Set([old.hostname,new URL(known?.url||p.referenceUrl||p.url).hostname]);const title=result.text.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim().slice(0,160)||'';
   if(!allowed.has(final.hostname))update={status:'changed',pendingUrl:final.href,message:'发现跨域跳转，请核对后更新地址。原入口已保留。'};
   else if(!result.ok)update={status:[401,403,429].includes(result.status)?'restricted':'unavailable',message:`HTTP ${result.status}；请在浏览器核对，原地址已保留。`};
   else if(/captcha|access denied|安全验证|访问验证|人机验证/i.test(title))update={status:'restricted',message:'网站要求浏览器验证，原地址已保留。'};
   else{const changed=final.href!==p.url;update={status:'reachable',url:final.href,resumeUrl:changed?final.href:p.resumeUrl,lastSuccessAt:checked,pendingUrl:null,message:changed?'已跟随同域服务器跳转更新入口。':'公开入口可访问；具体上传流程以官网为准。',title,history:changed?[...(p.history||[]),{from:p.url,to:final.href,at:checked}].slice(-10):p.history||[]}}
  }catch{update={status:'unavailable',message:'本次网络检查未成功，原地址已保留，请在浏览器核对。'}}
  const latest=s.get('recruitmentPortals',p.id);if(!latest||latest.url===p.url)s.put('recruitmentPortals',{...p,...latest,...update,lastCheckedAt:checked,id:p.id});
 }}await Promise.all([run(),run()]);})();active.set(s,promise);void promise.finally(()=>active.delete(s));
}
export function attachRecruitment(app){
 const real=req=>{if(req.workspace==='demo')throw fail('请在「我的空间」管理真实招聘入口和迁移记录')};
 app.get('/api/recruitment',(req,res)=>res.json(recruitmentSnapshot(req.db)));
 app.post('/api/recruitment/check',(req,res,next)=>{try{real(req);const {force}=z.object({force:z.boolean().default(false)}).parse(req.body);checkRecruitment(req.db,{force});res.status(202).json(recruitmentSnapshot(req.db))}catch(e){next(e)}});
 app.patch('/api/recruitment/settings',(req,res,next)=>{try{real(req);const value=z.object({intervalDays:z.union([z.literal(1),z.literal(7),z.literal(30)]),autoCheck:z.boolean()}).parse(req.body);req.db.put('meta',{id:'recruitment-settings',...value});res.json(recruitmentSnapshot(req.db))}catch(e){next(e)}});
 app.post('/api/recruitment',(req,res,next)=>{try{real(req);const input=z.object({name:z.string().trim().min(1).max(100),url:z.string().max(2000),category:z.enum(['公司官网','招聘平台']).default('公司官网'),instructions:z.string().trim().max(500).default('登录招聘网站，选择目标岗位并维护个人简历。')}).parse(req.body),url=publicUrl(input.url).href;const all=recruitmentSnapshot(req.db).portals;if(all.some(p=>p.url===url))throw fail('这个入口已经在目录中，请搜索后加入我的入口',409);req.db.put('recruitmentPortals',{...input,id:'custom-'+randomUUID(),url,resumeUrl:url,referenceUrl:url,color:'purple',userAdded:true,selected:true,status:'unknown',createdAt:new Date().toISOString()});res.status(201).json(recruitmentSnapshot(req.db))}catch(e){next(e)}});
 app.patch('/api/recruitment/:id',(req,res,next)=>{try{real(req);const p=recruitmentSnapshot(req.db).portals.find(p=>p.id===req.params.id);if(!p)throw fail('入口不存在',404);const update=z.object({url:z.string().max(2000).optional(),selected:z.boolean().optional(),name:z.string().trim().min(1).max(100).optional(),instructions:z.string().trim().max(500).optional()}).parse(req.body);let value={...p,...update};if(update.url&&update.url!==p.url){const nextUrl=publicUrl(update.url).href;value={...value,url:nextUrl,resumeUrl:nextUrl,status:'unknown',lastCheckedAt:null,lastSuccessAt:null,pendingUrl:null,customized:true,message:'你更新了地址，请重新检查。',history:[...(p.history||[]),{from:p.url,to:nextUrl,at:new Date().toISOString(),source:'user'}].slice(-10)}}req.db.put('recruitmentPortals',value);res.json(recruitmentSnapshot(req.db))}catch(e){next(e)}});
 app.post('/api/resume-transfers',(req,res,next)=>{try{real(req);const {resumeId,portalId}=z.object({resumeId:z.string(),portalId:z.string()}).parse(req.body),resume=req.db.get('resumes',resumeId),portal=recruitmentSnapshot(req.db).portals.find(p=>p.id===portalId);if(!resume||!portal)throw fail('请选择已有简历和招聘入口');const previous=req.db.all('resumeTransfers').find(t=>t.resumeId===resumeId&&t.portalId===portalId&&t.status==='prepared');const transfer=previous||req.db.put('resumeTransfers',{resumeId,portalId,resumeName:resume.name,version:resume.version,portalName:portal.name,url:portal.resumeUrl,status:'prepared',createdAt:new Date().toISOString()});res.status(previous?200:201).json(transfer)}catch(e){next(e)}});
 app.delete('/api/resume-transfers/:id',(req,res,next)=>{try{real(req);const t=req.db.get('resumeTransfers',req.params.id);if(!t)throw fail('迁移记录不存在',404);if(t.status!=='prepared')throw fail('只有准备中的迁移记录可以丢弃；已确认的记录保留审计',409);req.db.remove('resumeTransfers',t.id);res.json({ok:true})}catch(e){next(e)}});
  app.post('/api/resume-transfers/:id/confirm',(req,res,next)=>{try{real(req);z.object({confirmed:z.literal(true)}).parse(req.body);const t=req.db.get('resumeTransfers',req.params.id);if(!t)throw fail('迁移准备记录不存在',404);res.json(req.db.put('resumeTransfers',{...t,status:'user_confirmed',confirmedAt:t.confirmedAt||new Date().toISOString()}))}catch(e){next(e)}});
}
