// V40 Interactive Keyboard Coach - preserves existing 25-level logic
(function(){
  const fingerNames = {
    "q":"LEFT PINKY","a":"LEFT PINKY","z":"LEFT PINKY","1":"LEFT PINKY","!":"LEFT PINKY",
    "w":"LEFT RING","s":"LEFT RING","x":"LEFT RING","2":"LEFT RING","@":"LEFT RING",
    "e":"LEFT MIDDLE","d":"LEFT MIDDLE","c":"LEFT MIDDLE","3":"LEFT MIDDLE","#":"LEFT MIDDLE",
    "r":"LEFT INDEX","t":"LEFT INDEX","f":"LEFT INDEX","g":"LEFT INDEX","v":"LEFT INDEX","b":"LEFT INDEX","4":"LEFT INDEX","5":"LEFT INDEX","$":"LEFT INDEX","%":"LEFT INDEX",
    "y":"RIGHT INDEX","u":"RIGHT INDEX","h":"RIGHT INDEX","j":"RIGHT INDEX","n":"RIGHT INDEX","m":"RIGHT INDEX","6":"RIGHT INDEX","7":"RIGHT INDEX","^":"RIGHT INDEX","&":"RIGHT INDEX",
    "i":"RIGHT MIDDLE","k":"RIGHT MIDDLE","8":"RIGHT MIDDLE","*":"RIGHT MIDDLE",
    "o":"RIGHT RING","l":"RIGHT RING",".":"RIGHT RING","9":"RIGHT RING","(":"RIGHT RING",
    "p":"RIGHT PINKY",";":"RIGHT PINKY","/":"RIGHT PINKY","0":"RIGHT PINKY",")":"RIGHT PINKY","'":"RIGHT PINKY","\"":"RIGHT PINKY","[":"RIGHT PINKY","]":"RIGHT PINKY","-":"RIGHT PINKY","=":"RIGHT PINKY","\\":"RIGHT PINKY",
    " ":"THUMB"
  };
  const shiftSymbols = {"!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0","_":"-","+":"=",":":";","?":"/","\"":"'","{":"[","}":"]","|":"\\"};

  let voiceOn = localStorage.getItem("kpc_v40_voice") === "1";
  let slowOn = localStorage.getItem("kpc_v40_slow") === "1";

  function getTargetChar(){
    const target = document.getElementById("targetKey");
    if(!target) return "";
    const now = target.querySelector(".now");
    let text = (now ? now.textContent : target.textContent || "").trim();
    if(text === "SPACE" || text === "␣") return " ";
    return text[0] || "";
  }

  function findKeyElement(ch){
    const base = shiftSymbols[ch] || ch.toLowerCase();
    return [...document.querySelectorAll(".key")].find(k => k.dataset.key === base || k.textContent.trim().toLowerCase() === base);
  }

  function speak(text){
    if(!voiceOn || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = slowOn ? 0.72 : 0.92;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }

  function showBubble(text, keyEl){
    let bubble = document.querySelector(".v40-coach-bubble");
    if(!bubble){
      bubble = document.createElement("div");
      bubble.className = "v40-coach-bubble";
      document.body.appendChild(bubble);
    }
    bubble.textContent = text;
    const rect = keyEl ? keyEl.getBoundingClientRect() : {left: window.innerWidth/2, top: 170, width:0};
    bubble.style.left = Math.min(window.innerWidth - 320, Math.max(12, rect.left - 80)) + "px";
    bubble.style.top = Math.max(12, rect.top - 76) + "px";
    bubble.classList.add("show");
    clearTimeout(bubble.__timer);
    bubble.__timer = setTimeout(()=>bubble.classList.remove("show"), 1700);
  }

  function showPointer(keyEl){
    let pointer = document.querySelector(".v40-finger-pointer");
    if(!pointer){
      pointer = document.createElement("div");
      pointer.className = "v40-finger-pointer";
      document.body.appendChild(pointer);
    }
    if(!keyEl){ pointer.classList.remove("show"); return; }
    const r = keyEl.getBoundingClientRect();
    pointer.style.left = (r.left + r.width/2) + "px";
    pointer.style.top = (r.top - 10) + "px";
    pointer.classList.add("show");
  }

  function trail(keyEl){
    if(!keyEl) return;
    const r = keyEl.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "v40-key-trail";
    dot.style.left = (r.left + r.width/2 - 10) + "px";
    dot.style.top = (r.top + r.height/2 - 10) + "px";
    document.body.appendChild(dot);
    setTimeout(()=>dot.remove(), 700);
  }

  function updateCoach(){
    const ch = getTargetChar();
    const keyEl = findKeyElement(ch);
    document.querySelectorAll(".v40-key-focus").forEach(x=>x.classList.remove("v40-key-focus"));
    if(keyEl) keyEl.classList.add("v40-key-focus");
    showPointer(keyEl);

    const finger = fingerNames[ch] || fingerNames[ch.toLowerCase()] || fingerNames[shiftSymbols[ch]] || "correct finger";
    const needShift = ch && (ch !== ch.toLowerCase() || !!shiftSymbols[ch]) && ch !== " ";
    const keyName = ch === " " ? "SPACE" : ch;
    const text = needShift ? `Hold SHIFT and press ${keyName} with ${finger}` : `Press ${keyName} with ${finger}`;
    const coachText = document.getElementById("v40CoachText");
    if(coachText) coachText.textContent = text;
    return {text, keyEl};
  }

  function replay(){
    const {text, keyEl} = updateCoach();
    showBubble(text, keyEl);
    trail(keyEl);
    speak(text);
  }

  function bind(){
    document.body.classList.toggle("v40-slow-mode", slowOn);
    const voiceBtn = document.getElementById("v40VoiceBtn");
    const replayBtn = document.getElementById("v40ReplayBtn");
    const slowBtn = document.getElementById("v40SlowBtn");
    if(voiceBtn){
      voiceBtn.classList.toggle("active", voiceOn);
      voiceBtn.onclick = () => {
        voiceOn = !voiceOn;
        localStorage.setItem("kpc_v40_voice", voiceOn ? "1" : "0");
        voiceBtn.classList.toggle("active", voiceOn);
        replay();
      };
    }
    if(replayBtn) replayBtn.onclick = replay;
    if(slowBtn){
      slowBtn.classList.toggle("active", slowOn);
      slowBtn.onclick = () => {
        slowOn = !slowOn;
        localStorage.setItem("kpc_v40_slow", slowOn ? "1" : "0");
        document.body.classList.toggle("v40-slow-mode", slowOn);
        slowBtn.classList.toggle("active", slowOn);
      };
    }

    document.addEventListener("keydown", (e)=>{
      const ch = getTargetChar();
      const typed = e.key === " " ? " " : e.key;
      const keyEl = findKeyElement(typed);
      if(keyEl){
        keyEl.classList.add(typed === ch ? "v40-last-key-correct" : "v40-last-key-wrong");
        trail(keyEl);
        setTimeout(()=>keyEl.classList.remove("v40-last-key-correct","v40-last-key-wrong"), 350);
      }
      setTimeout(updateCoach, 80);
    }, true);

    setInterval(updateCoach, 650);
    setTimeout(replay, 700);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
