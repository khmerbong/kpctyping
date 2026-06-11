
(function(){
  "use strict";
  function csrf(){
    const el=document.querySelector('input[name="csrf_token"]');
    const meta=document.querySelector('meta[name="csrf-token"]');
    return el ? el.value : (meta ? meta.content : "");
  }
  function readLocalPayload(){
    let weak={}; let completed=[]; let history=[];
    try{weak=JSON.parse(localStorage.getItem("kpc_v25_weak_keys")||"{}")}catch(e){}
    try{completed=JSON.parse(localStorage.getItem("kpc_v35_completed")||"[]")}catch(e){}
    try{history=JSON.parse(localStorage.getItem("kpc_typing_history")||"[]")}catch(e){}
    return {
      xp:Number(localStorage.getItem("kpc_academy_xp")||0),
      level:Number(localStorage.getItem("kpc_v35_level")||0),
      completed,
      weakKeys:weak,
      history,
      lastWpm:Number(localStorage.getItem("kpc_last_wpm")||0),
      updatedAt:new Date().toISOString()
    };
  }
  async function sync(){
    const status=document.getElementById("syncStatus");
    if(status) status.textContent="Syncing...";
    const payload=readLocalPayload();
    const progress=await fetch("/api/user/sync",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf()},body:JSON.stringify({type:"progress",payload})});
    const analytics=await fetch("/api/user/sync",{method:"POST",headers:{"Content-Type":"application/json","X-CSRFToken":csrf()},body:JSON.stringify({type:"analytics",payload})});
    const out={progress:await progress.json(),analytics:await analytics.json()};
    if(status) status.textContent=JSON.stringify(out,null,2);
    if(out.progress && out.progress.ok) setTimeout(()=>location.reload(),900);
  }
  document.addEventListener("DOMContentLoaded",function(){
    const btn=document.getElementById("syncProgressBtn");
    if(btn) btn.addEventListener("click",sync);
  });
})();
