import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const dataDir = resolve(process.env.DATA_DIR || '.data');
mkdirSync(dataDir, {recursive:true, mode:0o700});
chmodSync(dataDir, 0o700);
const stores = new Map();
export function store(workspace = 'personal') {
  if (!stores.has(workspace)) {
    const db = new DatabaseSync(resolve(dataDir, `${workspace === 'demo' ? 'demo' : 'personal'}.sqlite`));
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(kind,id))');
    const s = {
      all: kind => db.prepare('SELECT value FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r => JSON.parse(r.value)),
      get: (kind,id) => {const r=db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id); return r ? JSON.parse(r.value) : null;},
      put: (kind,value) => {value.id ||= randomUUID(); db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,value.id,JSON.stringify(value)); return value;},
      remove: (kind,id) => db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id),
      transaction: fn => {db.exec('BEGIN IMMEDIATE'); try {const result=fn(); db.exec('COMMIT'); return result;} catch(e) {db.exec('ROLLBACK'); throw e;}},
    };
    stores.set(workspace,s);
    if (workspace === 'demo' && !s.get('meta','seed')) seed(s);
  }
  return stores.get(workspace);
}
export const stages = ['已发现','已联系','已投递','初筛','笔试','一面','二面','三面','终面','HR 面','Offer','未通过','已撤回'];
function seed(s) {
  const applications = [
    {id:'app-byte', company:'字节跳动',logo:'B',color:'purple',role:'前端开发实习生',city:'北京 · 海淀',salary:'300–400 元/天',tags:['前端开发','每周 4 天','3 个月'],source:'BOSS直聘',url:'https://www.zhipin.com/',stage:'二面',status:'active',interviewAt:'2026-10-23T14:00:00+08:00',contactEmail:'recruiting@example.com',description:'参与业务前端开发，熟悉 JavaScript、React 和浏览器基础。示例岗位，用于体验申请流程。'},
    {id:'app-tencent',company:'腾讯',logo:'T',color:'blue',role:'产品经理实习生',city:'深圳 · 南山',salary:'200–300 元/天',tags:['产品设计','每周 5 天','3 个月'],source:'公司官网',url:'https://careers.tencent.com/',stage:'一面',status:'active',interviewAt:'2026-10-24T10:30:00+08:00',contactEmail:'talent@example.com',description:'协助用户研究、需求分析与产品原型设计。此为演示内容，不代表真实在招岗位。'},
    {id:'app-xhs',company:'小红书',logo:'小红书',color:'rose',role:'用户体验设计实习生',city:'上海 · 黄浦',salary:'250–350 元/天',tags:['交互设计','每周 4 天','6 个月'],source:'实习僧',url:'https://www.shixiseng.com/',stage:'初筛',status:'active',contactEmail:'design@example.com',description:'参与移动端体验设计、交互方案和设计系统维护。示例岗位。'},
    {id:'app-netease',company:'网易',logo:'网',color:'orange',role:'数据分析实习生',city:'杭州 · 滨江',salary:'200–250 元/天',tags:['SQL','数据分析','3 个月'],source:'公司官网',url:'https://hr.163.com/',stage:'已投递',status:'active',contactEmail:'campus@example.com',description:'参与业务数据分析，熟悉 SQL、Python，具备统计学基础。示例岗位。'},
    {id:'app-mi',company:'小米',logo:'mi',color:'orange',role:'软件开发实习生',city:'北京 · 海淀',salary:'250–300 元/天',tags:['软件开发','C++','6 个月'],source:'BOSS直聘',url:'https://www.zhipin.com/',stage:'已发现',status:'saved',contactEmail:'',description:'软件开发示例岗位，可尝试生成投递草稿。'},
    {id:'app-meituan',company:'美团',logo:'M',color:'green',role:'算法工程实习生',city:'北京 · 朝阳',salary:'300–400 元/天',tags:['Python','机器学习','3 个月'],source:'实习僧',url:'https://www.shixiseng.com/',stage:'已发现',status:'saved',contactEmail:'',description:'算法研究示例岗位，可添加至申请跟踪。'},
  ];
  for (const a of applications) {
    a.createdAt='2026-10-19T09:00:00+08:00';
    const idx=Math.min(stages.indexOf(a.stage),6);
    a.events=stages.slice(0,idx+1).map((stage,i)=>({id:randomUUID(),stage,date:`2026-10-${String(16+i).padStart(2,'0')}T10:00:00+08:00`,note:i===idx ? (stage==='二面' ? '收到二面邀请，待确认面试链接。' : '已进入当前阶段，等待下一步消息。') : `${stage}阶段已完成。`,source:'示例记录',evidence:'这是一条用于展示节点详情的示例，非真实招聘消息。'}));
    s.put('applications',a);
  }
  s.put('resumes',{id:'resume-base',name:'我的基础简历',version:1,createdAt:'2026-10-20T11:20:00+08:00',fileName:null,content:'# 个人简历\n\n## 教育背景\n请替换为真实学校、专业和毕业时间。\n\n## 项目经历\n个人项目：使用 React 与 TypeScript 构建 Web 应用。\n请补充自己实际负责的内容和可核实的成果。\n\n## 技能\nJavaScript、TypeScript、React、HTML、CSS、Git。',note:'通用版本 · 示例内容'});
  s.put('resumes',{id:'resume-fe',name:'前端开发 · 定向版',version:2,createdAt:'2026-10-21T15:10:00+08:00',fileName:null,content:'# 前端开发实习简历\n\n## 项目经历\n基于 React 的个人项目，使用 TypeScript 组织组件和数据。\n\n## 待补充\n补充实际性能指标、可访问性实践、测试覆盖和项目链接。',note:'面向前端岗位 · 示例内容'});
  s.put('drafts',{id:'draft-xhs',applicationId:'app-xhs',company:'小红书',role:'用户体验设计实习生',to:'design@example.com',subject:'实习申请｜用户体验设计实习生',body:'您好，\n\n我希望申请用户体验设计实习生岗位。随信附上我的简历，期待进一步交流。\n\n到岗时间、每周出勤和实习时长待我补充。\n\n感谢您的时间！',resumeId:'resume-base',status:'draft',revision:1,createdAt:'2026-10-22T09:00:00+08:00'});
  s.put('drafts',{id:'draft-netease',applicationId:'app-netease',company:'网易',role:'数据分析实习生',to:'campus@example.com',subject:'实习申请｜数据分析实习生',body:'您好，\n\n我对数据分析实习生岗位很感兴趣，请查收附件中的个人简历。\n\n期待您的回复，感谢！',resumeId:'resume-base',status:'draft',revision:1,createdAt:'2026-10-22T09:30:00+08:00'});
  s.put('messages',{id:'msg-byte',from:'recruiting@example.com',subject:'【示例】字节跳动前端实习生二面邀请',body:'你好，恭喜通过一面。我们邀请你于 10 月 23 日 14:00 参加二面，面试链接将在确认后发送。',date:'2026-10-22T09:30:00+08:00',applicationId:'app-byte',proposedStage:'二面',reviewed:true,source:'示例邮箱'});
  s.put('messages',{id:'msg-tencent',from:'talent@example.com',subject:'【示例】腾讯产品实习生面试安排',body:'你好，邀请你参加产品经理实习生岗位一面。时间：10 月 24 日 10:30。请回复确认是否可以参加。',date:'2026-10-22T10:00:00+08:00',applicationId:'app-tencent',proposedStage:'一面',reviewed:false,source:'示例邮箱'});
  s.put('meta',{id:'seed',version:1});
}
