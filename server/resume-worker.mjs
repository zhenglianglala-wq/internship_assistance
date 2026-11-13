import {parentPort,workerData} from 'node:worker_threads';
const buffer=Buffer.from(workerData.buffer);
try{
 let content='';
 if(workerData.format==='pdf'){
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
  const pdf=await task.promise;
  try{if(pdf.numPages>30)throw Error('too many pages');for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),text=await page.getTextContent();content+=text.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')+'\n\n';if(content.length>100000)throw Error('too long')}}finally{await task.destroy()}
 }else{const mammoth=await import('mammoth');content=(await mammoth.extractRawText({buffer},{externalFileAccess:false})).value;if(content.length>100000)throw Error('too long')}
 parentPort.postMessage({content:content.trim()});
}catch{parentPort.postMessage({error:true})}
