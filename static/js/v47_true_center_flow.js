// V47 True Center Flow + Symbol Guide
// UI only. Does not change backend, level data, XP/progress calculations, or routes.

(function(){
  var state = {
    text: "",
    index: 0,
    lastSeed: "",
    combo: 0
  };

  var shiftMap = {
    "!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0",
    "_":"-","+":"=",":":";","\"":"'","<":",",">":".","?":"/","{":"[","}":"]","|":"\\","~":"`"
  };

  var symbolLabel = {
    "!":"SHIFT + 1","@":"SHIFT + 2","#":"SHIFT + 3","$":"SHIFT + 4","%":"SHIFT + 5","^":"SHIFT + 6","&":"SHIFT + 7","*":"SHIFT + 8","(":"SHIFT + 9",")":"SHIFT + 0",
    "_":"SHIFT + -","+":"SHIFT + =",":":"SHIFT + ;","\"":"SHIFT + '","<":"SHIFT + ,",">":"SHIFT + .","?":"SHIFT + /","{":"SHIFT + [","}":"SHIFT + ]","|":"SHIFT + \\","~":"SHIFT + `",
    ",":",",".":".","/":"/",";":";","'":"'","[":"[","]":"]","-":"-","=":"=","`":"`"
  };

  function targetEl(){
    return document.getElementById("targetKey");
  }

  function cleanText(s){
    if(!s) return "";
    return String(s).replace(/\s+/g," ").trim();
  }

  function htmlChar(ch){
    if(ch === " ") return "␣";
    if(ch === "&") return "&amp;";
    if(ch === "<") return "&lt;";
    if(ch === ">") return "&gt;";
    if(ch === '"') return "&quot;";
    if(ch === "'") return "&#39;";
    return ch;
  }

  function seed(){
    var el = targetEl();
    if(!el) return;

    // If original logic changed target and our markup not active yet, seed.
    var raw = el.getAttribute("data-v47-source");
    var visible = cleanText(el.textContent || "");

    if(!raw){
      raw = visible;
      el.setAttribute("data-v47-source", raw);
    }

    // Avoid seeding from our rendered text.
    if(!el.classList.contains("v47-flow-active")){
      raw = visible;
    }

    if(raw && raw !== state.lastSeed){
      state.text = raw;
      state.index = 0;
      state.lastSeed = raw;
      el.setAttribute("data-v47-source", raw);
    }
  }

  function getCurrent(){
    if(!state.text) return "";
    return state.text[Math.min(state.index, state.text.length - 1)] || "";
  }

  function makeChars(str, cls){
    var out = "";
    for(var i=0;i<str.length;i++){
      var ch = str[i];
      out += '<span class="v47-flow-char '+(ch===" "?"space ":"")+cls+'">'+htmlChar(ch)+'</span>';
    }
    return out;
  }

  function wordRange(){
    var t = state.text || "";
    var i = state.index || 0;
    var left = t.lastIndexOf(" ", Math.max(0, i-1)) + 1;
    var right = t.indexOf(" ", i);
    if(right === -1) right = t.length;
    return {left:left,right:right,word:t.slice(left,right)};
  }

  function render(){
    seed();
    var el = targetEl();
    if(!el || !state.text) return;

    el.classList.add("v47-flow-active");

    var t = state.text;
    var i = Math.min(state.index, Math.max(0, t.length - 1));
    var past = t.slice(Math.max(0, i - 8), i);
    var current = t[i] || "";
    var future = t.slice(i + 1, Math.min(t.length, i + 10));
    var wr = wordRange();

    var guide = symbolLabel[current] || (current === " " ? "SPACE" : "Press " + current);
    var guideText = current && shiftMap[current] ? guide : (current === " " ? "SPACE" : "Press " + htmlChar(current));

    el.innerHTML =
      '<div class="v47-flow-stage">' +
        '<div class="v47-flow-line"></div>' +
        '<div class="v47-flow-window">' +
          '<div class="v47-past">' + makeChars(past, "done") + '</div>' +
          '<div class="v47-current">' + htmlChar(current) + '</div>' +
          '<div class="v47-future">' + makeChars(future, "future") + '</div>' +
        '</div>' +
        '<div class="v47-symbol-guide">' + htmlChar(guideText) + '</div>' +
      '</div>';

    updateKeyboard(current);
    updateCoachText(current, guide);
  }

  function findKey(ch){
    var base = shiftMap[ch] || String(ch).toLowerCase();
    var keys = document.querySelectorAll("#keyboard .key");
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      var tx = (k.textContent || "").trim().toLowerCase();
      if(k.dataset && k.dataset.key === base) return k;
      if(tx === base) return k;
    }
    return null;
  }

  function updateKeyboard(ch){
    var keys = document.querySelectorAll("#keyboard .key");
    for(var i=0;i<keys.length;i++){
      keys[i].classList.remove("v47-current-key","v47-symbol-key","v47-shift-key");
    }

    var main = findKey(ch);
    if(main) main.classList.add(shiftMap[ch] ? "v47-symbol-key" : "v47-current-key");

    if(shiftMap[ch]){
      // Highlight visible Shift key if present.
      for(var j=0;j<keys.length;j++){
        var tx = (keys[j].textContent || "").trim().toLowerCase();
        if(tx === "shift"){
          keys[j].classList.add("v47-shift-key");
        }
      }
    }
  }

  function updateCoachText(ch, guide){
    var feedback = document.getElementById("feedbackText");
    var finger = document.getElementById("fingerName");
    var coach = document.getElementById("v43CoachLine");
    var base = ch === " " ? "SPACE" : ch;
    var msg = shiftMap[ch] ? ("Type \""+ch+"\" using " + guide) : ("Press \""+base+"\". Accuracy before speed.");
    if(feedback) feedback.textContent = msg;
    if(coach) coach.textContent = msg;
    if(finger && shiftMap[ch]) finger.textContent = guide;
  }

  function xpPop(txt){
    var p = document.createElement("div");
    p.className = "v47-xp";
    p.textContent = txt;
    p.style.left = (window.innerWidth/2) + "px";
    p.style.top = "210px";
    document.body.appendChild(p);
    setTimeout(function(){ p.remove(); }, 850);
  }

  function comboPop(){
    var c = document.querySelector(".v47-combo");
    if(!c){
      c = document.createElement("div");
      c.className = "v47-combo";
      document.body.appendChild(c);
    }
    c.textContent = "🔥 Combo x" + state.combo;
    if(state.combo >= 3){
      c.classList.add("show");
      clearTimeout(c.__timer);
      c.__timer = setTimeout(function(){ c.classList.remove("show"); }, 1300);
    }
  }

  function onKey(e){
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key.length !== 1 && e.key !== " ") return;

    var expected = getCurrent();
    if(!expected) return;

    var typed = e.key === " " ? " " : e.key;
    if(String(typed).toLowerCase() === String(expected).toLowerCase()){
      state.index = Math.min(state.index + 1, state.text.length - 1);
      state.combo += 1;
      xpPop("+XP");
      comboPop();
      render();
    }else{
      state.combo = 0;
      comboPop();
      xpPop("Miss");
    }
  }

  function bind(){
    seed();
    render();

    document.addEventListener("keydown", function(e){
      onKey(e);
      setTimeout(render, 60);
    }, true);

    setInterval(function(){
      var el = targetEl();
      if(!el) return;
      // If lesson logic rewrites target outside V47, reseed.
      if(!el.classList.contains("v47-flow-active")){
        seed();
      }
      render();
    }, 900);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  }else{
    bind();
  }
})();
