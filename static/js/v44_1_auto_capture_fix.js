// V44.1 Render Safe Auto Capture Typing
(function(){
  var forwarding = false;

  function getInput(){
    return document.getElementById("academyInput");
  }

  function getStatus(){
    return document.getElementById("v441TypeStatus");
  }

  function focusInput(){
    var el = getInput();
    if(!el) return;
    if(document.activeElement !== el){
      try{
        el.focus({preventScroll:true});
      }catch(err){
        try{ el.focus(); }catch(e){}
      }
    }
  }

  function setStatus(text){
    var s = getStatus();
    if(!s) return;
    s.textContent = text;
    s.classList.add("ready");
    clearTimeout(s.__timer);
    s.__timer = setTimeout(function(){
      s.textContent = "⌨️ Keyboard Focus Active — Just Type";
    }, 900);
  }

  function flashKey(key){
    var s = getStatus();
    if(!s) return;
    var rect = s.getBoundingClientRect();
    var f = document.createElement("div");
    f.className = "v441-key-flash";
    f.textContent = key === " " ? "SPACE" : key;
    f.style.left = (rect.left + rect.width / 2 - 20) + "px";
    f.style.top = (rect.top - 8) + "px";
    document.body.appendChild(f);
    setTimeout(function(){ f.remove(); }, 600);
  }

  function forwardToInput(e){
    var el = getInput();
    if(!el || forwarding) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key.length !== 1 && e.key !== " ") return;

    if(document.activeElement === el) return;

    e.preventDefault();
    forwarding = true;

    var ev;
    try{
      ev = new KeyboardEvent("keydown", {
        key: e.key,
        code: e.code,
        bubbles: true,
        cancelable: true,
        shiftKey: e.shiftKey
      });
    }catch(err){
      ev = document.createEvent("KeyboardEvent");
      ev.initKeyboardEvent("keydown", true, true, window, e.key, 0, "", false, "");
    }

    el.dispatchEvent(ev);
    forwarding = false;
    flashKey(e.key);
  }

  function bind(){
    var el = getInput();
    if(el){
      el.setAttribute("autocomplete","off");
      el.setAttribute("spellcheck","false");
      el.setAttribute("aria-hidden","true");
      el.setAttribute("tabindex","-1");

      el.addEventListener("keydown", function(e){
        if(e.key.length === 1 || e.key === " "){
          setStatus("Typing captured ✓");
          flashKey(e.key);
        }
      }, true);
    }

    focusInput();
    setStatus("⌨️ Ready — just type");

    document.addEventListener("click", function(){
      setTimeout(focusInput, 20);
    }, true);

    document.addEventListener("keydown", forwardToInput, true);

    setInterval(focusInput, 800);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  }else{
    bind();
  }
})();
