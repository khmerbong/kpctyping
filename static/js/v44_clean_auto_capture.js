// V44 Clean Auto Capture Patch
// Keeps original training_academy.js logic untouched.
// Purpose: keep the hidden input focused so user can type without clicking the box.

(function(){
  function getInput(){
    return document.getElementById("academyInput");
  }

  function getStatus(){
    return document.getElementById("v44CleanStatus");
  }

  function focusInput(){
    var el = getInput();
    if(!el) return;
    try{
      el.focus({preventScroll:true});
    }catch(e){
      try{ el.focus(); }catch(err){}
    }
  }

  function setStatus(text){
    var s = getStatus();
    if(!s) return;
    s.textContent = text;
    s.classList.add("active");
    clearTimeout(s.__timer);
    s.__timer = setTimeout(function(){
      s.textContent = "⌨️ Just Type — Keyboard Ready";
    }, 700);
  }

  function flash(key){
    var s = getStatus();
    if(!s) return;
    var r = s.getBoundingClientRect();
    var f = document.createElement("div");
    f.className = "v44-clean-flash";
    f.textContent = key === " " ? "SPACE" : key;
    f.style.left = (r.left + r.width / 2 - 20) + "px";
    f.style.top = (r.top - 6) + "px";
    document.body.appendChild(f);
    setTimeout(function(){ f.remove(); }, 600);
  }

  function bind(){
    var el = getInput();
    if(el){
      el.setAttribute("autocomplete","off");
      el.setAttribute("spellcheck","false");

      el.addEventListener("keydown", function(e){
        if(e.key.length === 1 || e.key === " "){
          setStatus("Typing captured ✓");
          flash(e.key);
        }
      }, true);
    }

    focusInput();
    setStatus("⌨️ Ready — just type");

    document.addEventListener("click", function(){
      setTimeout(focusInput, 30);
    }, true);

    document.addEventListener("keydown", function(){
      setTimeout(focusInput, 10);
    }, true);

    setInterval(focusInput, 900);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  }else{
    bind();
  }
})();
