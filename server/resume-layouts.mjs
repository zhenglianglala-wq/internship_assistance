import {resumeFont} from './resume-fonts.mjs';
import PDFDocument from 'pdfkit';
const colors={blue:'#386B9B',green:'#247B69',purple:'#70509C',orange:'#A96C2B',rose:'#A65272'};
const labels={education:'教育背景',work:'实习与工作',projects:'项目经历',skills:'技能与证书'};
export async function builderPdf({data:d,style:s},name=d.basics.name){
 const {path:font}=resumeFont(s.fontFamily||'noto-sans');
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',margins:{top:44,bottom:45,left:48,right:48},bufferPages:true,info:{Title:name,Author:d.basics.name}}),parts=[];doc.on('data',p=>parts.push(p));doc.on('end',()=>resolve(Buffer.concat(parts)));doc.on('error',reject);
  try{
   const accent=colors[s.accent],dark=s.template==='technical',campus=s.template==='campus',size=s.fontSize,width=doc.page.width-96,photo=s.showPhoto&&d.basics.image,headerWidth=photo?width-88:width;
   doc.font(font);const contacts=[d.basics.email,d.basics.phone,d.basics.city,d.basics.url].filter(Boolean).join(' · ');
   const nameHeight=doc.fontSize(25).heightOfString(d.basics.name,{width:headerWidth}),labelHeight=d.basics.label?doc.fontSize(12).heightOfString(d.basics.label,{width:headerWidth})+7:0,contactHeight=contacts?doc.fontSize(9).heightOfString(contacts,{width:headerWidth,lineGap:3})+8:0;
   const headerBottom=44+Math.max(photo?86:0,nameHeight+labelHeight+contactHeight)+18;
   if(dark)doc.rect(0,0,doc.page.width,headerBottom+6).fill(accent);else if(campus)doc.rect(0,0,doc.page.width,headerBottom+6).fill('#EFF7F4');else doc.rect(48,31,width,3).fill(accent);
   doc.fillColor(dark?'#FFFFFF':accent).fontSize(25).text(d.basics.name,48,44,{width:headerWidth,lineGap:3});
   if(d.basics.label)doc.moveDown(.2).fontSize(12).fillColor(dark?'#FFFFFF':'#263B4E').text(d.basics.label,{width:headerWidth,lineGap:3});
   if(contacts)doc.moveDown(.25).fontSize(9).fillColor(dark?'#F0EDF8':'#526477').text(contacts,{width:headerWidth,lineGap:3});
   if(photo){const bytes=Buffer.from(d.basics.image.split(',')[1],'base64');doc.image(bytes,doc.page.width-48-64,44,{fit:[64,86],align:'center',valign:'center'})}
   doc.x=48;doc.y=headerBottom+20;
   const ensure=h=>{if(doc.y+h>doc.page.height-50){doc.addPage();doc.x=48;doc.y=44}};
   const paragraph=(text,{small=false}={})=>{if(!text)return;doc.fontSize(small?size-1:size).fillColor('#2C3C4D').text(text,{width,lineGap:4,paragraphGap:5});doc.moveDown(.35)};
   function heading(title){ensure(65);doc.fontSize(13).fillColor(accent).text(title,{width,lineGap:3});const y=doc.y+3;doc.moveTo(48,y).lineTo(48+width,y).lineWidth(.6).strokeColor(campus?'#C7DDD5':'#D8DEE7').stroke();doc.y=y+13;doc.x=48}
   if(d.availability){ensure(35);paragraph(d.availability,{small:true})}if(d.basics.summary){heading('个人简介');paragraph(d.basics.summary)}
   for(const key of s.order){if(!s.visible.includes(key))continue;if(key==='skills'){if(d.skills.trim()){heading(labels[key]);paragraph(d.skills)}continue}const rows=d[key].filter(r=>r.institution||r.name);if(!rows.length)continue;heading(labels[key]);for(const r of rows){ensure(65);const title=[r.institution||r.name,r.position||r.role].filter(Boolean).join(' · '),dates=[r.startDate,r.endDate||(r.startDate?'至今':'')].filter(Boolean).join(' - ');const y=doc.y;doc.fontSize(size+1).fillColor('#22394C').text(title,48,y,{width:dates?width-128:width,lineGap:4});const titleBottom=doc.y;if(dates){doc.fontSize(size-2).fillColor('#657388').text(dates,48+width-125,y+2,{width:125,align:'right',lineGap:3});doc.y=Math.max(titleBottom,doc.y)}else doc.y=titleBottom;doc.x=48;doc.moveDown(.25);const sub=[r.studyType,r.area,r.url].filter(Boolean).join(' · ');if(sub)paragraph(sub,{small:true});paragraph(r.summary);doc.moveDown(.35)}}
   const pages=doc.bufferedPageRange();for(let i=pages.start;i<pages.start+pages.count;i++){doc.switchToPage(i);const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#7A8795').text(`${i+1} / ${pages.count}`,48,doc.page.height-29,{width,align:'right',lineBreak:false});doc.page.margins.bottom=bottom}doc.end();
  }catch(e){doc.destroy();reject(e)}
 });
}
