import type {Resume} from './types';
export async function downloadResume(resume:Resume,workspace:string,format:'original'|'pdf'|'txt'|'json'|'html'='original',fontFamily?:string){
 const path=['json','html'].includes(format)?`/api/resumes/${resume.id}/structured-export?format=${format}`:format==='original'?`/api/resumes/${resume.id}/download`:`/api/resumes/${resume.id}/export?format=${format}`;
 const response=await fetch(path+(fontFamily&&format==='pdf'?`&fontFamily=${encodeURIComponent(fontFamily)}`:''),{headers:{'X-Workspace':workspace}});if(!response.ok){const error=await response.json();throw new Error(error.error||'下载失败，请重试')}
 const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=format==='original'?(resume.fileName||`${resume.name}.md`):`${resume.name}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function resumeSections(content:string){const result:{name:string;content:string}[]=[];let name='基本信息',lines:string[]=[];function flush(){if(lines.join('\n').trim())result.push({name,content:lines.join('\n').trim()});lines=[]}for(const line of content.split('\n')){const match=line.match(/^#{1,3}\s+(.+)$/)||line.match(/^(教育背景|教育经历|项目经历|工作经历|实习经历|专业技能|个人技能|自我评价)[：:]?\s*$/);if(match){flush();name=match[1]}else lines.push(line)}flush();return result.length?result:[{name:'简历全文',content}]}
