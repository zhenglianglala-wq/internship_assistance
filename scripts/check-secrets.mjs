import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const git=spawnSync('git',['ls-files','--cached','-z'],{encoding:'utf8'});
const excluded=new Set(['.git','.data','node_modules','.pnpm-store','dist','artifacts','test-results','playwright-report']);
function walk(dir='.') {return readdirSync(dir,{withFileTypes:true}).flatMap(e=>excluded.has(e.name)?[]:e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name).replace(/^\.\//,'')]);}
const tracked=git.status===0,files=tracked?git.stdout.split('\0').filter(Boolean):walk();
const findings=[];
for(const file of files){
  if(tracked && (/(^|\/)\.env($|\.)/.test(file)&&!file.endsWith('.env.example')||/(^|\/)\.data\//.test(file)||/\.(key|pem|sqlite|sqlite3)(-|$|\.)/.test(file))){findings.push(`${file}：不应提交的私密文件`);continue;}
  if(!/\.(mjs|js|ts|tsx|json|ya?ml|md|example|sh|command)$/.test(file))continue;
  if(!tracked && statSync(file).size>1000000)continue;
  const source=tracked?spawnSync('git',['show',`:${file}`],{encoding:'utf8',maxBuffer:2000000}).stdout||'':readFileSync(file,'utf8');
  const patterns=[/\bsk-(?:proj-)?[A-Za-z0-9_.-]{24,}\b/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
  if(patterns.some(p=>p.test(source)))findings.push(`${file}：发现疑似密钥，已隐藏具体内容`);
}
if(findings.length){console.error(findings.join('\n'));process.exit(1)}
console.log(tracked?'密钥检查通过：已检查 Git 索引。':'密钥检查通过：尚未初始化 Git，已检查项目源文件。');
