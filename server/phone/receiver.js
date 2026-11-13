const token=location.hash.slice(1),form=document.querySelector('#share'),result=document.querySelector('#result'),button=form.querySelector('button');
if(!/^[\w-]{40,64}$/.test(token)){result.textContent='请扫描电脑端生成的完整二维码，连接信息缺失。';button.disabled=true;}
form.addEventListener('submit',async event=>{
  event.preventDefault();const data=new FormData(form),file=data.get('image');
  if(!data.get('text')?.trim()&&!file?.size){result.textContent='请粘贴分享内容或选择截图。';return;}
  if(file?.size>8*1024*1024){result.textContent='请选择8MB以内的截图。';return;}
  if(!file?.size)data.delete('image');
  button.disabled=true;result.textContent=file?.size?'正在电脑识别截图，首次使用需要准备本机识别工具…':'正在发送…';
  try{const response=await fetch('/api/share',{method:'POST',headers:{'X-Pairing-Token':token},body:data});const body=await response.json();if(!response.ok)throw new Error(body.error||'接收失败');result.textContent=body.message+'。可以继续发送下一个岗位。';form.reset();}
  catch(error){result.textContent=error.message==='Failed to fetch'?'连接已断开或到期，请确认电脑服务运行并重新扫描二维码。':error.message;}
  finally{button.disabled=false;}
});
