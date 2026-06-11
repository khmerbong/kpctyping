// KPC Typing V33 Real Gamification System
const KPC_RANKS = [
  {name:"Beginner", xp:0, icon:"🌱"},
  {name:"Rookie", xp:100, icon:"⭐"},
  {name:"Student", xp:250, icon:"📘"},
  {name:"Fast Typist", xp:600, icon:"⚡"},
  {name:"Pro Typist", xp:1200, icon:"🔥"},
  {name:"Master", xp:2500, icon:"🏆"},
  {name:"Grand Master", xp:5000, icon:"👑"},
  {name:"Legend", xp:10000, icon:"💎"}
];

const KPC_ACHIEVEMENTS = [
  {id:"first_key", name:"First Key", icon:"⌨️", desc:"Type your first correct key", check:s=>s.correct>=1},
  {id:"ten_correct", name:"10 Correct", icon:"✅", desc:"Type 10 correct keys", check:s=>s.correct>=10},
  {id:"hundred_correct", name:"100 Correct", icon:"💯", desc:"Type 100 correct keys", check:s=>s.correct>=100},
  {id:"streak_10", name:"Hot Streak", icon:"🔥", desc:"Reach 10 streak", check:s=>s.bestStreak>=10},
  {id:"xp_100", name:"100 XP", icon:"⭐", desc:"Earn 100 XP", check:s=>s.xp>=100},
  {id:"xp_500", name:"500 XP", icon:"🌟", desc:"Earn 500 XP", check:s=>s.xp>=500},
  {id:"lesson_3", name:"Home Row Learner", icon:"🎓", desc:"Complete 3 lessons", check:s=>s.completed.length>=3},
  {id:"lesson_10", name:"Course Climber", icon:"🧗", desc:"Complete 10 lessons", check:s=>s.completed.length>=10},
  {id:"accuracy_90", name:"Accurate Typist", icon:"🎯", desc:"Reach 90% accuracy", check:s=>s.total>=30 && (s.correct/s.total)>=.90},
  {id:"accuracy_95", name:"Gold Accuracy", icon:"🥇", desc:"Reach 95% accuracy", check:s=>s.total>=60 && (s.correct/s.total)>=.95},
  {id:"symbol_master", name:"Symbol Master", icon:"⌨️", desc:"Finish symbol lessons", check:s=>s.completed.some(i=>i>=18)},
  {id:"boss_clear", name:"Boss Fighter", icon:"👑", desc:"Complete at least one boss lesson", check:s=>s.completed.some(i=>[4,9,14,19,24].includes(i))},
  {id:"xp_1000", name:"1000 XP", icon:"💫", desc:"Earn 1000 XP", check:s=>s.xp>=1000}
];

const KPC_DAILY = [
  {id:"daily_50", title:"Type 50 correct keys", goal:50, reward:25},
  {id:"daily_3_lessons", title:"Complete 3 lesson steps", goal:3, reward:40},
  {id:"daily_10_streak", title:"Reach 10 streak", goal:10, reward:35},
  {id:"daily_4min", title:"Practice 4 minutes", goal:4, reward:50}
];

function kpcToday(){ return new Date().toISOString().slice(0,10); }

function kpcGetStats(){
  const completed = JSON.parse(localStorage.getItem("kpc_academy_completed") || "[]");
  const daily = JSON.parse(localStorage.getItem("kpc_daily") || "{}");
  if(daily.date !== kpcToday()){
    localStorage.setItem("kpc_daily", JSON.stringify({date:kpcToday(), daily_50:0, daily_3_lessons:0, daily_10_streak:0, daily_4min:0, claimed:[]}));
  }
  const freshDaily = JSON.parse(localStorage.getItem("kpc_daily") || "{}");
  return {
    xp:Number(localStorage.getItem("kpc_academy_xp")||0),
    total:Number(localStorage.getItem("kpc_academy_total")||0),
    correct:Number(localStorage.getItem("kpc_academy_correct")||0),
    bestStreak:Number(localStorage.getItem("kpc_best_streak")||0),
    completed,
    achievements:JSON.parse(localStorage.getItem("kpc_achievements")||"[]"),
    daily:freshDaily
  };
}

function kpcSaveStats(s){
  localStorage.setItem("kpc_academy_xp", s.xp);
  localStorage.setItem("kpc_academy_total", s.total);
  localStorage.setItem("kpc_academy_correct", s.correct);
  localStorage.setItem("kpc_best_streak", s.bestStreak);
  localStorage.setItem("kpc_academy_completed", JSON.stringify(s.completed || []));
  localStorage.setItem("kpc_achievements", JSON.stringify(s.achievements || []));
  localStorage.setItem("kpc_daily", JSON.stringify(s.daily || {}));
}

function kpcRank(xp){
  let r = KPC_RANKS[0];
  for(const rank of KPC_RANKS){ if(xp >= rank.xp) r = rank; }
  const next = KPC_RANKS[KPC_RANKS.indexOf(r)+1] || null;
  return {current:r, next};
}

function kpcAwardXP(amount, reason="XP"){
  const s = kpcGetStats();
  s.xp += amount;
  kpcSaveStats(s);
  kpcToast(`+${amount} XP • ${reason}`);
  kpcUpdateAll();
}

function kpcToast(text){
  const t = document.createElement("div");
  t.className = "kpc-toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add("show"),20);
  setTimeout(()=>{t.classList.remove("show"); setTimeout(()=>t.remove(),350);},2200);
}

function kpcCheckAchievements(){
  const s = kpcGetStats();
  let changed = false;
  for(const a of KPC_ACHIEVEMENTS){
    if(!s.achievements.includes(a.id) && a.check(s)){
      s.achievements.push(a.id);
      s.xp += 50;
      changed = true;
      kpcToast(`🎖 Achievement Unlocked: ${a.name} (+50 XP)`);
    }
  }
  if(changed) kpcSaveStats(s);
}

function kpcProgressDaily(type, amount=1){
  const s = kpcGetStats();
  s.daily[type] = Math.max(Number(s.daily[type]||0), amount);
  if(type === "daily_50") s.daily[type] = Number(s.daily[type]||0) + amount;
  kpcSaveStats(s);
}

function kpcClaimDaily(id){
  const s = kpcGetStats();
  s.daily.claimed = s.daily.claimed || [];
  if(s.daily.claimed.includes(id)) return;
  const d = KPC_DAILY.find(x=>x.id===id);
  const val = Number(s.daily[id]||0);
  if(!d || val < d.goal) return;
  s.daily.claimed.push(id);
  s.xp += d.reward;
  kpcSaveStats(s);
  kpcToast(`📅 Daily Complete: +${d.reward} XP`);
  kpcUpdateAll();
}

function kpcUpdateAll(){
  kpcCheckAchievements();
  const s = kpcGetStats();
  const r = kpcRank(s.xp);
  const acc = s.total ? Math.round((s.correct/s.total)*100) : 100;
  const pct = r.next ? Math.min(100, Math.round(((s.xp-r.current.xp)/(r.next.xp-r.current.xp))*100)) : 100;

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set("dashXP", s.xp);
  set("dashRankBadge", `${r.current.icon} ${r.current.name}`);
  set("dashNextRank", r.next ? `Next rank: ${r.next.name} (${pct}%)` : "Max rank reached");
  set("dashAccuracy", `${acc}%`);
  set("dashBestStreak", s.bestStreak);
  set("dashCorrect", s.correct);
  set("dashLessons", s.completed.length);
  const bar = document.getElementById("dashXPBar"); if(bar) bar.style.width = pct + "%";

  const ach = document.getElementById("achievementGallery");
  if(ach){
    ach.innerHTML = KPC_ACHIEVEMENTS.map(a=>{
      const unlocked = s.achievements.includes(a.id);
      return `<div class="achievement-tile ${unlocked?'unlocked':'locked'}"><b>${a.icon}</b><strong>${a.name}</strong><span>${a.desc}</span></div>`;
    }).join("");
  }

  const dl = document.getElementById("dailyChallengeList");
  if(dl){
    dl.innerHTML = KPC_DAILY.map(d=>{
      const val = Math.min(Number(s.daily[d.id]||0), d.goal);
      const claimed = (s.daily.claimed||[]).includes(d.id);
      return `<div class="daily-item">
        <div><strong>${d.title}</strong><span>${val}/${d.goal} • Reward ${d.reward} XP</span><div class="daily-bar"><i style="width:${Math.round((val/d.goal)*100)}%"></i></div></div>
        <button ${val<d.goal||claimed?'disabled':''} onclick="kpcClaimDaily('${d.id}')">${claimed?'Claimed':'Claim'}</button>
      </div>`;
    }).join("");
  }

  const ladder = document.getElementById("rankLadder");
  if(ladder){
    ladder.innerHTML = KPC_RANKS.map(rank=>`<div class="rank-step ${s.xp>=rank.xp?'done':''}"><b>${rank.icon}</b><strong>${rank.name}</strong><span>${rank.xp} XP</span></div>`).join("");
  }

  const weakBox = document.getElementById("v25WeakKeys");
  if(weakBox){
    const weak = JSON.parse(localStorage.getItem("kpc_v25_weak_keys") || "{}");
    const rows = Object.entries(weak).map(([key,v])=>({key, hit:Number(v.hit||0), miss:Number(v.miss||0)}))
      .filter(x=>x.hit+x.miss>0).sort((a,b)=>b.miss-a.miss).slice(0,8);
    weakBox.innerHTML = rows.length ? rows.map(x=>{
      const total=x.hit+x.miss; const acc=Math.round((x.hit/total)*100);
      return `<div class="v25-weak-row"><b>${x.key}</b><span>${acc}% accuracy • ${x.miss} misses</span><i style="width:${100-acc}%"></i></div>`;
    }).join("") : '<p>No weak keys yet. Start a lesson first.</p>';
  }

}

window.KPCGamification = {kpcGetStats,kpcSaveStats,kpcAwardXP,kpcUpdateAll,kpcProgressDaily,kpcClaimDaily,kpcCheckAchievements};
document.addEventListener("DOMContentLoaded", kpcUpdateAll);
