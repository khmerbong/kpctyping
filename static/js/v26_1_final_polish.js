// V26.1 Final Polish: safe defaults and lightweight QA helpers.
(function(){
  const DEFAULT_THEME="clean-light";
  const DEFAULT_SKIN="classic";

  function ensureDefaults(){
    try{
      if(!localStorage.getItem("kpc_v26_theme")) localStorage.setItem("kpc_v26_theme", DEFAULT_THEME);
      if(!localStorage.getItem("kpc_v26_key_skin")) localStorage.setItem("kpc_v26_key_skin", DEFAULT_SKIN);
    }catch(e){}
  }

  function markReady(){
    document.documentElement.classList.add("kpc-final-ready");
    document.body.classList.add("kpc-final-ready");
  }

  function compactThemePanelOnMobile(){
    const panel=document.getElementById("v26ThemeCenter");
    if(!panel) return;
    const head=panel.querySelector(".v26-theme-head");
    if(!head || head.dataset.kpcFinalBound==="1") return;
    head.dataset.kpcFinalBound="1";
    head.addEventListener("click", function(ev){
      if(window.innerWidth<=768 && !ev.target.closest("button")){
        panel.classList.toggle("collapsed");
        try{localStorage.setItem("kpc_v26_panel_collapsed", panel.classList.contains("collapsed")?"1":"0");}catch(e){}
      }
    });
  }

  function run(){
    ensureDefaults();
    markReady();
    compactThemePanelOnMobile();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
