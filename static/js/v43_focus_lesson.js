
(function(){
  const shiftSymbols={"!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0","_":"-","+":"=",":":";","?":"/","\"":"'","{":"[","}":"]","|":"\\","<":",",">":"."};
  let combo=0,lastCorrect=Number(localStorage.getItem("kpc_academy_correct")||0),lastTarget="";
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  function targetText(){const t=document.getElementById("targetKey");return t?(t.textContent||"").replace(/\s+/g," ").trim():""}
  function currentChar(){const t=targetText();if(!t)return "";if(t==="SPACE"||t==="␣")return " ";return t[0]||""}

  const symbolNames={"!":"exclamation mark","@":"at sign","#":"hash","$":"dollar sign","%":"percent","^":"caret","&":"ampersand","*":"asterisk","(":"left parenthesis",")":"right parenthesis","_":"underscore","+":"plus","{":"left brace","}":"right brace","|":"vertical bar",":":"colon","\"":"double quote","<":"less than",">":"greater than","?":"question mark"};
  const symbolFingerHints={"1":"Left Pinky","2":"Left Ring","3":"Left Middle","4":"Left Index","5":"Left Index","6":"Right Index","7":"Right Index","8":"Right Middle","9":"Right Ring","0":"Right Pinky","-":"Right Pinky","=":"Right Pinky","[":"Right Pinky","]":"Right Pinky","\\":"Right Pinky",";":"Right Pinky","'":"Right Pinky",",":"Right Middle",".":"Right Ring","/":"Right Pinky"};
  function isShiftSymbol(ch){return Object.prototype.hasOwnProperty.call(shiftSymbols,ch)}
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
  function comboText(ch){return isShiftSymbol(ch)?`Shift + ${shiftSymbols[ch]}`:""}
  function ensureShiftKeys(){
    const kb=document.getElementById("keyboard"); if(!kb||kb.__kpcShiftReady)return;
    const rows=[...kb.querySelectorAll(".key-row")]; const bottom=rows[3]; if(!bottom)return;
    const left=document.createElement("div"), right=document.createElement("div");
    left.className="key v49-shift-key v49-left-shift"; left.dataset.key="shift-left"; left.textContent="SHIFT";
    right.className="key v49-shift-key v49-right-shift"; right.dataset.key="shift-right"; right.textContent="SHIFT";
    bottom.insertBefore(left,bottom.firstChild); bottom.appendChild(right); kb.__kpcShiftReady=true;
  }
  function ensureSymbolGuide(){
    const focus=document.querySelector(".v43-focus"); if(!focus)return null;
    let guide=document.getElementById("v49SymbolGuide");
    if(!guide){
      guide=document.createElement("section"); guide.id="v49SymbolGuide"; guide.className="v49-symbol-guide";
      guide.innerHTML=`<div class="v49-symbol-main"><div class="v49-symbol-badge">⌨️ SYMBOL GUIDE</div><div class="v49-symbol-formula">Normal key lesson</div><div class="v49-symbol-detail">When a symbol appears, this box will show the exact key combination and finger.</div></div><div class="v49-symbol-actions"><button id="v49VoiceBtn" type="button">🔇 Voice Off</button><button id="v49SheetBtn" type="button">📖 All Symbols</button></div><div id="v49SymbolSheet" class="v49-symbol-sheet hidden"></div>`;
      const inputPanel=document.querySelector(".v43-input-panel");
      if(inputPanel)focus.insertBefore(guide,inputPanel); else focus.appendChild(guide);
      const voiceBtn=guide.querySelector("#v49VoiceBtn");
      const sheetBtn=guide.querySelector("#v49SheetBtn");
      const sheet=guide.querySelector("#v49SymbolSheet");
      const voiceOn=localStorage.getItem("kpc_v49_voice")==="1"; voiceBtn.textContent=voiceOn?"🔊 Voice On":"🔇 Voice Off";
      voiceBtn.onclick=()=>{const on=localStorage.getItem("kpc_v49_voice")==="1";localStorage.setItem("kpc_v49_voice",on?"0":"1");voiceBtn.textContent=on?"🔇 Voice Off":"🔊 Voice On";};
      sheet.innerHTML=Object.keys(shiftSymbols).map(sym=>`<div><b>${escapeHtml(sym)}</b><span>Shift + ${escapeHtml(shiftSymbols[sym])}</span></div>`).join("");
      sheetBtn.onclick=()=>sheet.classList.toggle("hidden");
    }
    return guide;
  }
  function showSymbolGuide(){
    ensureShiftKeys();
    const guide=ensureSymbolGuide(); if(!guide)return;
    const ch=currentChar(); const formula=guide.querySelector(".v49-symbol-formula"), detail=guide.querySelector(".v49-symbol-detail");
    document.querySelectorAll("#keyboard .v49-shift-active").forEach(k=>k.classList.remove("v49-shift-active"));
    if(isShiftSymbol(ch)){
      const base=shiftSymbols[ch], finger=symbolFingerHints[base]||"Correct finger", shiftSide=(base&&"12345".includes(base))?"Right Pinky":"Left Pinky";
      formula.innerHTML=`<span>${escapeHtml(ch)}</span> = <b>Shift + ${escapeHtml(base)}</b>`;
      detail.innerHTML=`Hold <b>${shiftSide} Shift</b>, then press <b>${escapeHtml(base)}</b> with <b>${finger}</b>. ${symbolNames[ch]?`Symbol name: <b>${symbolNames[ch]}</b>.`:""}`;
      document.querySelectorAll("#keyboard .v49-shift-key").forEach(k=>k.classList.add("v49-shift-active"));
      guide.classList.add("active");
    }else{
      formula.textContent=ch===" "?"SPACE works normally":"Normal key lesson";
      detail.textContent=ch===" "?"Press the long SPACE bar with your thumb.":"No Shift needed for this key.";
      guide.classList.remove("active");
    }
  }
  let lastVoiceTarget="";
  function voiceSymbolGuide(){
    if(localStorage.getItem("kpc_v49_voice")!=="1")return;
    const ch=currentChar(); if(!isShiftSymbol(ch)||lastVoiceTarget===ch)return; lastVoiceTarget=ch;
    if(!("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(`Press shift and ${shiftSymbols[ch]}. ${symbolNames[ch]||"symbol"}.`); u.rate=.86; u.pitch=1; window.speechSynthesis.speak(u);
  }
  function explainWrongKey(typed){
    const ch=currentChar(); if(!isShiftSymbol(ch))return;
    const f=document.getElementById("feedbackText"), coach=document.getElementById("v43CoachLine"), msg=`❌ Wrong key. ${ch} requires Shift + ${shiftSymbols[ch]}. Hold Shift, then press ${shiftSymbols[ch]}.`;
    if(f)f.textContent=msg; if(coach)coach.textContent=msg;
    const g=ensureSymbolGuide(); if(g){const d=g.querySelector(".v49-symbol-detail"); if(d)d.innerHTML=`<b style="color:#fca5a5">${escapeHtml(msg)}</b>`;}
  }
  function makePreview(){const target=document.getElementById("targetKey");if(!target)return;const t=targetText();if(!t||t==="SPACE")return;if(t.length===1&&t!==lastTarget){lastTarget=t;target.innerHTML=[t,t,t,t,t,t,t].map((c,i)=>`<span class="${i===0?'now':''}">${c}</span>`).join("")}}
  function findKey(ch){const base=shiftSymbols[ch]||ch.toLowerCase();return [...document.querySelectorAll("#keyboard .key")].find(k=>k.dataset.key===base||k.textContent.trim().toLowerCase()===base)}
  function syncGhost(){const ch=currentChar(),key=findKey(ch);document.querySelectorAll(".v43-current-key").forEach(k=>k.classList.remove("v43-current-key"));if(key)key.classList.add("v43-current-key");const ghost=document.getElementById("v43GhostFinger");if(!ghost||!key)return;const r=key.getBoundingClientRect();ghost.style.left=(r.left+r.width/2)+"px";ghost.style.top=(r.top-8)+"px";ghost.classList.add("show")}
  function syncProgress(){const completed=JSON.parse(localStorage.getItem("kpc_v35_completed")||"[]"),level=Number(localStorage.getItem("kpc_v35_level")||0)+1,pct=Math.min(100,Math.round((completed.length/25)*100));set("v43ProgressText",pct+"%");set("v43ProgressLabel",`Level ${level} Progress`);const bar=document.getElementById("v43ProgressBar");if(bar)bar.style.width=pct+"%";set("v43DashXP",localStorage.getItem("kpc_academy_xp")||"0");set("v43DashAccuracy",document.getElementById("accuracyValue")?.textContent||"100%")}
  function smartCoach(){const f=document.getElementById("feedbackText"),finger=document.getElementById("fingerName"),coach=document.getElementById("v43CoachLine"),ch=currentChar(),ft=(finger?.textContent||"correct finger").toLowerCase();let msg=ch?`Press "${ch===" "?"SPACE":ch}" slowly. Use ${ft}. Accuracy before speed.`:"Watch the highlighted key.";if(isShiftSymbol(ch))msg=`Press Shift + ${shiftSymbols[ch]} for "${ch}". Use ${symbolFingerHints[shiftSymbols[ch]]||ft} on ${shiftSymbols[ch]}.`;if(f)f.textContent=msg;if(coach)coach.textContent=msg}
  function xpPop(label,x,y){const p=document.createElement("div");p.className="v43-xp-pop";p.textContent=label;p.style.left=(x||window.innerWidth/2)+"px";p.style.top=(y||260)+"px";document.body.appendChild(p);setTimeout(()=>p.remove(),850)}
  function comboPop(){let c=document.querySelector(".v43-combo-pop");if(!c){c=document.createElement("div");c.className="v43-combo-pop";document.body.appendChild(c)}c.textContent=`🔥 Combo x${combo}`;set("v43Combo",combo);if(combo>=3){c.classList.add("show");clearTimeout(c.__timer);c.__timer=setTimeout(()=>c.classList.remove("show"),1300)}}
  function keyCenter(){const k=document.querySelector(".v43-current-key")||document.querySelector("#keyboard .key.active");if(!k)return{x:window.innerWidth/2,y:260};const r=k.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top}}
  function monitorXP(){const now=Number(localStorage.getItem("kpc_academy_correct")||0);if(now>lastCorrect){combo++;const p=keyCenter();xpPop("+4 XP",p.x,p.y);comboPop();lastCorrect=now}}
  function bind(){document.addEventListener("keydown",e=>{const ch=currentChar(),typed=e.key===" "?" ":e.key;if(ch&&typed&&typed.length===1&&typed!==ch){combo=0;comboPop();xpPop("Miss",window.innerWidth/2,230);explainWrongKey(typed)}setTimeout(()=>{makePreview();syncGhost();monitorXP();smartCoach();syncProgress();showSymbolGuide();voiceSymbolGuide()},90)},true);const n=document.getElementById("nextLessonBtn"),r=document.getElementById("restartLessonBtn");const pn=document.getElementById("v43PopupNext"),pr=document.getElementById("v43PopupRetry");if(pn&&n)pn.onclick=()=>n.click();if(pr&&r)pr.onclick=()=>r.click()}
  function loop(){makePreview();syncGhost();syncProgress();smartCoach();monitorXP();showSymbolGuide();voiceSymbolGuide()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{bind();loop();setInterval(loop,700);document.getElementById("academyInput")?.focus()});else{bind();loop();setInterval(loop,700);document.getElementById("academyInput")?.focus()}
})();
