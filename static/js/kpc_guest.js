(function(){
  'use strict';
  const STORE = {
    id: 'kpc_guest_id',
    name: 'kpc_player_name',
    attempts: 'kpc_guest_attempts',
    country: 'kpc_guest_country'
  };
  function safeText(value, fallback=''){
    const raw = String(value ?? fallback ?? '').trim();
    return raw.replace(/[^0-9A-Za-z_\- .@\u1780-\u17FF]/g, '').slice(0, 40) || fallback;
  }
  function uid(){
    let id = localStorage.getItem(STORE.id);
    if(!id){
      id = 'guest_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORE.id, id);
    }
    return id;
  }
  function name(){
    let n = safeText(localStorage.getItem(STORE.name), 'Guest Player');
    if(!n || n === 'Player') n = 'Guest Player';
    localStorage.setItem(STORE.name, n);
    return n;
  }
  function setName(value){
    const n = safeText(value, 'Guest Player');
    localStorage.setItem(STORE.name, n);
    return n;
  }
  function country(){ return safeText(localStorage.getItem(STORE.country), 'Cambodia') || 'Cambodia'; }
  function readAttempts(){
    try{
      const rows = JSON.parse(localStorage.getItem(STORE.attempts) || '[]');
      return Array.isArray(rows) ? rows.filter(Boolean) : [];
    }catch(e){ return []; }
  }
  function writeAttempts(rows){
    localStorage.setItem(STORE.attempts, JSON.stringify(rows.slice(0, 200)));
  }
  function num(v, fallback=0){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function legacyAttempt(){
    const bestWpm = num(localStorage.getItem('kpc_best_wpm')) || num(localStorage.getItem('kpc_last_wpm'));
    const accuracy = num(localStorage.getItem('kpc_last_accuracy'));
    const score = num(localStorage.getItem('kpc_best_score'));
    if(!bestWpm && !accuracy && !score) return null;
    return {
      id: 'legacy_' + uid(),
      mode: 'speed',
      lesson_id: 'Saved browser progress',
      wpm: bestWpm,
      accuracy: accuracy || 0,
      score,
      correct_keys: 0,
      wrong_keys: 0,
      total_keys: 0,
      duration_sec: 60,
      weak_keys: [],
      created_at: new Date().toISOString(),
      player_name: name(),
      country: country(),
      legacy: true
    };
  }
  function attempts(){
    const rows = readAttempts();
    if(rows.length) return rows;
    const legacy = legacyAttempt();
    return legacy ? [legacy] : [];
  }
  function recordAttempt(data){
    const now = new Date().toISOString();
    const item = {
      id: String(data.id || data.attempt_id || ('local_' + Date.now() + '_' + Math.random().toString(36).slice(2,7))),
      mode: safeText(data.mode || data.game || 'speed', 'speed').toLowerCase(),
      lesson_id: safeText(data.lesson_id || data.lesson_name || data.title || 'Typing Test', 'Typing Test'),
      wpm: Math.max(0, Math.round(num(data.wpm) * 10) / 10),
      accuracy: Math.max(0, Math.min(100, Math.round(num(data.accuracy, 100) * 10) / 10)),
      score: Math.max(0, Math.round(num(data.score))),
      correct_keys: Math.max(0, Math.round(num(data.correct_keys || data.correct))),
      wrong_keys: Math.max(0, Math.round(num(data.wrong_keys || data.errors))),
      total_keys: Math.max(0, Math.round(num(data.total_keys || data.typed_length))),
      duration_sec: Math.max(0, Math.round(num(data.duration_sec, 60))),
      weak_keys: Array.isArray(data.weak_keys) ? data.weak_keys.map(k => String(k).slice(0,8)).slice(0,20) : [],
      created_at: data.created_at || now,
      player_name: safeText(data.player_name || name(), name()),
      country: safeText(data.country || country(), country())
    };
    const rows = readAttempts().filter(r => r && r.id !== item.id);
    rows.unshift(item);
    writeAttempts(rows);
    localStorage.setItem('kpc_last_wpm', String(item.wpm));
    localStorage.setItem('kpc_last_accuracy', String(item.accuracy));
    localStorage.setItem('kpc_best_wpm', String(Math.max(num(localStorage.getItem('kpc_best_wpm')), item.wpm)));
    localStorage.setItem('kpc_best_score', String(Math.max(num(localStorage.getItem('kpc_best_score')), item.score)));
    localStorage.setItem('kpc_tests_completed', String(attempts().length));
    if(item.mode === 'lesson' || item.mode === 'training'){
      const lessons = new Set(JSON.parse(localStorage.getItem('kpc_completed_lessons') || '[]'));
      lessons.add(String(item.lesson_id));
      localStorage.setItem('kpc_completed_lessons', JSON.stringify([...lessons]));
      localStorage.setItem('kpc_lessons_completed', String(lessons.size));
    }
    return item;
  }
  function stats(){
    const rows = attempts();
    const count = rows.length;
    const best = rows.reduce((a,b) => (num(b.wpm) > num(a.wpm) ? b : a), {wpm:0, accuracy:0, score:0});
    const totalWpm = rows.reduce((s,r)=>s+num(r.wpm),0);
    const totalAcc = rows.reduce((s,r)=>s+num(r.accuracy),0);
    const totalSec = rows.reduce((s,r)=>s+num(r.duration_sec),0);
    const wrong = rows.reduce((s,r)=>s+num(r.wrong_keys),0);
    const correct = rows.reduce((s,r)=>s+num(r.correct_keys),0);
    const weak = {};
    rows.forEach(r => (r.weak_keys || []).forEach(k => { const key=String(k).toUpperCase().slice(0,8); if(key) weak[key]=(weak[key]||0)+1; }));
    const xp = num(localStorage.getItem('kpc_xp')) || (count * 10 + num(localStorage.getItem('kpc_lessons_completed')) * 25);
    return {
      is_guest: true,
      player_name: name(),
      country: country(),
      tests_completed: count,
      best_wpm: Math.round(num(best.wpm) * 10) / 10,
      best_accuracy: Math.round(Math.max(...rows.map(r=>num(r.accuracy)), 0) * 10) / 10,
      best_score: Math.max(...rows.map(r=>num(r.score)), 0),
      avg_wpm: count ? Math.round((totalWpm / count) * 10) / 10 : 0,
      avg_accuracy: count ? Math.round((totalAcc / count) * 10) / 10 : 0,
      total_practice_minutes: Math.round((totalSec / 60) * 10) / 10,
      correct_keys: correct,
      wrong_keys: wrong,
      lessons_completed: num(localStorage.getItem('kpc_lessons_completed')),
      xp,
      level: Math.floor(xp / 100) + 1,
      streak: num(localStorage.getItem('kpc_streak')),
      best_streak: num(localStorage.getItem('kpc_best_streak')),
      weak_key_heatmap: Object.entries(weak).sort((a,b)=>b[1]-a[1]).map(([key,count])=>({key,count}))
    };
  }
  function localLeaderboard(){
    return attempts()
      .filter(r => num(r.wpm) || num(r.score))
      .sort((a,b)=>num(b.wpm)-num(a.wpm) || num(b.accuracy)-num(a.accuracy) || num(b.score)-num(a.score))
      .slice(0,50)
      .map((r,i)=>({
        rank: i+1,
        username: r.player_name || name(),
        country: r.country || country(),
        game_mode: r.mode || 'speed',
        score: num(r.score),
        wpm: num(r.wpm),
        accuracy: num(r.accuracy),
        xp: 0,
        career_rank: 'Guest',
        created_at: r.created_at,
        local: true
      }));
  }
  function analytics(){
    const rows = attempts().slice().sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
    const s = stats();
    const dailyMap = {};
    rows.forEach(r=>{
      const day = String(r.created_at || '').slice(0,10) || 'Today';
      const item = dailyMap[day] || (dailyMap[day] = {date:day, sessions:0, avg_wpm:0, avg_accuracy:0, practice_minutes:0});
      item.sessions += 1;
      item.avg_wpm += num(r.wpm);
      item.avg_accuracy += num(r.accuracy);
      item.practice_minutes += num(r.duration_sec)/60;
    });
    const daily = Object.values(dailyMap).map(d=>({
      ...d,
      avg_wpm: d.sessions ? Math.round((d.avg_wpm/d.sessions)*10)/10 : 0,
      avg_accuracy: d.sessions ? Math.round((d.avg_accuracy/d.sessions)*10)/10 : 0,
      practice_minutes: Math.round(d.practice_minutes*10)/10
    }));
    return {
      ok: true,
      guest: true,
      session_count: rows.length,
      best_wpm: s.best_wpm,
      avg_wpm: s.avg_wpm,
      best_accuracy: s.best_accuracy,
      avg_accuracy: s.avg_accuracy,
      total_practice_minutes: s.total_practice_minutes,
      total_keys: s.correct_keys + s.wrong_keys,
      wrong_keys: s.wrong_keys,
      weak_key_heatmap: s.weak_key_heatmap,
      speed_trend: daily.slice(-14).map(d=>({label:d.date, value:d.avg_wpm})),
      accuracy_trend: daily.slice(-14).map(d=>({label:d.date, value:d.avg_accuracy})),
      recent_sessions: rows.slice().reverse().slice(0,10).map(r=>({
        created_at: r.created_at,
        mode: r.mode,
        lesson_id: r.lesson_id,
        wpm: r.wpm,
        accuracy: r.accuracy,
        weak_keys: r.weak_keys || []
      }))
    };
  }
  function emptyState(title, text){
    return `<div class="kpc-empty-state"><b>${escapeHtml(title)}</b><p>${escapeHtml(text || '')}</p></div>`;
  }
  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  window.KPCGuest = {uid, name, setName, country, attempts, recordAttempt, stats, localLeaderboard, analytics, emptyState, escapeHtml, safeText};
})();
