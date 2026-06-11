// V37 Theme Picker UI only
(function(){
  const saved = localStorage.getItem("kpc_v37_theme") || "galaxy";
  document.body.setAttribute("data-v37-theme", saved);
  function bind(){
    document.querySelectorAll(".v37-theme-grid button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.theme === saved);
      btn.addEventListener("click", ()=>{
        localStorage.setItem("kpc_v37_theme", btn.dataset.theme);
        document.body.setAttribute("data-v37-theme", btn.dataset.theme);
        document.querySelectorAll(".v37-theme-grid button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
