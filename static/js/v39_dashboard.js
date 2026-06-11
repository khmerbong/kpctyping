// V39 UI sync only. Typing logic remains in training_academy.js
(function(){
  const saved = localStorage.getItem("kpc_v39_theme") || "galaxy";
  document.body.setAttribute("data-v39-theme", saved);

  function syncUI(){
    const level = Number(localStorage.getItem("kpc_v35_level") || 0) + 1;
    const completed = JSON.parse(localStorage.getItem("kpc_v35_completed") || "[]");
    const pct = Math.min(100, Math.round((completed.length / 25) * 100));
    const bestStreak = localStorage.getItem("kpc_best_streak") || localStorage.getItem("kpc_academy_streak") || "0";
    const set=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};
    set("v39LevelNo", level);
    set("v39TopStreak", bestStreak);
    set("v39TopPercent", pct + "%");
    const bar=document.getElementById("v39TopBar"); if(bar) bar.style.width=pct+"%";

    const target=document.getElementById("targetKey");
    const hero=document.getElementById("v39HeroKeys");
    if(target && hero){
      hero.textContent = target.textContent.replace(/\s+/g," ").trim().slice(0,24) || "START";
    }
  }

  function bindTheme(){
    document.querySelectorAll(".v39-theme-grid button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.theme === saved);
      btn.onclick=()=>{
        localStorage.setItem("kpc_v39_theme", btn.dataset.theme);
        document.body.setAttribute("data-v39-theme", btn.dataset.theme);
        document.querySelectorAll(".v39-theme-grid button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
      };
    });
    document.querySelector(".v39-apply")?.addEventListener("click",()=>alert("Theme saved ✅"));
    document.getElementById("v39NormalBtn")?.addEventListener("click",()=>{
      document.getElementById("v39NormalBtn").classList.add("active");
      document.getElementById("memoryModeBtn")?.classList.remove("active");
    });
    document.getElementById("memoryModeBtn")?.addEventListener("click",()=>{
      document.getElementById("memoryModeBtn").classList.add("active");
      document.getElementById("v39NormalBtn")?.classList.remove("active");
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{bindTheme(); syncUI(); setInterval(syncUI, 800);});
  }else{bindTheme(); syncUI(); setInterval(syncUI, 800);}
})();
