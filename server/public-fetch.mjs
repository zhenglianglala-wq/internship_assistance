import {lookup} from 'node:dns/promises';
import {Agent,fetch} from 'undici';
import ipaddr from 'ipaddr.js';

export const publicFetchServices={lookup,fetch};
export function publicUrl(value){
  const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))invalid('采集来源需使用不含账号信息的公开 HTTPS 地址');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(host==='localhost'||/\.(?:localhost|local|internal|test|invalid)$/i.test(host)||!host.includes('.'))invalid('不能采集本机或内网地址');
  if(ipaddr.isValid(host)&&ipaddr.process(host).range()!=='unicast')invalid('不能采集本机或内网地址');
  url.hash='';return url;
}
export async function publicText(value,{maxBytes=12*1024*1024,timeout=20000}={}){
  let url=publicUrl(value);
  for(let redirect=0;redirect<5;redirect++){
    const addresses=await publicFetchServices.lookup(url.hostname,{all:true});
    if(!addresses.length||addresses.some(a=>!ipaddr.isValid(a.address)||ipaddr.process(a.address).range()!=='unicast'))throw new Error('来源解析到非公开网络，已停止采集');
    const pinned=addresses.find(a=>a.family===4)||addresses[0];
    const agent=new Agent({autoSelectFamily:true,autoSelectFamilyAttemptTimeout:500,connect:{lookup:(host,options,callback)=>options.all?callback(null,addresses):callback(null,pinned.address,pinned.family)}});
    try{
      const response=await publicFetchServices.fetch(url,{dispatcher:agent,redirect:'manual',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'InternshipStudio/0.2 (personal job reader)','Accept':'application/json,text/html,text/plain;q=0.9'}});
      if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('来源重定向无目标');url=publicUrl(new URL(location,url).href);continue;}
      if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw new Error('来源响应过大，请改用更具体的岗位页面');}
      let size=0;const parts=[];
      if(response.body)for await(const chunk of response.body){size+=chunk.byteLength;if(size>maxBytes){throw new Error('来源响应过大，请改用更具体的岗位页面');}parts.push(Buffer.from(chunk));}
      return {status:response.status,ok:response.ok,url:url.href,contentType:response.headers.get('content-type')||'',text:Buffer.concat(parts).toString('utf8')};
    }finally{await agent.destroy();}
  }
  throw new Error('来源重定向次数过多');
}
