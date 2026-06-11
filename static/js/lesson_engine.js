
/*
  KPC Typing REAL Phase 4.1 Full Learning System Build
  Non-destructive enhancement layer for the existing 25-level academy.
  Features:
  - Visible 4-minute timer dashboard
  - 25-level roadmap UI with locked/current/completed states
  - Weak-key detection from existing academy tracking
  - Finger guide / next-key mirror
  - Completion persistence and XP reward foundation
  - Local progress reset and timer restart controls
*/
(function(){
  "use strict";

  const LESSON_SECONDS = 240;
  const XP_REWARD = 25;
  const LEVELS = [
    ["Home Row", "F J D K S"], ["Home Row", "A L ; G H"], ["Home Row", "Home Row Mix"], ["Home Row", "Home Row Words"], ["Boss", "Home Row Boss"],
    ["Top Row", "E I R U W"], ["Top Row", "O Q P T Y"], ["Top Row", "Top Row Mix"], ["Top Row", "Top Row Words"], ["Boss", "Top Row Boss"],
    ["Bottom Row", "C M X , Z"], ["Bottom Row", ". / V B N"], ["Bottom Row", "Bottom Row Mix"], ["Bottom Row", "Bottom Words"], ["Boss", "Bottom Row Boss"],
    ["Numbers", "1 2 3 4 5"], ["Numbers", "6 7 8 9 0"], ["Numbers", "Number Challenge"],
    ["Symbols", "! @ # $ %"], ["Symbols", "^ & * ( )"], ["Symbols", "- = [ ] \\"], ["Symbols", "; ' , . /"],
    ["Master", "Mixed Words"], ["Master", "Mixed Sentences"], ["Boss", "Keyboard Master Exam"]
  ];

  const FINGER_NAMES = {
    "left-pinky":"Left Pinky", "left-ring":"Left Ring", "left-middle":"Left Middle", "left-index":"Left Index",
    "right-index":"Right Index", "right-middle":"Right Middle", "right-ring":"Right Ring", "right-pinky":"Right Pinky", "thumb":"Thumb / Space"
  };

  const FINGER_MAP = {
    q:"left-pinky", a:"left-pinky", z:"left-pinky", "1":"left-pinky", "!":"left-pinky",
    w:"left-ring", s:"left-ring", x:"left-ring", "2":"left-ring", "@":"left-ring",
    e:"left-middle", d:"left-middle", c:"left-middle", "3":"left-middle", "#":"left-middle",
    r:"left-index", t:"left-index", f:"left-index", g:"left-index", v:"left-index", b:"left-index", "4":"left-index", "5":"left-index", "$":"left-index", "%":"left-index",
    y:"right-index", u:"right-index", h:"right-index", j:"right-index", n:"right-index", m:"right-index", "6":"right-index", "7":"right-index", "^":"right-index", "&":"right-index",
    i:"right-middle", k:"right-middle", ",":"right-middle", "8":"right-middle", "*":"right-middle",
    o:"right-ring", l:"right-ring", ".":"right-ring", "9":"right-ring", "(":"right-ring",
    p:"right-pinky", ";":"right-pinky", "/":"right-pinky", "0":"right-pinky", ")":"right-pinky", "'":"right-pinky", '"':"right-pinky", "[":"right-pinky", "]":"right-pinky", "-":"right-pinky", "=":"right-pinky", "\\":"right-pinky", "?":"right-pinky", ":":"right-pinky",
    " ":"thumb"
  };

  function $(id){ return document.getElementById(id); }
  function getLevelIndex(){ return Math.max(0, Math.min(24, Number(localStorage.getItem("kpc_v35_level") || 0))); }
  function getCompleted(){
    try { return JSON.parse(localStorage.getItem("kpc_v35_completed") || "[]"); }
    catch(e){ return []; }
  }
  function saveStartedAt(){
    if(!localStorage.getItem("kpc_phase41_started_at")){
      localStorage.setItem("kpc_phase41_started_at", String(Date.now()));
    }
  }
  function resetTimer(){
    localStorage.setItem("kpc_phase41_started_at", String(Date.now()));
    localStorage.setItem("kpc_phase41_completed_awarded", "0");
    renderTimer();
  }
  function secondsLeft(){
    saveStartedAt();
    const started = Number(localStorage.getItem("kpc_phase41_started_at") || Date.now());
    const elapsed = Math.floor((Date.now() - started) / 1000);
    return Math.max(0, LESSON_SECONDS - elapsed);
  }
  function format(sec){
    const m = String(Math.floor(sec / 60)).padStart(2,"0");
    const s = String(sec % 60).padStart(2,"0");
    return `${m}:${s}`;
  }

  function worstWeakKey(){
    let data = {};
    try { data = JSON.parse(localStorage.getItem("kpc_v25_weak_keys") || "{}"); } catch(e){}
    const entries = Object.entries(data)
      .map(([key, v]) => ({key, miss:Number(v.miss||0), hit:Number(v.hit||0)}))
      .filter(x => x.miss > 0)
      .sort((a,b) => (b.miss - a.miss) || (a.hit - b.hit));
    return entries[0] || null;
  }

  function expectedKey(){
    const target = $("targetKey");
    if(target && target.textContent.trim()){
      const t = target.textContent.trim();
      return t.toUpperCase() === "SPACE" ? " " : t[0];
    }
    return "f";
  }

  function fingerFor(key){
    const k = key === " " ? " " : String(key || "").toLowerCase();
    return FINGER_NAMES[FINGER_MAP[k]] || "Use correct finger";
  }

  function renderRoadmap(){
    const box = $("phase41Roadmap");
    if(!box) return;
    const current = getLevelIndex();
    const completed = getCompleted();
    box.innerHTML = "";
    LEVELS.forEach((item, idx) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "phase41-node";
      if(idx === current) node.classList.add("current");
      if(completed.includes(idx)) node.classList.add("completed");
      if(idx > current && !completed.includes(idx-1) && idx !== 0) node.classList.add("locked");
      node.innerHTML = `<span>${idx+1}</span><strong>${item[0]}</strong><small>${item[1]}</small>`;
      node.title = `Level ${idx+1}: ${item[1]}`;
      node.addEventListener("click", () => {
        if(idx <= current || completed.includes(idx-1) || idx === 0){
          localStorage.setItem("kpc_v35_level", String(idx));
          location.reload();
        }
      });
      box.appendChild(node);
    });
    const summary = $("phase41RoadmapSummary");
    if(summary) summary.textContent = `${completed.length}/25 completed`;
  }

  function renderStats(){
    const current = getLevelIndex();
    const item = LEVELS[current] || LEVELS[0];
    const completed = getCompleted();
    const currentLesson = $("phase41CurrentLesson");
    const goal = $("phase41LessonGoal");
    const unlock = $("phase41UnlockStatus");
    const unlockDetail = $("phase41UnlockDetail");
    const xpReward = $("phase41XPReward");

    if(currentLesson) currentLesson.textContent = `Level ${current+1}: ${item[1]}`;
    if(goal) goal.textContent = `${item[0]} practice • finish 4 minutes to complete.`;
    if(unlock) unlock.textContent = `Level ${current+1} / 25`;
    if(unlockDetail) unlockDetail.textContent = completed.includes(current) ? "Completed. Next level is available." : "Complete this lesson to unlock next.";
    if(xpReward) xpReward.textContent = `+${XP_REWARD} XP`;

    const weak = worstWeakKey();
    const weakKey = $("phase41WeakKey");
    const weakDetail = $("phase41WeakDetail");
    if(weakKey) weakKey.textContent = weak ? weak.key : "None";
    if(weakDetail) weakDetail.textContent = weak ? `${weak.miss} misses / ${weak.hit} correct` : "Mistakes will appear here.";

    const key = expectedKey();
    const next = $("phase41NextKey");
    const finger = $("phase41FingerGuide");
    if(next) next.textContent = key === " " ? "SPACE" : key.toUpperCase();
    if(finger) finger.textContent = `${fingerFor(key)} for "${key === " " ? "SPACE" : key.toUpperCase()}". Keep eyes on the target key.`;

    const dashXP = $("v43DashXP");
    const xp = $("xpValue");
    const academyXP = localStorage.getItem("kpc_academy_xp") || "0";
    if(dashXP) dashXP.textContent = academyXP;
    if(xp) xp.textContent = academyXP;
  }

  function awardCompletionIfNeeded(){
    if(secondsLeft() > 0) return;
    if(localStorage.getItem("kpc_phase41_completed_awarded") === "1") return;

    const current = getLevelIndex();
    const completed = getCompleted();
    if(!completed.includes(current)){
      completed.push(current);
      localStorage.setItem("kpc_v35_completed", JSON.stringify(completed));
    }

    const xp = Number(localStorage.getItem("kpc_academy_xp") || 0) + XP_REWARD;
    localStorage.setItem("kpc_academy_xp", String(xp));
    localStorage.setItem("kpc_phase41_completed_awarded", "1");

    const state = $("phase41TimerState");
    if(state) state.textContent = "Completed + XP saved";
    renderRoadmap();
    renderStats();
  }

  function renderTimer(){
    const left = secondsLeft();
    const timer = $("phase41Timer");
    const state = $("phase41TimerState");
    if(timer) timer.textContent = format(left);
    if(state){
      if(left === LESSON_SECONDS) state.textContent = "Ready";
      else if(left === 0) state.textContent = "Complete";
      else state.textContent = "Practicing";
    }
    awardCompletionIfNeeded();
  }

  function bindButtons(){
    const restart = $("phase41RestartTimer");
    if(restart) restart.addEventListener("click", resetTimer);

    const reset = $("phase41ResetProgress");
    if(reset) reset.addEventListener("click", () => {
      ["kpc_v35_completed","kpc_v35_level","kpc_academy_xp","kpc_academy_total","kpc_academy_correct","kpc_v25_weak_keys","kpc_phase41_started_at","kpc_phase41_completed_awarded"].forEach(k => localStorage.removeItem(k));
      location.reload();
    });
  }

  function init(){
    if(!$("phase41LearningPanel")) return;
    saveStartedAt();
    bindButtons();
    renderRoadmap();
    renderStats();
    renderTimer();

    document.addEventListener("keydown", () => setTimeout(() => {
      renderStats();
      renderRoadmap();
      renderTimer();
    }, 30), true);

    setInterval(() => {
      renderTimer();
      renderStats();
    }, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
