
(function(){
 let wrong=0;
 function ensure(){
   if(!document.querySelector('.v48-finger-hint')){
     const d=document.createElement('div');
     d.className='v48-finger-hint';
     d.textContent='Finger Hint Active';
     document.body.appendChild(d);
   }
   if(!document.querySelector('.v48-pause-tip')){
     const d=document.createElement('div');
     d.className='v48-pause-tip';
     d.textContent='Slow down and check highlighted key';
     document.body.appendChild(d);
   }
 }
 document.addEventListener('DOMContentLoaded', ensure);
 document.addEventListener('keydown', e=>{
   if(e.key==='Escape') wrong=0;
 });
})();
