export type BuilderSection='education'|'work'|'projects'|'skills';
export type ResumeTemplate='classic'|'campus'|'technical';
export type BuilderEducation={institution:string;area:string;studyType:string;startDate:string;endDate:string;summary:string};
export type BuilderWork={name:string;position:string;startDate:string;endDate:string;summary:string};
export type BuilderProject={name:string;role:string;url:string;startDate:string;endDate:string;summary:string};
export type ResumeBuilderData={basics:{name:string;label:string;email:string;phone:string;city:string;url:string;summary:string;image:string};education:BuilderEducation[];work:BuilderWork[];projects:BuilderProject[];skills:string;availability:string};
export type ResumeBuilderStyle={fontFamily?:'noto-sans'|'noto-serif'|'wenkai';template:ResumeTemplate;accent:'blue'|'green'|'purple'|'orange'|'rose';fontSize:10|11|12;showPhoto:boolean;order:BuilderSection[];visible:BuilderSection[]};
export type ResumeBuilderDocument={data:ResumeBuilderData;style:ResumeBuilderStyle};
export const builderLabels:Record<BuilderSection,string>={education:'教育背景',work:'实习与工作',projects:'项目经历',skills:'技能与证书'};
export const emptyEducation=():BuilderEducation=>({institution:'',area:'',studyType:'',startDate:'',endDate:'',summary:''});
export const emptyWork=():BuilderWork=>({name:'',position:'',startDate:'',endDate:'',summary:''});
export const emptyProject=():BuilderProject=>({name:'',role:'',url:'',startDate:'',endDate:'',summary:''});
export const emptyBuilder=():ResumeBuilderDocument=>({data:{basics:{name:'',label:'',email:'',phone:'',city:'',url:'',summary:'',image:''},education:[emptyEducation()],work:[],projects:[emptyProject()],skills:'',availability:''},style:{fontFamily:'noto-sans',template:'classic',accent:'blue',fontSize:11,showPhoto:true,order:['education','work','projects','skills'],visible:['education','work','projects','skills']}});
export const builderTemplates=[{id:'classic' as const,name:'简约通用',description:'清晰分区，适合大多数岗位',color:'blue' as const},{id:'campus' as const,name:'清新校园',description:'柔和色带，突出教育与实习',color:'green' as const},{id:'technical' as const,name:'技术项目',description:'深色页眉，优先呈现项目成果',color:'purple' as const}];

export const resumeFontOptions=[{id:'noto-sans',name:'思源黑体 / Noto Sans SC',family:'Resume Sans'},{id:'noto-serif',name:'思源宋体 / Noto Serif SC',family:'Resume Serif'},{id:'wenkai',name:'霞鹜文楷',family:'Resume WenKai'}] as const;
