
(function(){
  "use strict";

  const STORAGE_KEYS = {
    weak: "kpc_v25_weak_keys",
    xp: "kpc_academy_xp",
    completed: "kpc_v35_completed",
    history: "kpc_typing_history",
    lastActivity: "kpc_analytics_last_activity",
    streak: "kpc_analytics_streak"
  };

  function safeJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }

  function getWeakKeys(){
    return safeJSON(STORAGE_KEYS.weak, {});
  }

  function getXP(){
    return Number(localStorage.getItem(STORAGE_KEYS.xp) || 0);
  }

  function getCompleted(){
    const data = safeJSON(STORAGE_KEYS.completed, []);
    return Array.isArray(data) ? data : [];
  }

  function getHistory(){
    let history = safeJSON(STORAGE_KEYS.history, []);
    if(!Array.isArray(history)) history = [];
    if(history.length === 0){
      const total = Number(localStorage.getItem("kpc_academy_total") || 0);
      const correct = Number(localStorage.getItem("kpc_academy_correct") || 0);
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const xp = getXP();
      if(total || xp){
        history.push({ date:new Date().toISOString().slice(0,10), accuracy, wpm: Number(localStorage.getItem("kpc_last_wpm") || 0), xp });
      }
    }
    return history.slice(-14);
  }

  function updateActivity(){
    const today = new Date().toISOString().slice(0,10);
    const last = localStorage.getItem(STORAGE_KEYS.lastActivity);
    let streak = Number(localStorage.getItem(STORAGE_KEYS.streak) || 0);
    if(last !== today){
      if(last){
        const lastDate = new Date(last + "T00:00:00");
        const nowDate = new Date(today + "T00:00:00");
        const diff = Math.round((nowDate - lastDate) / 86400000);
        streak = diff === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      localStorage.setItem(STORAGE_KEYS.lastActivity, today);
      localStorage.setItem(STORAGE_KEYS.streak, String(streak));
    }
    return Number(localStorage.getItem(STORAGE_KEYS.streak) || streak || 0);
  }

  function sortedWeakKeys(){
    const data = getWeakKeys();
    return Object.entries(data).map(([key, value]) => {
      const miss = Number(value.miss || 0);
      const hit = Number(value.hit || 0);
      const total = miss + hit;
      return { key, miss, hit, total, errorRate: total ? Math.round((miss / total) * 100) : 0 };
    }).sort((a,b) => (b.errorRate - a.errorRate) || (b.miss - a.miss) || a.key.localeCompare(b.key));
  }

  function reset(){
    [
      STORAGE_KEYS.history, STORAGE_KEYS.streak, STORAGE_KEYS.lastActivity,
      STORAGE_KEYS.weak
    ].forEach(k => localStorage.removeItem(k));
  }

  window.KPCAnalytics = {
    getWeakKeys, getXP, getCompleted, getHistory, updateActivity, sortedWeakKeys, reset
  };
})();
