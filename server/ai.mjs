import './env.mjs';
import {z} from 'zod';
import {store} from './store.mjs';
import {Langfuse} from 'langfuse';
export const aiServices={fetch:(...args)=>fetch(...args)};
// 可选观测：配置 LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY 后，每次模型调用把 prompt/响应与 token 用量上报到 LANGFUSE_HOST（云版为第三方服务，注意简历正文会随之上传）。留空则完全关闭。
export const observability={client:undefined};// undefined=按环境自动创建；测试可注入假客户端。
function langfuseClient(){
  if(observability.client!==undefined)return observability.client;
  observability.client=null;
  const {LANGFUSE_PUBLIC_KEY,LANGFUSE_SECRET_KEY}=process.env;
  if(LANGFUSE_PUBLIC_KEY&&LANGFUSE_SECRET_KEY){try{observability.client=new Langfuse({publicKey:LANGFUSE_PUBLIC_KEY,secretKey:LANGFUSE_SECRET_KEY,baseUrl:(process.env.LANGFUSE_HOST||process.env.LANGFUSE_BASE_URL||'https://cloud.langfuse.com').replace(/\/+$/,''),flushAt:1,flushInterval:200,requestTimeout:8000});}catch{observability.client=null;}}
  return observability.client;
}
export async function flushObservability(){const client=langfuseClient();if(client)await client.flushAsync().catch(()=>{});}
export const bailianRegions=[
  {id:'beijing',label:'中国内地（北京）',url:'https://dashscope.aliyuncs.com/compatible-mode/v1'},
  {id:'singapore',label:'新加坡',url:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'},
  {id:'us',label:'美国（弗吉尼亚）',url:'https://dashscope-us.aliyuncs.com/compatible-mode/v1'},
];
export function aiConfig(){const saved=store('personal').get('modelSettings','bailian')||{};return {provider:saved.provider||process.env.AI_PROVIDER||'compatible',baseUrl:saved.baseUrl||process.env.AI_BASE_URL||'',model:saved.model||process.env.AI_MODEL||'',key:process.env.AI_API_KEY||'',lastTest:saved.lastTest||null};}
export function aiStatus(){const {key,...value}=aiConfig();return {...value,hasKey:!!key,configured:!!(key&&value.baseUrl&&value.model),regions:bailianRegions};}
export function validateBailianUrl(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||!/^\/(compatible-mode\/v1|v1)\/?$/.test(url.pathname)||!(/^(dashscope(?:-intl|-us)?\.aliyuncs\.com|[a-zA-Z0-9-]+\.(?:cn-beijing|us-east-1|ap-southeast-1|ap-northeast-1|eu-central-1|cn-hongkong)\.maas\.aliyuncs\.com)$/.test(url.hostname)))throw Object.assign(new Error('百炼密钥只能发送到官方百炼 API 地址，请复制控制台提供的 Base URL'),{status:400});return url.href.replace(/\/$/,'');}
export async function generateText(messages,{maxTokens=2048,name='ai-call',workspace=''}={}){
  const started=new Date();
  const config=aiConfig();if(!config.key||!config.baseUrl||!config.model)throw Object.assign(new Error('请先配置模型地址、模型名称和本地密钥'),{status:400});
  let base;try{base=config.provider==='bailian'?validateBailianUrl(config.baseUrl):new URL(config.baseUrl).href.replace(/\/$/,'');}catch(error){if(error.status)throw error;throw Object.assign(new Error('模型服务地址不正确'),{status:400});}
  let response;try{response=await aiServices.fetch(`${base}/chat/completions`,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,messages,max_tokens:maxTokens,...(config.provider==='bailian'?{enable_thinking:false}:{})}),signal:AbortSignal.timeout(60000)});}catch{throw Object.assign(new Error('模型服务连接超时或网络不可用，请检查服务地域与网络'),{status:502});}
  if(!response.ok){const message=response.status===401?'百炼密钥无效、已失效或与服务地域不匹配':response.status===403?'当前密钥没有调用此模型的权限，请检查业务空间授权':response.status===404?'模型或服务地址不存在，请核对控制台 Base URL 与模型名称':response.status===429?'模型额度不足或请求过于频繁，请稍后重试':`模型服务调用失败（HTTP ${response.status}）`;throw Object.assign(new Error(message),{status:502});}
  let data;try{data=await response.json()}catch{throw Object.assign(new Error('模型服务未返回有效数据'),{status:502});}const content=data.choices?.[0]?.message?.content;if(typeof content!=='string'||!content.trim())throw Object.assign(new Error('模型未返回有效文本'),{status:502});
  try{const client=langfuseClient();if(client){const usage=data.usage||{},trace=client.trace({name,input:messages,metadata:{provider:config.provider,model:config.model,workspace,maxTokens}});trace.generation({name:'chat-completions',model:config.model,input:messages,output:content,startTime:started,endTime:new Date(),usage:{input:usage.prompt_tokens||0,output:usage.completion_tokens||0,total:usage.total_tokens||((usage.prompt_tokens||0)+(usage.completion_tokens||0)),unit:'TOKENS'},metadata:{apiHost:new URL(base).host}});}}catch{/*观测上报失败绝不影响模型结果*/}
  return content;
}
export function attachAiRoutes(app){
  app.get('/api/model',(req,res)=>res.json(aiStatus()));
  app.put('/api/model',(req,res,next)=>{try{if(req.workspace==='demo')throw Object.assign(new Error('模型设置请在「我的空间」修改'),{status:400});const input=z.object({baseUrl:z.string().max(2000),model:z.string().regex(/^[a-zA-Z0-9_.-]{1,100}$/)}).parse(req.body);store('personal').put('modelSettings',{id:'bailian',provider:'bailian',baseUrl:validateBailianUrl(input.baseUrl),model:input.model,lastTest:null});res.json(aiStatus());}catch(error){next(error)}});
  app.post('/api/model/test',async(req,res,next)=>{try{if(req.workspace==='demo')throw Object.assign(new Error('真实模型测试请切换到「我的空间」'),{status:400});const original=aiConfig();await generateText([{role:'user',content:'请只回复“连接成功”。'}],{maxTokens:16,name:'model-test',workspace:req.workspace});const config=aiConfig();if(config.baseUrl!==original.baseUrl||config.model!==original.model)throw Object.assign(new Error('测试期间模型设置已变化，请重新测试'),{status:409});store('personal').put('modelSettings',{id:'bailian',provider:config.provider,baseUrl:config.baseUrl,model:config.model,lastTest:new Date().toISOString()});res.json({ok:true,...aiStatus()});}catch(error){next(error)}});
}
