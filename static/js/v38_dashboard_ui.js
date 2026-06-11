// V38 UI only. Does not change typing logic.
(function(){
  const saved = localStorage.getItem("kpc_v38_theme") || "galaxy";
  document.body.setAttribute("data-v38-theme", saved);
  function syncStats(){
    const xp = localStorage.getItem("kpc_academy_xp") || "0";
    const streak = localStorage.getItem("kpc_best_streak") || "0";
    const level = localStorage.getItem("kpc_v35_level") || "0";
    const completed = JSON.parse(localStorage.getItem("kpc_v35_completed") || "[]");
    const set=(id,v)=>{const el=document.getElementById(id); if(el) el.textContent=v;};
    set("v38XP", xp); set("v38Streak", streak); set("v38Level", Number(level)+1);
    const pct = Math.min(100, Math.round((completed.length/25)*100));
    set("v38ProgressText", pct+"%");
    const bar=document.getElementById("v38ProgressBar"); if(bar) bar.style.width=pct+"%";
  }
  function bind(){
    syncStats();
    setInterval(syncStats, 1200);
    document.querySelectorAll(".v38-theme-grid button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.theme === saved);
      btn.onclick=()=>{
        localStorage.setItem("kpc_v38_theme", btn.dataset.theme);
        document.body.setAttribute("data-v38-theme", btn.dataset.theme);
        document.querySelectorAll(".v38-theme-grid button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
      };
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
