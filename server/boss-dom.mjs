// Runs inside the selected BOSS page. Keep this independent of Node and credentials.
export function readBossPage(){
  const text=el=>(el?.innerText||el?.textContent||'').trim();
  const visible=el=>!!el&&el.getClientRects().length>0;
  const page=new URL(location.href);
  if(page.protocol!=='https:'||!['www.zhipin.com','zhipin.com'].includes(page.hostname))return {state:'wrong_page',jobs:[]};
  const pageUrl=`${page.origin}${page.pathname}`;
  const expected=document.querySelector('a[href*="/job_detail/"]');
  const pageText=text(document.body).slice(0,12000);
  const captcha=[...document.querySelectorAll('[class*="captcha"],[id*="captcha"],.geetest_panel,iframe[src*="captcha"]')].some(visible);
  if(captcha||/captcha|security-check|\/verify/i.test(page.pathname)||(!expected&&/验证码|安全验证|完成验证/.test(pageText)))return {state:'captcha',url:pageUrl,jobs:[]};
  if(/\/web\/passport\/zp\/security(?:\.html|\/|$)/i.test(page.pathname))return {state:'checking',url:pageUrl,jobs:[]};
  if(!expected&&/访问频繁|操作频繁|账号异常|访问被拒绝|稍后再试/.test(pageText))return {state:'blocked',url:pageUrl,jobs:[]};
  if(document.readyState!=='complete')return {state:'loading',url:pageUrl,jobs:[]};
  const loggedIn=!!document.querySelector('a[href*="/web/geek/chat"]')&&!!document.querySelector('a[href*="/web/geek/resume"]');
  if(!loggedIn&&!expected&&pageText.length<80)return {state:'loading',url:pageUrl,jobs:[]};
  if(!loggedIn)return {state:'login_required',url:pageUrl,jobs:[]};
  const canonical=value=>{try{const u=new URL(value,location.href);if(!['www.zhipin.com','zhipin.com'].includes(u.hostname)||u.protocol!=='https:')return '';const m=u.pathname.match(/^\/job_detail\/([\w-]+)\.html$/);return m?`https://www.zhipin.com/job_detail/${m[1]}.html`:''}catch{return ''}};
  const plainSalary=value=>/[\uE000-\uF8FF]/.test(value)?'':value;
  const seen=new Set(),jobs=[];
  for(const link of document.querySelectorAll('a[href*="/job_detail/"]')){
    const url=canonical(link.getAttribute('href')),role=text(link);
    if(!url||!role||role==='查看更多信息'||seen.has(url))continue;
    let card=link.closest('.job-card-wrap,.job-card-wrapper,.job-card-box,li');
    if(!card){let parent=link.parentElement;for(let i=0;parent&&i<5;i++,parent=parent.parentElement)if(parent.querySelector('a[href*="/gongsi/"]')){card=parent;break}}
    if(!card)continue;
    const company=text(card.querySelector('.company-name,.boss-name,a[href*="/gongsi/"]'));
    if(!company)continue;
    // The live page keeps the original public job fields in this card's Vue props.
    // Verify the job ID before using a field; never traverse account stores or cookies.
    const vueCard=link.closest('.job-card-wrap,.job-card-wrapper');
    const candidate=vueCard?.__vue__?.$props?.data||vueCard?.__vueParentComponent?.props?.data;
    const jobId=url.match(/job_detail\/([^/.]+)/)[1];
    const publicJob=candidate&&candidate.encryptJobId===jobId&&candidate.jobName===role?candidate:null;
    const rawSalary=typeof publicJob?.salaryDesc==='string'?publicJob.salaryDesc:text(card.querySelector('.job-salary,.salary'));
    const tags=[...card.querySelectorAll('.tag-list li,.tag-list span,.job-tag,.tags span')].map(text).filter(Boolean);
    const city=text(card.querySelector('.company-location,.job-area,.job-location,.job-area-wrapper'));
    jobs.push({externalId:jobId,role,company,url,city,salary:plainSalary(rawSalary),employment:publicJob?.jobType===4?'intern':publicJob?.jobType===5?'parttime':undefined,daysPerWeek:Number(publicJob?.daysPerWeekDesc?.match(/^([1-7])天\/周$/)?.[1])||undefined,durationMonths:Number(publicJob?.leastMonthDesc?.match(/^(\d{1,2})个月$/)?.[1])||undefined,description:tags.join(' · '),fieldWarnings:rawSalary&&!plainSalary(rawSalary)?['薪资使用特殊字体，需查看原页面核实']:[],detailStatus:'list'});
    seen.add(url);if(jobs.length>=100)break;
  }
  const more=[...document.querySelectorAll('a[href*="/job_detail/"]')].find(a=>text(a)==='查看更多信息');
  let detailRoot=more?.closest('.job-detail-box,.job-detail-container,.job-detail,.job-primary,.detail-box');
  if(!detailRoot&&more){for(let parent=more.parentElement,i=0;parent&&i<7;parent=parent.parentElement,i++)if(parent.querySelector('.job-sec-text')){detailRoot=parent;break}}
  const detailUrl=canonical(more?.getAttribute('href')||(/\/job_detail\//.test(page.pathname)?location.href:''));
  let detail=null;
  if(detailUrl){
    const root=detailRoot||document;
    const description=text(root.querySelector('.job-sec-text,.job-description,.job-detail-content,.job-detail-body .desc'));
    const rawSalary=text(root.querySelector('.salary,.job-salary'));
    if(description)detail={url:detailUrl,description,salary:plainSalary(rawSalary),fieldWarnings:rawSalary&&!plainSalary(rawSalary)?['薪资使用特殊字体，需查看原页面核实']:[],detailStatus:'detail'};
  }
  // Search URLs may contain per-session tracking values; retain only ordinary filters.
  const filters=new URLSearchParams();for(const key of ['query','city','jobType'])if(page.searchParams.has(key))filters.set(key,page.searchParams.get(key));
  return {state:page.searchParams.get('jobType')==='1902'&&jobs.some(j=>j.employment==='parttime')?'loading':jobs.length?'ready':/加载中|请稍候/.test(pageText)?'loading':'structure_changed',url:pageUrl+(filters.size?'?'+filters:''),jobs,detail};
}

export function selectBossJob(id){
  if(location.protocol!=='https:'||!['www.zhipin.com','zhipin.com'].includes(location.hostname))return false;
  if(!/^[\w-]{1,160}$/.test(id))return false;
  const link=[...document.querySelectorAll('a[href*="/job_detail/"]')].find(a=>{try{return new URL(a.href).pathname===`/job_detail/${id}.html`&&a.textContent.trim()!=='查看更多信息'}catch{return false}});
  if(!link)return false;link.click();return true;
}
