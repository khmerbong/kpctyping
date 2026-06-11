(function(){
  'use strict';

  const WORDS = {
    easy: 'apple banana school future typing rocket window happy garden family lesson planet music teacher speed orange silver memory number puzzle winner bright strong simple calm smile dream water light clean green small quick brown house chair table phone river sunny cloud pencil story friendly practice morning evening'.split(' '),
    medium: 'keyboard computer accuracy progress challenge improve careful rhythm focused premium dashboard leaderboard tournament creative sentence paragraph energy journey balance confident browser mobile responsive practice result mistake correct highlight character shortcut restart analysis'.split(' '),
    hard: 'synchronization architecture productivity concentration extraordinary transformation authentication visualization optimization professional responsibility championship compatibility implementation accessibility performance analytics infrastructure psychological development'.split(' ')
  };

  const SENTENCES = {
    easy: [
      'Keep your hands relaxed and type with a steady rhythm.',
      'Small practice every day can build strong typing skill.',
      'Look at the words and let your fingers move calmly.'
    ],
    medium: [
      'Accuracy creates speed because every correction costs time and focus.',
      'A clean typing flow feels smooth when your eyes stay ahead of your hands.',
      'Consistent practice turns difficult keys into easy muscle memory.'
    ],
    hard: [
      'Professional typists balance concentration, accuracy, rhythm, and efficient correction habits.',
      'Optimization is not only about speed; it is also about reducing unnecessary movement.',
      'Accessibility and responsive interaction make a typing experience feel polished on every device.'
    ]
  };

  const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const state = {
    difficulty: 'easy', duration: 60, running: false, paused: false, startedAt: 0, pauseStartedAt: 0, pausedMs: 0,
    timer: null, target: '', typed: '', correctChars: 0, typedChars: 0, errors: 0, streak: 0, bestStreak: 0,
    wrongKeys: {}, sound: false, bestWpm: Number(localStorage.getItem('kpc_best_wpm') || 0)
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    shell: document.querySelector('[data-typing-shell]'), start: $('startBtn'), input: $('typingInput'), text: $('typingText'),
    time: $('timeLeft'), wpm: $('wpm'), accuracy: $('accuracy'), errors: $('errors'), streak: $('streak'), bestStreak: $('bestStreak'),
    message: $('message'), progress: $('progressBar'), heatmap: $('heatmap'), raw: $('rawWpmLabel'), insights: $('insightsList'),
    focusBtn: $('focusModeBtn'), soundBtn: $('soundToggleBtn'), pause: $('pauseOverlay'), resume: $('resumeBtn'), restartPause: $('restartPauseBtn'),
    result: $('resultModal'), resultWpm: $('resultWpm'), resultAccuracy: $('resultAccuracy'), resultErrors: $('resultErrors'), resultStreak: $('resultStreak'),
    resultAdvice: $('resultAdvice'), closeResult: $('closeResultBtn'), playAgain: $('playAgainBtn')
  };

  window.KPCGameStats = window.KPCGameStats || { score: 0, best: 0, level: 1, combo: 0 };

  function shuffle(arr){ return [...arr].sort(() => Math.random() - 0.5); }
  function generateTarget(){
    const words = shuffle(WORDS[state.difficulty]);
    const sentence = SENTENCES[state.difficulty][Math.floor(Math.random() * SENTENCES[state.difficulty].length)];
    const count = state.duration === 30 ? 34 : state.duration === 60 ? 72 : 130;
    const pool = [];
    while (pool.join(' ').length < count * 6) pool.push(...shuffle(words));
    return `${sentence} ${pool.slice(0, count).join(' ')}.`;
  }

  function escapeHtml(str){
    return str.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function renderText(){
    const typed = state.typed;
    let html = '';
    for (let i = 0; i < state.target.length; i++) {
      const targetChar = state.target[i];
      let cls = 'char';
      if (i < typed.length) cls += typed[i] === targetChar ? ' correct' : ' wrong';
      if (i === typed.length && state.running && !state.paused) cls += ' current';
      html += `<span class="${cls}">${targetChar === ' ' ? '&nbsp;' : escapeHtml(targetChar)}</span>`;
    }
    els.text.innerHTML = html || '<span class="muted">Press Start test to begin.</span>';
  }

  function elapsedSeconds(){
    if (!state.startedAt) return 0;
    const end = state.paused ? state.pauseStartedAt : Date.now();
    return Math.max(0, (end - state.startedAt - state.pausedMs) / 1000);
  }
  function remainingSeconds(){ return Math.max(0, state.duration - Math.floor(elapsedSeconds())); }
  function calcStats(){
    const seconds = Math.max(elapsedSeconds(), 1);
    const minutes = seconds / 60;
    const wpm = Math.round((state.correctChars / 5) / minutes);
    const rawWpm = Math.round((state.typedChars / 5) / minutes);
    const accuracy = state.typedChars === 0 ? 100 : Math.max(0, Math.round((state.correctChars / state.typedChars) * 100));
    return { wpm, rawWpm, accuracy, seconds, remaining: remainingSeconds() };
  }
  function updateStats(){
    const s = calcStats();
    els.time.textContent = s.remaining;
    els.wpm.textContent = s.wpm;
    els.accuracy.textContent = `${s.accuracy}%`;
    els.errors.textContent = state.errors;
    els.streak.textContent = state.streak;
    els.bestStreak.textContent = state.bestStreak;
    els.raw.textContent = `Raw WPM ${s.rawWpm}`;
    els.progress.style.width = `${Math.min(100, (elapsedSeconds() / state.duration) * 100)}%`;
    window.currentWpm = s.wpm;
    window.KPCGameStats.score = s.wpm;
    window.KPCGameStats.combo = state.bestStreak;
    window.KPCGameStats.best = Math.max(window.KPCGameStats.best || 0, s.wpm);
  }

  function renderHeatmap(){
    els.heatmap.innerHTML = keyboardRows.map(row => `<div class="heatmap-row">${row.split('').map(k => {
      const n = state.wrongKeys[k.toLowerCase()] || 0;
      const level = n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0;
      return `<span class="heat-key level-${level}" title="${k}: ${n} errors">${k}</span>`;
    }).join('')}</div>`).join('');
  }

  function updateInsights(){
    const weak = Object.entries(state.wrongKeys).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => k.toUpperCase());
    const s = calcStats();
    const lines = [];
    if (weak.length) lines.push(`Focus on these weak keys next: ${weak.join(', ')}.`);
    else lines.push('No weak keys yet. Keep the rhythm clean.');
    if (s.accuracy < 90) lines.push('Slow down slightly; accuracy will raise your final WPM.');
    else if (s.wpm >= 60) lines.push('Great pace. Try keeping the same rhythm until the end.');
    else lines.push('Use steady breathing and avoid rushing after mistakes.');
    lines.push(`Best WPM saved on this device: ${state.bestWpm}.`);
    els.insights.innerHTML = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('');
  }

  function beep(type){
    if (!state.sound || !window.AudioContext && !window.webkitAudioContext) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = type === 'wrong' ? 170 : type === 'finish' ? 520 : 360;
    gain.gain.value = 0.035;
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, type === 'finish' ? 160 : 55);
  }

  function startTest(){
    clearInterval(state.timer);
    state.running = true; state.paused = false; state.startedAt = Date.now(); state.pauseStartedAt = 0; state.pausedMs = 0;
    state.target = generateTarget(); state.typed = ''; state.correctChars = 0; state.typedChars = 0; state.errors = 0; state.streak = 0; state.bestStreak = 0; state.wrongKeys = {};
    els.input.disabled = false; els.input.value = ''; els.input.focus();
    els.start.textContent = 'Restart';
    els.message.textContent = 'Typing started. Keep your eyes on the highlighted cursor.';
    hideResult(); hidePause(); renderText(); renderHeatmap(); updateInsights(); updateStats();
    state.timer = setInterval(() => { updateStats(); if (remainingSeconds() <= 0) finishTest(); }, 250);
  }

  function finishTest(){
    if (!state.running) return;
    state.running = false; state.paused = false; clearInterval(state.timer);
    els.input.disabled = true; els.input.blur();
    updateStats(); renderText(); updateInsights(); beep('finish');
    const s = calcStats();
    if (s.wpm > state.bestWpm) { state.bestWpm = s.wpm; localStorage.setItem('kpc_best_wpm', String(s.wpm)); }
    els.resultWpm.textContent = s.wpm;
    els.resultAccuracy.textContent = `${s.accuracy}%`;
    els.resultErrors.textContent = state.errors;
    els.resultStreak.textContent = state.bestStreak;
    els.resultAdvice.textContent = makeAdvice(s);
    els.result.hidden = false;
    submitLeaderboardScore('speed', s.wpm, state.bestStreak, 1, s.wpm);
    if (window.KPCAchievements && s.wpm >= 100) window.KPCAchievements.check({ wpm: s.wpm });
  }

  function makeAdvice(s){
    if (s.accuracy < 85) return 'Accuracy is the biggest upgrade point. Try an easier mode and reduce corrections.';
    if (s.wpm < 35) return 'Nice start. Practice short sessions daily and keep your wrists relaxed.';
    if (s.wpm < 70) return 'Good typing flow. Push speed slowly without sacrificing accuracy.';
    return 'Excellent work. Try hard mode or 120 seconds for endurance training.';
  }

  function handleInput(){
    if (!state.running || state.paused) return;
    const value = els.input.value;
    const oldTyped = state.typed;
    state.typed = value.slice(0, state.target.length);
    els.input.value = state.typed;
    state.typedChars = state.typed.length;
    state.correctChars = 0; state.errors = 0; state.streak = 0; state.bestStreak = 0; state.wrongKeys = {};
    for (let i = 0; i < state.typed.length; i++) {
      if (state.typed[i] === state.target[i]) { state.correctChars++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak); }
      else { state.errors++; state.streak = 0; const key = (state.target[i] || state.typed[i] || '').toLowerCase(); if(/[a-z]/.test(key)) state.wrongKeys[key] = (state.wrongKeys[key] || 0) + 1; }
    }
    if (state.typed.length > oldTyped.length) {
      const idx = state.typed.length - 1;
      const ok = state.typed[idx] === state.target[idx];
      beep(ok ? 'correct' : 'wrong');
      if (!ok && els.shell) { els.shell.classList.remove('shake'); void els.shell.offsetWidth; els.shell.classList.add('shake'); }
    }
    renderText(); renderHeatmap(); updateStats(); updateInsights();
    if (state.typed.length >= state.target.length) finishTest();
  }

  function pauseTest(){
    if (!state.running || state.paused) return;
    state.paused = true; state.pauseStartedAt = Date.now(); els.input.disabled = true; els.pause.hidden = false; els.message.textContent = 'Paused. Press Esc or Resume to continue.'; renderText();
  }
  function resumeTest(){
    if (!state.running || !state.paused) return;
    state.pausedMs += Date.now() - state.pauseStartedAt; state.paused = false; state.pauseStartedAt = 0; els.input.disabled = false; els.pause.hidden = true; els.input.focus(); els.message.textContent = 'Resumed. Keep going.'; renderText();
  }
  function hidePause(){ els.pause.hidden = true; }
  function hideResult(){ els.result.hidden = true; }
  function toggleFocus(){ document.body.classList.toggle('kpc-focus'); els.focusBtn.textContent = document.body.classList.contains('kpc-focus') ? 'Exit focus' : 'Focus mode'; }
  function toggleSound(){ state.sound = !state.sound; els.soundBtn.textContent = state.sound ? 'Sound on' : 'Sound off'; els.soundBtn.setAttribute('aria-pressed', String(state.sound)); if(state.sound) beep('correct'); }

  function bind(){
    if (!els.start || !els.input || !els.text) return;
    document.querySelectorAll('[data-difficulty]').forEach(btn => btn.addEventListener('click', () => { state.difficulty = btn.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.toggle('active', b === btn)); if(!state.running) { state.target = generateTarget(); state.typed = ''; renderText(); }}));
    document.querySelectorAll('[data-duration]').forEach(btn => btn.addEventListener('click', () => { state.duration = Number(btn.dataset.duration) || 60; document.querySelectorAll('[data-duration]').forEach(b => b.classList.toggle('active', b === btn)); if(!state.running) { els.time.textContent = state.duration; updateStats(); }}));
    els.start.addEventListener('click', startTest);
    els.input.addEventListener('input', handleInput);
    els.input.addEventListener('paste', e => e.preventDefault());
    els.text.addEventListener('click', () => { if(state.running && !state.paused) els.input.focus(); });
    els.resume.addEventListener('click', resumeTest);
    els.restartPause.addEventListener('click', startTest);
    els.closeResult.addEventListener('click', hideResult);
    els.playAgain.addEventListener('click', startTest);
    els.focusBtn.addEventListener('click', toggleFocus);
    els.soundBtn.addEventListener('click', toggleSound);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); state.paused ? resumeTest() : pauseTest(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') { e.preventDefault(); startTest(); }
      if (e.key === 'Tab') { e.preventDefault(); startTest(); }
      if (e.key === 'F11' || (e.key.toLowerCase() === 'f' && e.altKey)) { e.preventDefault(); toggleFocus(); }
    });
    window.resumeGame = resumeTest;
    window.pauseGame = pauseTest;
  }

  function submitLeaderboardScore(game, score, combo = 0, level = 1, wpm = 0) {
    const playerName = localStorage.getItem('kpc_player_name') || 'Player';
    fetch('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.querySelector('meta[name="csrf-token"]') || {}).content || '' },
      body: JSON.stringify({ player_name: playerName, game, score: Math.round(Number(score) || 0), combo: Math.round(Number(combo) || 0), level: Math.round(Number(level) || 1), wpm: Math.round(Number(wpm) || 0) })
    }).then(res => { if (res.ok) toast('🏆 Score saved to leaderboard'); }).catch(() => {});
  }
  function toast(text){
    const el = document.createElement('div'); el.className = 'typing2026-toast'; el.textContent = text; document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 30); setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); }, 1900);
  }

  document.addEventListener('DOMContentLoaded', () => { state.target = generateTarget(); bind(); renderText(); renderHeatmap(); updateStats(); updateInsights(); });
})();
