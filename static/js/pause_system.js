window.KPCPause = window.KPCPause || {paused:false};
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){
    const ov=document.getElementById('pauseOverlay');
    if(!ov) return;
    window.KPCPause.paused=!window.KPCPause.paused;
    ov.style.display=window.KPCPause.paused?'flex':'none';
  }
});
window.resumeGame=function(){
  window.KPCPause.paused=false;
  const ov=document.getElementById('pauseOverlay');
  if(ov) ov.style.display='none';
};
