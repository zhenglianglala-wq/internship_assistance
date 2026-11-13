import {Worker} from 'node:worker_threads';
import {writeFileSync,readFileSync} from 'node:fs';
import {basename,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import {dataDir} from './store.mjs';
import {resumeFont} from './resume-fonts.mjs';
import {builderPdf} from './resume-layouts.mjs';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const safe=r=>{const {filePath,...value}=r;return value};
function validDocx(buffer){
 // Bound expanded ZIP sizes before allowing the DOCX parser to decompress anything.
 let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break}
 if(end<0)throw fail('DOCX 文件格式不正确');const count=buffer.readUInt16LE(end+10);let at=buffer.readUInt32LE(end+16),size=0;const names=new Set();if(count>512)throw fail('DOCX 内容过多，请精简后上传');
 for(let i=0;i<count;i++){if(at+46>buffer.length||buffer.readUInt32LE(at)!==0x02014b50)throw fail('DOCX 文件格式不正确');const expanded=buffer.readUInt32LE(at+24),length=buffer.readUInt16LE(at+28);size+=expanded;if(size>30*1024*1024||at+46+length>buffer.length)throw fail('DOCX 解压后过大');names.add(buffer.subarray(at+46,at+46+length).toString());at+=46+length+buffer.readUInt16LE(at+30)+buffer.readUInt16LE(at+32)}
 if(!names.has('word/document.xml')||!names.has('[Content_Types].xml'))throw fail('此文件不是有效的 Word DOCX 简历');
}
export async function extractResume(buffer,format){
 if(['txt','md'].includes(format)){let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{throw fail('文本简历请使用 UTF-8 编码')}if(content.includes('\0')||content.length>100000)throw fail('文本简历内容无效或超过10万字');return {content,extractionStatus:'ready'}}
 if(format==='docx')validDocx(buffer);
 return new Promise(resolveResult=>{
  let settled=false;const worker=new Worker(new URL('./resume-worker.mjs',import.meta.url),{workerData:{format,buffer},execArgv:[],resourceLimits:{maxOldGenerationSizeMb:160}});
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);void worker.terminate();resolveResult(value)};
  const fallback={content:'',extractionStatus:'unreadable',extractionNote:'原件已保存。此文件未能提取正文，可能为扫描件、加密文件或格式复杂，请粘贴正文后另存版本。'};
  const timer=setTimeout(()=>finish(fallback),12000);worker.once('message',result=>finish(result.error||!result.content?fallback:{content:result.content,extractionStatus:'ready',extractionNote:'正文由本机提取，请核对顺序与内容。原始文件保持不变。'}));worker.once('error',()=>finish(fallback));worker.once('exit',()=>finish(fallback));
 });
}
export async function resumePdf(resume,options={}){
 if(resume.builder)return builderPdf({...resume.builder,style:{...resume.builder.style,...options}},resume.name);
 if(!resume.content?.trim())throw fail('请先补充简历正文，再导出 PDF');
 const {path:font}=resumeFont(options.fontFamily||resume.fontFamily||'noto-sans');
 return new Promise((resolvePdf,reject)=>{
  const doc=new PDFDocument({size:'A4',margins:{top:45,bottom:45,left:48,right:48},info:{Title:resume.name,Author:''}}),parts=[];doc.on('data',p=>parts.push(p));doc.on('end',()=>resolvePdf(Buffer.concat(parts)));doc.on('error',reject);
  try{doc.font(font);for(const line of resume.content.split('\n')){const heading=line.match(/^(#{1,3})\s+(.*)/);if(!line.trim()){doc.moveDown(.45);continue}doc.fontSize(heading?(heading[1].length===1?21:13):10.5).fillColor(heading?'#354869':'#243247').text(heading?heading[2]:line,{lineGap:4,paragraphGap:heading?8:3})}doc.end()}catch(error){doc.destroy();reject(error)}
 });
}
export function attachResumeFiles(app){
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1}});
 app.post('/api/resumes/upload',upload.single('file'),async(req,res,next)=>{try{
  const file=req.file;if(!file)throw fail('请选择 PDF、DOCX、TXT 或 Markdown 文件');let originalName=file.originalname;if([...originalName].every(c=>c.charCodeAt(0)<=255)){const decoded=Buffer.from(originalName,'latin1').toString('utf8');if(!decoded.includes('�'))originalName=decoded}if(!file.size)throw fail('文件为空，请重新选择');const fileName=basename(originalName.replace(/\\/g,'/')).replace(/[\x00-\x1f\x7f]/g,'').slice(0,200),format=fileName.split('.').pop().toLowerCase();if(!['pdf','docx','txt','md'].includes(format))throw fail('仅支持 PDF、DOCX、TXT 或 Markdown 文件');if(format==='pdf'&&file.buffer.subarray(0,5).toString()!=='%PDF-')throw fail('PDF 文件格式不正确');
  const extracted=await extractResume(file.buffer,format),filePath=resolve(dataDir,`${randomUUID()}.${format}`);writeFileSync(filePath,file.buffer,{mode:0o600});const r=req.db.put('resumes',{name:fileName.replace(/\.[^.]+$/,''),fileName,filePath,fileSize:file.size,format,...extracted,note:'本地上传 · 原件保留',version:1,createdAt:new Date().toISOString()});res.status(201).json(safe(r));
 }catch(error){if(error.code==='LIMIT_FILE_SIZE')error=fail('文件超过10 MB，请压缩后重试');next(error)}});
 app.get('/api/resumes/:id/file',(req,res,next)=>{try{const r=req.db.get('resumes',req.params.id);if(!r)throw fail('简历不存在',404);if(!r.filePath||!r.fileName?.toLowerCase().endsWith('.pdf'))throw fail('此简历没有 PDF 原件',404);res.type('application/pdf').set('Content-Disposition','inline').send(readFileSync(r.filePath))}catch(e){next(e)}});
 app.get('/api/resumes/:id/export',async(req,res,next)=>{try{const r=req.db.get('resumes',req.params.id);if(!r)throw fail('简历不存在',404);const format=req.query.format;if(!['pdf','txt'].includes(format))throw fail('请选择 PDF 或 TXT 格式');if(!r.content?.trim())throw fail('请先补充正文，再导出');const body=format==='pdf'?await resumePdf(r,req.query.fontFamily?{fontFamily:String(req.query.fontFamily)}:{}):r.content;res.type(format==='pdf'?'application/pdf':'text/plain; charset=utf-8').set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(r.name)}.${format}`).send(body)}catch(e){next(e)}});
}
