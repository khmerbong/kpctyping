
window.KPCPause={paused:false};
document.addEventListener('keydown',(e)=>{
 if(e.key==='Escape'){
   const ov=document.getElementById('pauseOverlay');
   if(!ov) return;
   KPCPause.paused=!KPCPause.paused;
   ov.style.display=KPCPause.paused?'flex':'none';
 }
});
window.resumeGame=function(){
 KPCPause.paused=false;
 const ov=document.getElementById('pauseOverlay');
 if(ov) ov.style.display='none';
};
