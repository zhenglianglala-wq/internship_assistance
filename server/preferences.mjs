import {z} from 'zod';
export const directionOptions=[
  {id:'frontend',label:'前端开发',aliases:['前端','frontend','front-end','front end','web developer']},
  {id:'backend',label:'后端开发',aliases:['后端','服务端','backend','back-end','back end','软件开发','software engineer']},
  {id:'algorithm',label:'算法 / AI',aliases:['算法','大模型','人工智能','机器学习','algorithm','machine learning','research scientist','artificial intelligence']},
  {id:'data',label:'数据分析',aliases:['数据分析','数据科学','商业分析','data analy','data scien','business analy']},
  {id:'product',label:'产品经理',aliases:['产品经理','产品实习','产品助理','product manag','product intern']},
  {id:'design',label:'设计 / 用户体验',aliases:['设计','交互','用户体验','design','ux','ui/ux']},
  {id:'operations',label:'运营 / 市场',aliases:['运营','市场','营销','operation','marketing','growth']},
  {id:'testing',label:'测试 / 质量',aliases:['测试','质量保障','qa engineer','quality','test engineer']},
];
export const cityOptions=['北京','上海','深圳','杭州','广州','成都','南京','武汉','西安','苏州','天津','重庆','香港','新加坡','其他海外'];
const cityAliases={'北京':['北京','beijing'],'上海':['上海','shanghai'],'深圳':['深圳','shenzhen'],'杭州':['杭州','hangzhou'],'广州':['广州','guangzhou'],'成都':['成都','chengdu'],'南京':['南京','nanjing'],'武汉':['武汉','wuhan'],'西安':['西安',"xi'an",'xian'],'苏州':['苏州','suzhou'],'天津':['天津','tianjin'],'重庆':['重庆','chongqing'],'香港':['香港','hong kong'],'新加坡':['新加坡','singapore']};
export const defaultPreferences={directions:[],cities:[],keywords:'',employment:'intern',workplace:'any',daysPerWeek:0,durationMonths:0,includeUnknown:true};
export const preferencesSchema=z.object({directions:z.array(z.enum(directionOptions.map(x=>x.id))).max(8),cities:z.array(z.string().trim().min(1).max(40)).max(32),keywords:z.string().trim().max(300),employment:z.enum(['any','intern','fulltime','parttime','contract']),workplace:z.enum(['any','onsite','remote','hybrid']),daysPerWeek:z.number().int().min(0).max(7),durationMonths:z.number().int().min(0).max(24),includeUnknown:z.boolean()});
export function preferences(s){return s.get('preferences','search')?.value||{...defaultPreferences};}
export function inferRequirements(text){
  const lower=text.toLowerCase();
  const employment=/实习|intern(?:ship)?\b|working student/.test(lower)?'intern':/兼职|part.?time/.test(lower)?'parttime':/合同工|contractor|contract\b/.test(lower)?'contract':/全职|full.?time|年以上工作经验|senior|staff engineer/.test(lower)?'fulltime':'unknown';
  const workplace=/混合办公|hybrid/.test(lower)?'hybrid':/远程|remote|telecommut/.test(lower)?'remote':/现场办公|on.?site/.test(lower)?'onsite':'unknown';
  const days=text.match(/(?:每周|一周|每星期)\s*(?:至少|不少于|≥)?\s*([1-7])\s*(?:[-–~至到]\s*[1-7])?\s*天/)||text.match(/([1-7])\s*(?:[-–]\s*[1-7])?\s*days?\s*(?:per|a|\/)\s*week/i);
  const months=text.match(/(\d{1,2})\s*(?:[-–~至到]\s*\d{1,2})?\s*个月/)||text.match(/(?:实习期|实习时长|至少实习|实习至少|实习|持续|不少于)\s*(\d{1,2})\s*月/)||text.match(/(\d{1,2})\s*(?:[-–]\s*\d{1,2})?\s*months?/i);
  return {employment,workplace,daysPerWeek:days?Number(days[1]):null,durationMonths:months?Number(months[1]):null};
}
export function matchJob(job,p=defaultPreferences){
  const text=`${job.role} ${job.department||''} ${job.description}`.toLowerCase(),location=(job.city||'').toLowerCase(),reasons=[],unknown=[];
  if(p.directions.length){const selected=directionOptions.filter(d=>p.directions.includes(d.id)&&d.aliases.some(a=>text.includes(a)));if(!selected.length)return {matched:false,reasons,unknown,score:0};reasons.push(...selected.map(d=>d.label));}
  if(p.cities.length){const matched=p.cities.some(city=>city==='其他海外'?/san francisco|new york|london|tokyo|paris|berlin|seattle|amsterdam|dublin|sydney|toronto|vancouver|austin|boston|washington|california|united states|united kingdom|germany|france|japan|australia|canada|india|korea|seoul|europe/i.test(location):(cityAliases[city]||[city.toLowerCase()]).some(a=>location.includes(a)));if(!matched)return {matched:false,reasons,unknown,score:0};reasons.push('地点符合');}
  if(p.keywords){const words=p.keywords.split(/[,，、\n]+/).map(w=>w.trim().toLowerCase()).filter(Boolean);if(!words.every(w=>text.includes(w)))return {matched:false,reasons,unknown,score:0};reasons.push('关键词符合');}
  for(const [key,label] of [['employment','岗位类型'],['workplace','办公方式']]){if(p[key]!=='any'){if(job[key]==='unknown'||!job[key]){unknown.push(`${label}未标注`);if(!p.includeUnknown)return {matched:false,reasons,unknown,score:0};}else if(job[key]!==p[key])return {matched:false,reasons,unknown,score:0};else reasons.push(`${label}符合`);}}
  for(const [key,label] of [['daysPerWeek','出勤要求'],['durationMonths','实习时长']]){if(p[key]){if(job[key]==null){unknown.push(`${label}未标注`);if(!p.includeUnknown)return {matched:false,reasons,unknown,score:0};}else if(job[key]>p[key])return {matched:false,reasons,unknown,score:0};else reasons.push(`${label}符合`);}}
  return {matched:true,reasons,unknown,score:reasons.length*10-unknown.length};
}
