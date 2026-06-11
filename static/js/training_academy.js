// KPC Typing V35 Real 25-Level Academy
const V35_LEVELS = [
  {level:1, phase:"Home Row", name:"F J D K S", keys:["f","j","d","k","s","f j","d k","s f"], goal:"Master first home-row keys with correct fingers."},
  {level:2, phase:"Home Row", name:"A L ; G H", keys:["a","l",";","g","h","a l","g h","; l"], goal:"Complete the home-row key set."},
  {level:3, phase:"Home Row", name:"Home Row Drill", keys:["fjdks","askl;","dfjks","ghasl","fj fj dk dk"], goal:"Build smooth rhythm across the home row."},
  {level:4, phase:"Home Row", name:"Home Row Words", keys:["sad","fall","ask","dad","glass","half","flash","shall"], goal:"Type short words from home-row keys."},
  {level:5, phase:"Boss", name:"Home Row Boss", keys:["asdf jkl;","fjdk sal;","glass falls","a sad lad asks"], boss:true, unlock:"Zombie Typing", goal:"Pass Home Row Boss to unlock Zombie Typing."},

  {level:6, phase:"Top Row", name:"E I R U W", keys:["e","i","r","u","w","er","ui","we"], goal:"Learn first top-row reach keys."},
  {level:7, phase:"Top Row", name:"O Q P T Y", keys:["o","q","p","t","y","op","ty","qp"], goal:"Finish top-row letters."},
  {level:8, phase:"Top Row", name:"Top Row Drill", keys:["qwert","yuiop","rewit","toyup","we type"], goal:"Mix all top-row keys."},
  {level:9, phase:"Top Row", name:"Top Row Words", keys:["write","power","quiet","type","tower","query","upper"], goal:"Practice words using top-row movement."},
  {level:10, phase:"Boss", name:"Top Row Boss", keys:["we type faster","quiet power","you write words","the top row feels easy"], boss:true, unlock:"Vampire Hunter", goal:"Pass Top Row Boss to unlock Vampire Hunter."},

  {level:11, phase:"Bottom Row", name:"C M X , Z", keys:["c","m","x",",","z","cm","xz",",m"], goal:"Learn bottom-row left and middle keys."},
  {level:12, phase:"Bottom Row", name:". / V B N", keys:[".","/","v","b","n","vb","nm","./"], goal:"Finish bottom-row keys."},
  {level:13, phase:"Bottom Row", name:"Bottom Row Drill", keys:["zxcvb","nm,./","cvbnm","x,z./","box mix"], goal:"Mix bottom-row keys with rhythm."},
  {level:14, phase:"Bottom Row", name:"Bottom Words", keys:["mix","van","box","zoom","comma","move","brave","never"], goal:"Practice useful bottom-row words."},
  {level:15, phase:"Boss", name:"Bottom Row Boss", keys:["move the box","zoom and mix","van moves fast","never miss the comma"], boss:true, unlock:"Space Typing", goal:"Pass Bottom Row Boss to unlock Space Typing."},

  {level:16, phase:"Numbers", name:"1 2 3 4 5", keys:["1","2","3","4","5","12","34","45"], goal:"Learn left number keys."},
  {level:17, phase:"Numbers", name:"6 7 8 9 0", keys:["6","7","8","9","0","67","89","90"], goal:"Learn right number keys."},
  {level:18, phase:"Numbers", name:"Number Words", keys:["2026","1000","90817","12345","67890","Level 25","Score 100"], goal:"Type realistic number patterns."},
  {level:19, phase:"Numbers", name:"Speed Numbers", keys:["15 26 37","404 505","2026 2027","90 80 70","100 200 300"], goal:"Build number-row speed."},
  {level:20, phase:"Boss", name:"Number Boss", keys:["I scored 100 points in 2026.","Type 12345 and 67890 cleanly.","My best WPM is 75."], boss:true, goal:"Pass the number-row exam."},

  {level:21, phase:"Symbols", name:"! @ # $ %", keys:["!","@","#","$","%","!@#","$%"], goal:"Learn first symbol group with SHIFT."},
  {level:22, phase:"Symbols", name:"^ & * ( )", keys:["^","&","*","(",")","^&*","()"], goal:"Learn second symbol group with SHIFT."},
  {level:23, phase:"Symbols", name:"- = [ ] \\", keys:["-","=","[","]","\\","-=[]","[test]"], goal:"Learn brackets and dash keys."},
  {level:24, phase:"Symbols", name:"; ' , . /", keys:[";","'",",",".","/","hello, friend.","yes; no"], goal:"Master punctuation keys."},
  {level:25, phase:"Boss", name:"Symbol Boss", keys:["Symbols: ! @ # $ %","Use commas, periods, and / slashes.","Practice [brackets] and clean punctuation."], boss:true, goal:"Pass the symbol exam."},

  {level:26, phase:"English Sentences", name:"Short Sentences", keys:["I can type fast.","Practice makes progress.","Keep your eyes on the screen.","Slow typing can become fast."], goal:"Move from keys to real sentences."},
  {level:27, phase:"English Sentences", name:"Accuracy First", keys:["Accuracy is better than speed.","Fix mistakes before chasing WPM.","Every clean line builds confidence."], goal:"Practice clean sentence typing."},
  {level:28, phase:"English Sentences", name:"Speed Builder", keys:["The quick typist keeps a steady rhythm.","Small daily practice creates strong speed.","Focus on flow, not panic."], goal:"Build WPM with natural phrases."},
  {level:29, phase:"English Sentences", name:"Real Typing", keys:["Today I will finish one lesson with focus.","My keyboard skill is improving every day.","I can type letters, numbers 123, and symbols!"], goal:"Practice realistic typing lines."},
  {level:30, phase:"Boss", name:"English Boss", keys:["I can type full sentences with speed and accuracy.","The keyboard feels easier when I practice every day.","Clean typing helps me work faster online."], boss:true, goal:"Pass the English sentence exam."},

  {level:31, phase:"Khmer Typing", name:"Khmer Short Words", keys:["ខ្មែរ","សួស្តី","រៀន","វាយ","អក្សរ","លឿន"], goal:"Practice Khmer words."},
  {level:32, phase:"Khmer Typing", name:"Khmer Common Words", keys:["កម្ពុជា","មិត្ត","ថ្ងៃនេះ","មេរៀន","កុំព្យូទ័រ","គេហទំព័រ"], goal:"Practice common Khmer typing words."},
  {level:33, phase:"Khmer Typing", name:"Khmer Sentences 1", keys:["ខ្ញុំកំពុងរៀនវាយអក្សរ។","ការហ្វឹកហាត់រាល់ថ្ងៃធ្វើឲ្យប្រសើរ។","សូមវាយយឺតៗ តែឲ្យត្រូវ។"], goal:"Practice short Khmer sentences."},
  {level:34, phase:"Khmer Typing", name:"Khmer Sentences 2", keys:["ខ្ញុំចង់វាយអក្សរឲ្យលឿនជាងមុន។","មេរៀននេះជួយបង្កើនភាពត្រឹមត្រូវ។","បើខុស ចូរហ្វឹកហាត់គ្រាប់ចុចនោះម្ដងទៀត។"], goal:"Practice longer Khmer sentences."},
  {level:35, phase:"Boss", name:"Khmer Boss", keys:["ខ្ញុំអាចវាយភាសាខ្មែរ និងភាសាអង់គ្លេសបានល្អ។","ការរៀនវាយអក្សរត្រូវការអត់ធ្មត់ និងហ្វឹកហាត់។"], boss:true, goal:"Pass the Khmer typing exam."},

  {level:36, phase:"Mixed Practice", name:"Khmer + English", keys:["KPC Typing ជួយខ្ញុំរៀនវាយអក្សរ។","Practice 15 minutes រាល់ថ្ងៃ។","Accuracy 95% គឺល្អណាស់។"], goal:"Practice mixed Khmer-English typing."},
  {level:37, phase:"Mixed Practice", name:"Weak Key Review", keys:["focus focus focus","slow smooth accurate","repeat weak keys carefully"], goal:"Review weak keys before the final exam."},
  {level:38, phase:"Mixed Practice", name:"Blind Typing", keys:["Do not look at the keyboard.","ចូរមើលអេក្រង់ ហើយវាយដោយស្ងប់។","Keep a steady typing rhythm."], goal:"Practice memory typing."},
  {level:39, phase:"Mixed Practice", name:"Final Practice", keys:["Letters, numbers 12345, symbols !@#, and Khmer អក្សរ.","A strong typist can switch languages smoothly.","Grand Master lesson is almost unlocked."], goal:"Prepare for the final exam."},
  {level:40, phase:"Boss", name:"Keyboard Grand Master", keys:["I can type English and Khmer with focus, speed, and accuracy.","ខ្ញុំអាចរៀនវាយអក្សរបានល្អប្រសើរជារៀងរាល់ថ្ងៃ។","Grand Master typing unlocked."], boss:true, unlock:"Keyboard Grand Master", goal:"Final 40-level master exam."}
];

const fingerMap = {
  "q":"left-pinky","a":"left-pinky","z":"left-pinky","Q":"left-pinky","A":"left-pinky","Z":"left-pinky","1":"left-pinky","!":"left-pinky",
  "w":"left-ring","s":"left-ring","x":"left-ring","W":"left-ring","S":"left-ring","X":"left-ring","2":"left-ring","@":"left-ring",
  "e":"left-middle","d":"left-middle","c":"left-middle","E":"left-middle","D":"left-middle","C":"left-middle","3":"left-middle","#":"left-middle",
  "r":"left-index","t":"left-index","f":"left-index","g":"left-index","v":"left-index","b":"left-index","R":"left-index","T":"left-index","F":"left-index","G":"left-index","V":"left-index","B":"left-index","4":"left-index","5":"left-index","$":"left-index","%":"left-index",
  "y":"right-index","u":"right-index","h":"right-index","j":"right-index","n":"right-index","m":"right-index","Y":"right-index","U":"right-index","H":"right-index","J":"right-index","N":"right-index","M":"right-index","6":"right-index","7":"right-index","^":"right-index","&":"right-index",
  "i":"right-middle","k":"right-middle",",":"right-middle","I":"right-middle","K":"right-middle","8":"right-middle","*":"right-middle",
  "o":"right-ring","l":"right-ring",".":"right-ring","O":"right-ring","L":"right-ring","9":"right-ring","(":"right-ring",
  "p":"right-pinky",";":"right-pinky","/":"right-pinky","P":"right-pinky",":":"right-pinky","?":"right-pinky","0":"right-pinky",")":"right-pinky","'":"right-pinky","\"":"right-pinky","[":"right-pinky","]":"right-pinky","-":"right-pinky","_":"right-pinky","+":"right-pinky","=":"right-pinky","\\":"right-pinky",
  " ":"thumb"
};
const shiftSymbols = {"!":"1","@":"2","#":"3","$":"4","%":"5","^":"6","&":"7","*":"8","(":"9",")":"0","_":"-","+":"=",":":";","?":"/","\"":"'","{":"[","}":"]","|":"\\"};
const fingerNameMap = {"left-pinky":"LEFT PINKY","left-ring":"LEFT RING","left-middle":"LEFT MIDDLE","left-index":"LEFT INDEX","right-index":"RIGHT INDEX","right-middle":"RIGHT MIDDLE","right-ring":"RIGHT RING","right-pinky":"RIGHT PINKY","thumb":"THUMB / SPACE"};
const zoneMap = {"left-pinky":"pinky-zone","right-pinky":"pinky-zone","left-ring":"ring-zone","right-ring":"ring-zone","left-middle":"middle-zone","right-middle":"middle-zone","left-index":"index-zone","right-index":"index-zone","thumb":"thumb-zone"};
const rows = [["`","1","2","3","4","5","6","7","8","9","0","-","="],["q","w","e","r","t","y","u","i","o","p","[","]","\\"],["a","s","d","f","g","h","j","k","l",";","'"],["z","x","c","v","b","n","m",",",".","/"],[" "]];

const $ = id => document.getElementById(id);
const keyboard=$("keyboard"), targetKey=$("targetKey"), fingerName=$("fingerName"), input=$("academyInput"), feedback=$("feedbackText"), coach=$("coachText"), xpValue=$("xpValue"), accuracyValue=$("accuracyValue"), streakValue=$("streakValue"), lessonName=$("lessonName"), phaseName=$("phaseName"), lessonGrid=$("lessonGrid"), progressMap=$("progressMap"), completeBox=$("completeBox"), nextLessonBtn=$("nextLessonBtn"), restartLessonBtn=$("restartLessonBtn"), currentKeysBox=$("currentKeysBox"), levelGoal=$("levelGoal"), memoryModeBtn=$("memoryModeBtn"), completeText=$("completeText");

let levelIndex = Math.min(Number(localStorage.getItem("kpc_v35_level")||0), V35_LEVELS.length-1);
let stepIndex = 0, charIndex = 0, memoryMode = false;
let xp = Number(localStorage.getItem("kpc_academy_xp")||0);
let total = Number(localStorage.getItem("kpc_academy_total")||0);
let correct = Number(localStorage.getItem("kpc_academy_correct")||0);
let streak = 0;
let completed = JSON.parse(localStorage.getItem("kpc_v35_completed")||"[]");

// V24 Phase 1: Chapter system + selectable lesson length.
// Default lesson duration is 4 minutes for real practice instead of very short one-pass lessons.
let lessonDurationSec = Number(localStorage.getItem("kpc_v24_lesson_duration") || 240);
let lessonStartedAt = Date.now();
let lessonMinuteAwarded = Number(localStorage.getItem("kpc_v24_minute_awarded") || 0);
const V24_CHAPTERS = [
  {name:"Home Row", range:[1,5], icon:"🏠"},
  {name:"Top Row", range:[6,10], icon:"⬆️"},
  {name:"Bottom Row", range:[11,15], icon:"⬇️"},
  {name:"Numbers", range:[16,20], icon:"🔢"},
  {name:"Symbols", range:[21,25], icon:"⌨️"},
  {name:"English", range:[26,30], icon:"📝"},
  {name:"Khmer", range:[31,35], icon:"🇰🇭"},
  {name:"Mixed Mastery", range:[36,40], icon:"👑"}
];
function v24ResetLessonTimer(){
  lessonStartedAt = Date.now();
  lessonMinuteAwarded = 0;
  localStorage.setItem("kpc_v24_minute_awarded","0");
}
function v24LessonElapsedSec(){
  return Math.max(0, Math.floor((Date.now() - lessonStartedAt) / 1000));
}
function v24LessonProgressPct(){
  return Math.min(100, Math.round((v24LessonElapsedSec() / lessonDurationSec) * 100));
}
function v24FormatTime(sec){
  const m = Math.floor(sec/60), s = sec % 60;
  return `${m}:${String(s).padStart(2,"0")}`;
}
function v24CurrentChapter(level){
  return V24_CHAPTERS.find(c => level >= c.range[0] && level <= c.range[1]) || V24_CHAPTERS[0];
}
function v24BuildPhase1UI(){
  if(document.getElementById("v24Phase1Panel")) return;
  const header = document.querySelector(".v43-target-panel");
  const panel = document.createElement("section");
  panel.id = "v24Phase1Panel";
  panel.className = "v24-phase-panel";
  panel.innerHTML = `
    <div class="v24-phase-top">
      <div>
        <span class="v24-label">PHASE 7 LESSON PRO</span>
        <h3 id="v24ChapterTitle">Academy Chapter</h3>
      </div>
      <div class="v24-duration">
        <button type="button" data-sec="180">3 min</button>
        <button type="button" data-sec="240">4 min</button>
        <button type="button" data-sec="300">5 min</button>
        <button type="button" data-sec="480">8 min</button>
      </div>
    </div>
    <div class="v24-time-row">
      <span id="v24TimeText">0:00 / 4:00</span>
      <strong id="v24RewardText">Minute XP ready</strong>
    </div>
    <div class="v24-timebar"><i id="v24Timebar"></i></div>
    <div id="v24ChapterMap" class="v24-chapter-map"></div>
  `;
  if(header) header.parentNode.insertBefore(panel, header);
  panel.querySelectorAll("[data-sec]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      lessonDurationSec = Number(btn.dataset.sec);
      localStorage.setItem("kpc_v24_lesson_duration", String(lessonDurationSec));
      v24ResetLessonTimer();
      v24UpdatePhase1UI();
      input && input.focus();
    });
  });
}
function v24UpdatePhase1UI(){
  v24BuildPhase1UI();
  const current = currentLevel();
  const chapter = v24CurrentChapter(current.level);
  const elapsed = v24LessonElapsedSec();
  const remain = Math.max(0, lessonDurationSec - elapsed);
  const pct = v24LessonProgressPct();
  const chapterTitle = $("v24ChapterTitle");
  if(chapterTitle) chapterTitle.textContent = `${chapter.icon} Chapter: ${chapter.name}`;
  const timeText = $("v24TimeText");
  if(timeText) timeText.textContent = `${v24FormatTime(elapsed)} / ${v24FormatTime(lessonDurationSec)} • ${remain}s left`;
  const bar = $("v24Timebar");
  if(bar) bar.style.width = pct + "%";
  const reward = $("v24RewardText");
  if(reward) reward.textContent = pct >= 100 ? "✅ Time goal complete" : "Earn +20 XP every minute";
  document.querySelectorAll(".v24-duration button").forEach(btn=>{
    btn.classList.toggle("active", Number(btn.dataset.sec) === lessonDurationSec);
  });
  const map = $("v24ChapterMap");
  if(map){
    map.innerHTML = V24_CHAPTERS.map(c=>{
      const done = completed.filter(i=>V35_LEVELS[i] && V35_LEVELS[i].level>=c.range[0] && V35_LEVELS[i].level<=c.range[1]).length;
      const total = c.range[1]-c.range[0]+1;
      const active = current.level>=c.range[0] && current.level<=c.range[1];
      return `<div class="v24-chapter ${active?'active':''}">
        <b>${c.icon} ${c.name}</b><span>${done}/${total} lessons</span>
      </div>`;
    }).join("");
  }
  const fullMinutes = Math.floor(elapsed / 60);
  if(fullMinutes > lessonMinuteAwarded && elapsed <= lessonDurationSec + 3){
    const diff = fullMinutes - lessonMinuteAwarded;
    lessonMinuteAwarded = fullMinutes;
    localStorage.setItem("kpc_v24_minute_awarded", String(lessonMinuteAwarded));
    xp += diff * 20;
    localStorage.setItem("kpc_academy_xp", xp);
    xpValue.textContent = xp;
    feedback.textContent = `⭐ Minute reward: +${diff*20} XP`;
    feedback.className = "feedback-text good";
    if(window.KPCGamification){
      KPCGamification.kpcProgressDaily("daily_4min", fullMinutes);
      KPCGamification.kpcUpdateAll();
    }
  }
}


function currentLevel(){ return V35_LEVELS[levelIndex]; }
function currentItem(){ const l=currentLevel(); return l.keys[stepIndex % l.keys.length]; }
function expectedChar(){ const item=currentItem(); return item.length>1 ? (item[charIndex]||"") : item; }
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

function displayTarget(){
  const item=currentItem();
  if(item.length>1){
    const start=Math.max(0,charIndex-8);
    const end=Math.min(item.length,charIndex+10);
    const past=item.slice(start,charIndex);
    const current=item[charIndex] || "";
    const future=item.slice(charIndex+1,end);
    const render=(s,cls)=>s.split("").map(ch=>`<span class="${cls}${ch===" "?" space-gap":""}">${ch===" "?"&nbsp;":esc(ch)}</span>`).join("");
    const currentHtml = current===" "
      ? `<span class="flow-current flow-space">&nbsp;&nbsp;&nbsp;</span>`
      : `<span class="flow-current">${esc(current)}</span>`;
    return `<div class="v472-flow-wrap">
      <div class="v472-past">${start>0?'<span class="flow-done">…</span>':''}${render(past,"flow-done")}</div>
      ${currentHtml}
      <div class="v472-future">${render(future,"flow-next")}${end<item.length?'<span class="flow-next">…</span>':''}</div>
    </div>`;
  }
  if(item===" ") return `<div class="v472-flow-wrap"><div class="v472-past"></div><span class="flow-current flow-space">&nbsp;&nbsp;&nbsp;</span><div class="v472-future"></div></div>`;
  return `<div class="v472-flow-wrap"><div class="v472-past"></div><span class="flow-current">${esc(item)}</span><div class="v472-future"></div></div>`;
}

function buildKeyboard(){
  keyboard.innerHTML="";
  rows.forEach(row=>{
    const rowEl=document.createElement("div");
    rowEl.className="key-row";
    row.forEach(k=>{
      const key=document.createElement("div");
      const finger=fingerMap[k] || fingerMap[k.toUpperCase()];
      key.className=`key ${zoneMap[finger]||""} ${k===" "?"space-key":""}`;
      key.dataset.key=k;
      key.textContent=k===" "?"SPACE":k.toUpperCase();
      rowEl.appendChild(key);
    });
    keyboard.appendChild(rowEl);
  });
}

function maxUnlockedIndex(){
  if(!completed.length) return 0;
  return Math.min(Math.max(...completed) + 1, V35_LEVELS.length - 1);
}
function buildGrid(){
  lessonGrid.innerHTML="";
  const maxOpen = maxUnlockedIndex();
  V35_LEVELS.forEach((l,i)=>{
    const item=document.createElement("div");
    const locked = i > maxOpen;
    item.className="lesson-item"+(i===levelIndex?" active":"")+(completed.includes(i)?" completed":"")+(l.boss?" boss-level":"")+(locked?" locked":"");
    item.innerHTML=`<strong>${completed.includes(i)?"✅ ":locked?"🔒 ":""}L${l.level}. ${l.name}</strong><span>${l.phase}${l.boss?" • Boss":""}</span>`;
    item.onclick=()=>{
      if(locked){
        feedback.textContent = "🔒 Finish the previous lesson first.";
        feedback.className = "feedback-text bad";
        input && input.focus();
        return;
      }
      levelIndex=i; stepIndex=0; charIndex=0; v24ResetLessonTimer(); localStorage.setItem("kpc_v35_level",levelIndex); completeBox.classList.add("hidden"); buildGrid(); buildMap(); updateTarget(); input.focus();
    };
    lessonGrid.appendChild(item);
  });
}

function buildMap(){
  progressMap.innerHTML="";
  V35_LEVELS.forEach((l,i)=>{
    if(i){const line=document.createElement("div");line.className="map-line";progressMap.appendChild(line);}
    const n=document.createElement("div");
    n.className="map-node"+(i===levelIndex?" active":"")+(completed.includes(i)?" done":"")+(l.boss?" boss":"");
    n.textContent = l.boss ? `👑 L${l.level}` : `L${l.level}`;
    progressMap.appendChild(n);
  });
}

function updateUnlocks(){
  const maxDone = completed.length ? Math.max(...completed.map(i=>V35_LEVELS[i].level)) : 0;
  const set=(id,ok)=>{const el=$(id); if(el) el.classList.toggle("unlocked", ok);};
  set("unlockZombie", maxDone>=5);
  set("unlockVampire", maxDone>=10);
  set("unlockSpace", maxDone>=15);
  set("unlockMaster", maxDone>=40);
}

function updateTarget(){
  const l=currentLevel(), expected=expectedChar();
  const base = shiftSymbols[expected] || expected.toLowerCase();
  const isKhmerChar = /[\u1780-\u17FF]/.test(expected);
  const finger = fingerMap[expected] || fingerMap[expected.toLowerCase()] || fingerMap[base] || (isKhmerChar ? "khmer" : "thumb");
  const needShift = expected !== expected.toLowerCase() || !!shiftSymbols[expected];

  lessonName.textContent = `L${l.level}`;
  phaseName.textContent = l.phase;
  targetKey.innerHTML = memoryMode ? "????" : displayTarget();
  fingerName.textContent = memoryMode ? "MEMORY MODE" : (fingerNameMap[finger] || (finger === "khmer" ? "KHMER KEYBOARD" : "FINGER"));
  levelGoal.textContent = l.boss ? "Boss Test" : l.goal;
  coach.textContent = memoryMode
    ? "Keyboard hidden. Remember the key position by yourself."
    : `${l.name}: ${finger === "khmer" ? "Type the Khmer character exactly." : "Use " + (fingerNameMap[finger] || "correct finger") + (needShift?" + SHIFT":"") + "."}`;
  currentKeysBox.innerHTML = l.keys.map(k=>`<span>${esc(k).replaceAll(" ","&nbsp;&nbsp;")}</span>`).join("");

  document.querySelectorAll(".key").forEach(el=>{
    el.classList.remove("active","correct","wrong","shift-needed","memory-hide");
    if(memoryMode) el.classList.add("memory-hide");
    if(!memoryMode && (el.dataset.key===base || (expected===" " && el.dataset.key===" "))) el.classList.add("active");
    if(!memoryMode && needShift && (el.dataset.key==="a" || el.dataset.key===";")) el.classList.add("shift-needed");
  });

  xpValue.textContent=xp;
  streakValue.textContent=streak;
  accuracyValue.textContent=total?`${Math.round((correct/total)*100)}%`:"100%";
  updateUnlocks();
  v24UpdatePhase1UI();
}

function showKeyState(k,state){
  const base=shiftSymbols[k] || k.toLowerCase();
  const el=[...document.querySelectorAll(".key")].find(x=>x.dataset.key===base || (k===" " && x.dataset.key===" "));
  if(el){el.classList.add(state); setTimeout(()=>el.classList.remove(state),250);}
}

function completeLevel(){
  v24UpdatePhase1UI();
  if(!completed.includes(levelIndex)) completed.push(levelIndex);
  localStorage.setItem("kpc_v35_completed", JSON.stringify(completed));
  xp += currentLevel().boss ? 120 : 50;
  localStorage.setItem("kpc_academy_xp", xp);
  if(window.KPCGamification){ KPCGamification.kpcProgressDaily("daily_3_lessons",(JSON.parse(localStorage.getItem("kpc_daily")||"{}").daily_3_lessons||0)+1); KPCGamification.kpcUpdateAll(); }
  const acc = total ? Math.round((correct/total)*100) : 100;
  const star = acc >= 95 ? "⭐⭐⭐" : acc >= 85 ? "⭐⭐" : "⭐";
  completeText.textContent = (currentLevel().unlock ? `Unlocked: ${currentLevel().unlock}. ` : "") + `${star} Accuracy ${acc}% • XP saved • Next lesson unlocked.`;
  completeBox.classList.remove("hidden");
  buildGrid(); buildMap(); updateUnlocks();
}

// V25 Phase 2: Weak Key AI tracking for personalized practice.
function v25RecordKey(expected, ok){
  const key = expected === " " ? "SPACE" : expected;
  if(!key) return;
  const data = JSON.parse(localStorage.getItem("kpc_v25_weak_keys") || "{}");
  if(!data[key]) data[key] = {hit:0, miss:0};
  if(ok) data[key].hit += 1; else data[key].miss += 1;
  localStorage.setItem("kpc_v25_weak_keys", JSON.stringify(data));
}
function v25UpdateMissionPanel(){
  if(!document.getElementById("v25MissionPanel")){
    const right = document.querySelector(".v43-right");
    if(right){
      const box=document.createElement("div");
      box.id="v25MissionPanel";
      box.className="v43-card v25-mission-card";
      box.innerHTML='<h3>🎯 Today Mission</h3><p id="v25MissionLine">Type 50 correct keys</p><div class="v25-mini-bar"><i id="v25MissionBar"></i></div><small id="v25WeakLine">Weak Key AI loading...</small><button id="v25WeakPracticeBtn" type="button" class="v25-weak-btn">Practice Weak Key</button>';
      right.insertBefore(box, right.firstChild);
    }
  }
  const daily=JSON.parse(localStorage.getItem("kpc_daily")||"{}");
  const val=Math.min(Number(daily.daily_50||0),50);
  const bar=document.getElementById("v25MissionBar"); if(bar) bar.style.width=Math.round((val/50)*100)+"%";
  const line=document.getElementById("v25MissionLine"); if(line) line.textContent=`Type 50 correct keys: ${val}/50`;
  const weak=JSON.parse(localStorage.getItem("kpc_v25_weak_keys")||"{}");
  const worst=Object.entries(weak).filter(([k,v])=>v.miss>0).sort((a,b)=>b[1].miss-a[1].miss)[0];
  const weakLine=document.getElementById("v25WeakLine");
  if(weakLine) weakLine.textContent=worst ? `Weak Key Focus: ${worst[0]} (${worst[1].miss} misses)` : "Weak Key Focus: clean so far";
  const btn=document.getElementById("v25WeakPracticeBtn");
  if(btn && !btn.dataset.ready){
    btn.dataset.ready="1";
    btn.addEventListener("click",()=>{
      const weakNow=JSON.parse(localStorage.getItem("kpc_v25_weak_keys")||"{}");
      const worstNow=Object.entries(weakNow).filter(([k,v])=>v.miss>0).sort((a,b)=>b[1].miss-a[1].miss)[0];
      if(!worstNow){ feedback.textContent="✅ No weak key yet. Keep typing."; feedback.className="feedback-text good"; return; }
      const key=worstNow[0]==="SPACE" ? " " : worstNow[0];
      const candidate=V35_LEVELS.findIndex(l=>l.keys.some(x=>String(x).includes(key)));
      if(candidate>=0 && candidate<=maxUnlockedIndex()) levelIndex=candidate;
      stepIndex=0; charIndex=0; v24ResetLessonTimer(); localStorage.setItem("kpc_v35_level",levelIndex);
      feedback.textContent=`🎯 Weak-key practice started: ${worstNow[0]}`;
      feedback.className="feedback-text good";
      completeBox.classList.add("hidden"); buildGrid(); buildMap(); updateTarget(); input.focus();
    });
  }
}

function handleKey(typed){
  const expected=expectedChar();
  total++; localStorage.setItem("kpc_academy_total", total);
  if(typed===expected){
    correct++; streak++; xp+=4; charIndex++;
    v25RecordKey(expected, true);
    if(streak > Number(localStorage.getItem("kpc_best_streak")||0)) localStorage.setItem("kpc_best_streak", streak);
    localStorage.setItem("kpc_academy_correct", correct);
    localStorage.setItem("kpc_academy_xp", xp);
    if(window.KPCGamification){ KPCGamification.kpcProgressDaily("daily_50",1); KPCGamification.kpcProgressDaily("daily_10_streak",streak); }
    feedback.textContent="✅ Correct!";
    feedback.className="feedback-text good";
    showKeyState(expected,"correct");
    const item=currentItem();
    if(charIndex>=item.length){
      charIndex=0; stepIndex++;
      if(stepIndex>=currentLevel().keys.length){
        if(v24LessonElapsedSec() >= lessonDurationSec){
          completeLevel();
        }else{
          stepIndex = 0;
          charIndex = 0;
          feedback.textContent = `Good round. Keep practicing until ${v24FormatTime(lessonDurationSec)}.`;
          feedback.className = "feedback-text good";
        }
      }
    }
  }else{
    streak=0;
    v25RecordKey(expected, false);
    feedback.textContent=`❌ Wrong. Press ${expected===" "?"SPACE":expected}`;
    feedback.className="feedback-text bad";
    showKeyState(typed,"wrong");
  }
  updateTarget();
  v25UpdateMissionPanel();
}

input.addEventListener("keydown", e=>{
  if(e.key.length!==1 && e.key!==" ") return;
  e.preventDefault();
  handleKey(e.key===" "?" ":e.key);
  input.value="";
});

nextLessonBtn.addEventListener("click",()=>{
  completeBox.classList.add("hidden");
  levelIndex = Math.min(levelIndex+1, V35_LEVELS.length-1);
  stepIndex=0; charIndex=0; v24ResetLessonTimer();
  localStorage.setItem("kpc_v35_level", levelIndex);
  buildGrid(); buildMap(); updateTarget(); input.focus();
});
restartLessonBtn.addEventListener("click",()=>{stepIndex=0; charIndex=0; v24ResetLessonTimer(); completeBox.classList.add("hidden"); updateTarget(); input.focus();});
memoryModeBtn.addEventListener("click",()=>{memoryMode=!memoryMode; memoryModeBtn.textContent=memoryMode?"Show Keyboard":"Memory Mode"; updateTarget(); input.focus();});


// V47_2_AUTO_CAPTURE_FIX: allow typing directly on the page, including SPACE, without clicking input.
document.addEventListener("keydown", e=>{
  if(!input) return;
  if(document.activeElement===input) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key.length!==1 && e.key!==" ") return;
  e.preventDefault();
  handleKey(e.key===" "?" ":e.key);
  input.value="";
  setTimeout(()=>input.focus(),20);
}, true);

buildKeyboard(); if(levelIndex > maxUnlockedIndex()){ levelIndex=maxUnlockedIndex(); localStorage.setItem("kpc_v35_level", levelIndex); } buildGrid(); buildMap(); v24BuildPhase1UI(); updateTarget(); v25UpdateMissionPanel(); setInterval(()=>{v24UpdatePhase1UI(); v25UpdateMissionPanel();},1000); input.focus();
