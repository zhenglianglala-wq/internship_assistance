import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';

const testDir=mkdtempSync(join(tmpdir(),'internship-obs-'));
process.env.NODE_ENV='test';process.env.DATA_DIR=testDir;
process.env.AI_PROVIDER='compatible';process.env.AI_BASE_URL='https://model.example.com/v1';process.env.AI_API_KEY='TEST-ONLY-KEY';process.env.AI_MODEL='test-model';
delete process.env.LANGFUSE_PUBLIC_KEY;delete process.env.LANGFUSE_SECRET_KEY;delete process.env.LANGFUSE_HOST;
const {aiServices,generateText,observability,flushObservability}=await import('../server/ai.mjs');
after(async()=>{rmSync(testDir,{recursive:true,force:true});});
const modelOk=usage=>async()=>({ok:true,status:200,json:async()=>({choices:[{message:{content:'连接成功'}}],usage})});

test('未配置 Langfuse 时完全关闭，不创建客户端',async()=>{aiServices.fetch=modelOk(undefined);const result=await generateText([{role:'user',content:'hi'}],{maxTokens:8});assert.equal(result,'连接成功');assert.equal(observability.client,null);});

test('注入假客户端时记录名称、输入输出与用量',async()=>{const events=[];observability.client={trace:e=>{events.push(['trace',e]);return {generation:g=>events.push(['generation',g])};},flushAsync:async()=>{}};try{aiServices.fetch=modelOk({prompt_tokens:11,completion_tokens:7,total_tokens:18});const result=await generateText([{role:'user',content:'岗位描述'}],{maxTokens:64,name:'resume-improve',workspace:'personal'});assert.equal(result,'连接成功');await flushObservability();const trace=events.find(([k])=>k==='trace')[1],gen=events.find(([k])=>k==='generation')[1];assert.equal(trace.name,'resume-improve');assert.deepEqual(trace.metadata,{provider:'compatible',model:'test-model',workspace:'personal',maxTokens:64});assert.equal(trace.input[0].content,'岗位描述');assert.equal(gen.name,'chat-completions');assert.equal(gen.model,'test-model');assert.equal(gen.output,'连接成功');assert.deepEqual(gen.usage,{input:11,output:7,total:18,unit:'TOKENS'});}finally{observability.client=null;}});

test('观测上报抛错不影响模型返回',async()=>{observability.client={trace:()=>{throw new Error('上报失败');},flushAsync:async()=>{}};try{aiServices.fetch=modelOk({prompt_tokens:1});const result=await generateText([{role:'user',content:'hi'}]);assert.equal(result,'连接成功');}finally{observability.client=null;}});

test('真实 SDK 走本地捕获服务完成端到端上报',async()=>{
  const received=[];
  const server=createServer((req,res)=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{received.push({url:req.url,auth:req.headers.authorization,body:JSON.parse(d||'{}')});res.setHeader('content-type','application/json');res.end(JSON.stringify({accepts:[true]}));});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  process.env.LANGFUSE_PUBLIC_KEY='pk-local-test';process.env.LANGFUSE_SECRET_KEY='sk-local-test';process.env.LANGFUSE_HOST=`http://127.0.0.1:${port}`;
  observability.client=undefined;
  try{
    aiServices.fetch=modelOk({prompt_tokens:11,completion_tokens:7,total_tokens:18});
    const result=await generateText([{role:'user',content:'分享文字'}],{maxTokens:1800,name:'mobile-structure',workspace:'personal'});
    assert.equal(result,'连接成功');
    await flushObservability();await new Promise(r=>setTimeout(r,300));
    assert.ok(received.length>=1,'应至少收到一次上报');
    assert.equal(received[0].auth,'Basic '+Buffer.from('pk-local-test:sk-local-test').toString('base64'));
    const batch=received.flatMap(r=>r.body.batch||[]);
    const trace=batch.find(e=>e.type==='trace-create'),gen=batch.find(e=>e.type==='generation-create');
    assert.ok(trace&&gen,'batch 应包含 trace-create 与 generation-create');
    assert.equal(trace.body.name,'mobile-structure');
    assert.equal(gen.body.name,'chat-completions');
    assert.equal(gen.body.model,'test-model');
    assert.equal(gen.body.usage.input,11);assert.equal(gen.body.usage.total,18);assert.equal(gen.body.usage.unit,'TOKENS');
  }finally{observability.client=null;delete process.env.LANGFUSE_PUBLIC_KEY;delete process.env.LANGFUSE_SECRET_KEY;delete process.env.LANGFUSE_HOST;await new Promise(r=>server.close(r));}
});

test('LANGFUSE_BASE_URL 作为兼容键名同样生效',async()=>{process.env.LANGFUSE_PUBLIC_KEY='pk-local-test';process.env.LANGFUSE_SECRET_KEY='sk-local-test';process.env.LANGFUSE_BASE_URL='http://127.0.0.1:59999';observability.client=undefined;try{aiServices.fetch=modelOk({prompt_tokens:1,completion_tokens:1,total_tokens:2});const result=await generateText([{role:'user',content:'hi'}]);assert.equal(result,'连接成功');assert.ok(observability.client,'应按 LANGFUSE_BASE_URL 创建客户端');await flushObservability();}finally{observability.client=null;delete process.env.LANGFUSE_PUBLIC_KEY;delete process.env.LANGFUSE_SECRET_KEY;delete process.env.LANGFUSE_BASE_URL;}});
