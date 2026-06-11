
document.addEventListener('DOMContentLoaded',()=>{
 const t=document.getElementById('targetKey');
 if(!t) return;
 const render=()=>{
   const txt=(t.textContent||'').trim();
   if(txt.length<2) return;
   const cur=txt[0];
   const next=txt.slice(1,12);
   t.innerHTML='<span class="flow-word"><span class="current">'+cur+
   '</span><span class="next">'+next+'</span></span>';
 };
 setInterval(render,800);
});
