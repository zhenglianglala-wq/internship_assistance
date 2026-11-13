import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm,stat,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dataDir} from './store.mjs';
const exec=promisify(execFile),source=fileURLToPath(new URL('./ocr.swift',import.meta.url));
let compiling=null,busy=false;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function imageType(buffer){
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';
  return null;
}
async function executable(){
  const folder=resolve(dataDir,'runtime'),binary=join(folder,'mobile-ocr');
  const [src,out]=await Promise.all([stat(source),stat(binary).catch(()=>null)]);
  if(out&&out.mtimeMs>=src.mtimeMs)return binary;
  if(!compiling)compiling=(async()=>{await mkdir(folder,{recursive:true,mode:0o700});await exec('/usr/bin/swiftc',['-module-cache-path',join(folder,'swift-cache'),source,'-o',binary],{timeout:120000,maxBuffer:1024*1024});return binary})().finally(()=>{compiling=null});
  return compiling;
}
export async function recognizeImage(buffer){
  if(process.platform!=='darwin')throw fail('截图识别需要 macOS Vision；可先使用手机提取文字后粘贴导入');
  if(!buffer?.length||buffer.length>8*1024*1024||!imageType(buffer))throw fail('请选择 8MB 以内的 PNG 或 JPEG 岗位截图');
  if(busy)throw fail('正在识别另一张截图，请稍后重试',429);
  busy=true;let folder;
  try{const binary=await executable();folder=await mkdtemp(join(dataDir,'ocr-'));const path=join(folder,`image.${imageType(buffer)}`);await writeFile(path,buffer,{mode:0o600});const {stdout}=await exec(binary,[path],{timeout:45000,maxBuffer:256000});if(!stdout.trim())throw fail('截图中没有识别到文字，请裁剪到岗位详情后重试');return stdout.trim().slice(0,30000)}
  catch(error){if(error.status)throw error;throw fail('本机截图识别失败，请使用清晰的 PNG / JPEG，或从手机复制文字导入',422)}
  finally{if(folder)await rm(folder,{recursive:true,force:true});busy=false;}
}
