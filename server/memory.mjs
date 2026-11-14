import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const now=()=>new Date().toISOString();
export const memoryTypes=['core','preference','episode','negative'];
export const memoryLabels={core:'核心',preference:'偏好',episode:'事件',negative:'回避'};
const LIMITS={core:20,preference:20,negative:20,episode:100};
const text=z.string().trim().min(1).max(300);
const memoryInput=z.object({type:z.enum(memoryTypes),content:text,keywords:z.array(z.string().trim().min(1).max(50)).max(10).default([]),tags:z.array(z.string().trim().min(1).max(30)).max(6).default([])});
export function memorySnapshot(s){return s.all('memories').sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export function activeMemories(s){return memorySnapshot(s).filter(m=>m.status==='confirmed');}
// 把已确认记忆拼成注入 AI 的文本块；episode 按岗位关键词匹配（子串，双向），最多 5 条；core/preference/negative 全量。
export function buildMemoryBlock(s,{role=''}={}){
  const all=activeMemories(s),by=t=>all.filter(m=>m.type===t);
  const line=t=>by(t).map(m=>`- ${memoryLabels[t]}：${m.content}${m.keywords?.length?`（关键词：${m.keywords.join('、')}）`:''}`);
  const kw=role.toLowerCase();
  const episodes=kw?by('episode').filter(m=>{const hay=[m.content,...(m.keywords||[]),...(m.tags||[])].join(' ').toLowerCase();return hay.includes(kw)||[...(m.keywords||[])].some(k=>kw.includes(k.toLowerCase()))}).slice(0,5):[];
  const groups=[...line('core'),...line('preference'),...line('negative'),...episodes.map(m=>`- 近事：${m.content}`)];
  if(!groups.length)return {text:'',count:0,version:''};
  const latest=all.reduce((a,m)=>m.confirmedAt>a?m.confirmedAt:a,'');
  const text=`【关于用户的长期记忆（均经本人确认，未提及的内容不要编造）】\n${groups.join('\n')}\n【记忆结束。用户询问记忆中没有的信息时，明确说明“暂无记录”，不要编造；其他信息与记忆冲突时以记忆为准。】`;
  return {text,count:all.length,version:`v${all.length}:${latest}`};
}
export function attachMemoryRoutes(app){
  const real=req=>{if(req.workspace==='demo')throw fail('示例空间不保存记忆，请切换到「我的空间」')};
  app.get('/api/memories',(req,res)=>res.json({memories:memorySnapshot(req.db)}));
  app.post('/api/memories',(req,res,next)=>{try{real(req);const input=memoryInput.parse(req.body);const count=req.db.all('memories').filter(m=>m.type===input.type&&m.status!=='retired').length;if(count>=LIMITS[input.type])throw fail(`${memoryLabels[input.type]}类记忆已达上限 ${LIMITS[input.type]} 条，请先清理过时或退役的记忆`,409);const record=req.db.put('memories',{...input,id:randomUUID(),links:[],status:'confirmed',source:'manual',supersededBy:null,createdAt:now(),confirmedAt:now()});res.status(201).json(record)}catch(e){next(e)}});
  app.patch('/api/memories/:id',(req,res,next)=>{try{real(req);const m=req.db.get('memories',req.params.id);if(!m)throw fail('记忆不存在',404);const update=z.object({content:text.optional(),keywords:z.array(z.string().trim().min(1).max(50)).max(10).optional(),tags:z.array(z.string().trim().min(1).max(30)).max(6).optional(),status:z.enum(['confirmed','retired']).optional()}).parse(req.body);const record=req.db.put('memories',{...m,...update,...(update.status==='confirmed'?{confirmedAt:now()}:{})});res.json(record)}catch(e){next(e)}});
  app.delete('/api/memories/:id',(req,res,next)=>{try{real(req);if(!req.db.get('memories',req.params.id))throw fail('记忆不存在',404);req.db.remove('memories',req.params.id);res.json({ok:true})}catch(e){next(e)}});
}
