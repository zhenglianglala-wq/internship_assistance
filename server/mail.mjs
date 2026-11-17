import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { dataDir } from './store.mjs';
import { APP_NAME } from './brand.mjs';

const keyPath=resolve(dataDir,'vault.key');
if(!existsSync(keyPath)) writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});
const key=readFileSync(keyPath);
export function encrypt(value) {const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.');}
export function decrypt(value) {const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'));const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString());}
export const providers={
  qq:{label:'QQ 邮箱',imapHost:'imap.qq.com',imapPort:993,smtpHost:'smtp.qq.com',smtpPort:465},
  '163':{label:'163 邮箱',imapHost:'imap.163.com',imapPort:993,smtpHost:'smtp.163.com',smtpPort:465},
  gmail:{label:'Gmail',imapHost:'imap.gmail.com',imapPort:993,smtpHost:'smtp.gmail.com',smtpPort:465},
  outlook:{label:'Outlook',imapHost:'outlook.office365.com',imapPort:993,smtpHost:'smtp.office365.com',smtpPort:587},
  school:{label:'学校 / 自定义邮箱',imapHost:'',imapPort:993,smtpHost:'',smtpPort:465},
};
export async function accountAuth(account,s) {
  const secret=decrypt(account.secret);
  if(secret.refreshToken && (!secret.expiresAt || secret.expiresAt<Date.now()+60000)) {
    const google=account.provider==='gmail';
    const params=new URLSearchParams({client_id:process.env[google?'GOOGLE_CLIENT_ID':'MICROSOFT_CLIENT_ID']||'',client_secret:process.env[google?'GOOGLE_CLIENT_SECRET':'MICROSOFT_CLIENT_SECRET']||'',grant_type:'refresh_token',refresh_token:secret.refreshToken});
    const response=await fetch(google?'https://oauth2.googleapis.com/token':'https://login.microsoftonline.com/common/oauth2/v2.0/token',{method:'POST',body:params,signal:AbortSignal.timeout(15000)});
    const tokens=await response.json(); if(!response.ok) throw new Error('邮箱授权已过期，请重新授权');
    secret.accessToken=tokens.access_token;secret.refreshToken=tokens.refresh_token||secret.refreshToken;secret.expiresAt=Date.now()+tokens.expires_in*1000;
    const fresh=s.get('accounts',account.id);if(fresh)fresh.secret=encrypt(secret),s.put('accounts',fresh);
  }
  return secret.accessToken ? {user:account.email,accessToken:secret.accessToken} : {user:account.email,pass:secret.password};
}
export async function imap(account,s) {return new ImapFlow({host:account.imapHost,port:account.imapPort,secure:true,auth:await accountAuth(account,s),logger:false,connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000,disableAutoIdle:true,clientInfo:{name:APP_NAME,version:'0.1.0'}});}
export async function transport(account,s) {const auth=await accountAuth(account,s); return nodemailer.createTransport({host:account.smtpHost,port:account.smtpPort,secure:account.smtpPort===465,requireTLS:account.smtpPort!==465,auth:auth.accessToken?{type:'OAuth2',user:account.email,accessToken:auth.accessToken}:auth,logger:false,connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});}
export function classify(text) {
  if(/未能通过|不予录用|遗憾|not moving forward|unfortunately/i.test(text)) return '未通过';
  if(/offer|录用通知|录取通知/i.test(text)) return 'Offer';
  if(/HR\s*面|人事面/.test(text)) return 'HR 面';
  if(/二面|第二轮|second.round/i.test(text)) return '二面';
  if(/一面|第一轮|first.round/i.test(text)) return '一面';
  if(/笔试|在线测评|assessment/i.test(text)) return '笔试';
  if(/初筛|简历通过|screening/i.test(text)) return '初筛';
  return null;
}
export function matchApplication(message,applications) {
  const text=`${message.subject}\n${message.body}`;
  const byAddress=applications.filter(a=>a.contactEmail && a.contactEmail.toLowerCase()===message.from.toLowerCase());
  if(byAddress.length===1) return byAddress[0].id;
  const candidates=applications.filter(a=>text.includes(a.company));
  if(candidates.length===1) return candidates[0].id;
  const byRole=candidates.filter(a=>text.includes(a.role));
  return byRole.length===1 ? byRole[0].id : null;
}
