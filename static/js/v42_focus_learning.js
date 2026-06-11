
(function(){
  let combo=Number(localStorage.getItem("kpc_v42_combo")||0);
  let lastTarget="";
  let lastCorrect=Number(localStorage.getItem("kpc_academy_correct")||0);

  function getTargetText(){
    const t=document.getElementById("targetKey");
    return t?(t.textContent||"").replace(/\s+/g," ").trim():"";
  }
  function makeSequence(){
    const target=document.getElementById("targetKey");
    if(!target)return;
    const text=getTargetText();
    if(!text || text==="SPACE" || text.includes(" "))return;
    if(text.length===1 && lastTarget!==text){
      lastTarget=text;
      target.innerHTML=Array(9).fill(text).map((c,i)=>`<span class="${i===0?'now':''}">${c}</span>`).join("");
    }
  }
  function comboBadge(){
    let b=document.querySelector(".v42-combo-badge");
    if(!b){b=document.createElement("div");b.className="v42-combo-badge";document.body.appendChild(b);}
    return b;
  }
  function showCombo(){
    if(combo<3)return;
    const b=comboBadge();
    b.textContent=`🔥 Combo x${combo}`;
    b.classList.add("show");
    clearTimeout(b.__t);
    b.__t=setTimeout(()=>b.classList.remove("show"),1300);
  }
  function xpPop(text,x,y){
    const p=document.createElement("div");
    p.className="v42-xp-pop";
    p.textContent=text;
    p.style.left=(x||window.innerWidth/2)+"px";
    p.style.top=(y||240)+"px";
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),800);
  }
  function keyCenter(){
    const k=document.querySelector(".key.active")||document.querySelector(".v40-key-focus");
    if(!k)return {x:window.innerWidth/2,y:260};
    const r=k.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top};
  }
  function smartCoach(){
    const f=document.getElementById("feedbackText"), finger=document.getElementById("fingerName");
    if(!f||!finger)return;
    const t=(getTargetText()[0]||"");
    if(t)f.textContent=`Press "${t}" slowly. Use ${finger.textContent.toLowerCase()}. Accuracy first.`;
  }
  function bindFocus(){
    const btn=document.getElementById("v42FocusBtn");
    const saved=localStorage.getItem("kpc_v42_focus")==="1";
    document.body.classList.toggle("v42-focus-mode",saved);
    if(btn){
      btn.classList.toggle("active",saved);
      btn.onclick=()=>{
        const on=!document.body.classList.contains("v42-focus-mode");
        document.body.classList.toggle("v42-focus-mode",on);
        btn.classList.toggle("active",on);
        localStorage.setItem("kpc_v42_focus",on?"1":"0");
      };
    }
  }
  function monitorCorrect(){
    const now=Number(localStorage.getItem("kpc_academy_correct")||0);
    if(now>lastCorrect){
      combo++;
      localStorage.setItem("kpc_v42_combo",combo);
      const c=keyCenter();
      xpPop("+4 XP",c.x,c.y);
      showCombo();
      lastCorrect=now;
    }
  }
  document.addEventListener("keydown",(e)=>{
    const target=(getTargetText()[0]||"");
    const typed=e.key===" "?" ":e.key;
    if(target && typed && typed!==target){
      combo=0;
      localStorage.setItem("kpc_v42_combo",combo);
      xpPop("Miss",window.innerWidth/2,220);
    }
    setTimeout(()=>{monitorCorrect();makeSequence();smartCoach();},90);
  },true);
  function loop(){makeSequence();smartCoach();monitorCorrect();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{bindFocus();loop();setInterval(loop,700);});
  else{bindFocus();loop();setInterval(loop,700);}
})();
