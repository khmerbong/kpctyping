// V44 Auto Capture Typing
(function(){
  let forwarding=false;
  function input(){return document.getElementById("academyInput");}
  function status(){return document.getElementById("v44TypeStatus");}
  function focusInput(){
    const el=input();
    if(el && document.activeElement!==el){
      try{el.focus({preventScroll:true});}catch(e){el.focus();}
    }
  }
  function showStatus(text){
    const s=status();
    if(!s)return;
    s.textContent=text;
    s.classList.add("v44-ready");
    clearTimeout(s.__timer);
    s.__timer=setTimeout(()=>{s.textContent="⌨️ Keyboard Focus Active — Just Type";},900);
  }
  function flashKey(k){
    const s=status();
    if(!s)return;
    const r=s.getBoundingClientRect();
    const f=document.createElement("div");
    f.className="v44-key-flash";
    f.textContent=k===" "?"SPACE":k;
    f.style.left=(r.left+r.width/2-20)+"px";
    f.style.top=(r.top-8)+"px";
    document.body.appendChild(f);
    setTimeout(()=>f.remove(),600);
  }
  function forwardToInput(e){
    const el=input();
    if(!el || forwarding)return;
    if(e.ctrlKey || e.metaKey || e.altKey)return;
    if(e.key.length!==1 && e.key!==" ")return;
    if(document.activeElement===el)return;
    e.preventDefault();
    forwarding=true;
    const ev=new KeyboardEvent("keydown",{key:e.key,code:e.code,bubbles:true,cancelable:true,shiftKey:e.shiftKey});
    el.dispatchEvent(ev);
    forwarding=false;
    flashKey(e.key);
  }
  function bind(){
    focusInput();
    showStatus("⌨️ Ready — just type");
    document.addEventListener("click",()=>setTimeout(focusInput,20),true);
    document.addEventListener("keydown",forwardToInput,true);
    setInterval(focusInput,700);
    const el=input();
    if(el){
      el.setAttribute("aria-hidden","true");
      el.setAttribute("tabindex","-1");
      el.addEventListener("keydown",(e)=>{
        if(e.key.length===1 || e.key===" "){
          showStatus("Typing captured ✓");
          flashKey(e.key);
        }
      },true);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();
