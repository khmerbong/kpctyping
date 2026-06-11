(() => {
  'use strict';

  const WORDS = {
    easy: 'apple water happy school music garden family bright simple little green blue smile friend light home chair table window banana orange pencil flower morning quiet clean river sunny cloud dream story'.split(' '),
    medium: 'typing keyboard practice future memory silver rocket planet teacher lesson puzzle hunter strong clever journey focused accurate progress rhythm system browser champion energy balance improve smooth native modern'.split(' '),
    hard: 'architecture synchronization extraordinary championship psychological responsibility transformation infrastructure professional complexity calculation development momentum concentration productivity accessibility visualization performance'.split(' ')
  };

  const SENTENCES = {
    easy: ['The sun is warm and the garden is quiet.', 'A happy student types every morning.', 'Small steps can build strong speed.'],
    medium: ['Accuracy creates speed when your rhythm becomes steady.', 'Practice each day and your keyboard confidence will grow.', 'A focused player learns from every typing mistake.'],
    hard: ['Consistent concentration transforms complicated keyboard patterns into natural muscle memory.', 'Professional typists balance precision, rhythm, correction control, and calm breathing.']
  };

  const els = {
    start: document.getElementById('startBtn'), input: document.getElementById('typingInput'), display: document.getElementById('textDisplay'),
    time: document.getElementById('timeLeft'), wpm: document.getElementById('wpm'), raw: document.getElementById('rawWpm'), accuracy: document.getElementById('accuracy'), errors: document.getElementById('errors'), streak: document.getElementById('streak'),
    status: document.getElementById('testStatus'), progress: document.getElementById('progressBar'), duration: document.getElementById('durationSelect'), difficulty: document.getElementById('difficultySelect'), mode: document.getElementById('modeSelect'),
    focus: document.getElementById('focusModeBtn'), pause: document.getElementById('pauseOverlay'), resume: document.getElementById('resumeBtn'), restartPause: document.getElementById('restartFromPauseBtn'),
    result: document.getElementById('resultModal'), resultMsg: document.getElementById('resultMessage'), resultWpm: document.getElementById('resultWpm'), resultAcc: document.getElementById('resultAccuracy'), resultErr: document.getElementById('resultErrors'), resultBest: document.getElementById('resultBest'), tryAgain: document.getElementById('tryAgainBtn'), weakKeys: document.getElementById('weakKeysList'),
    keyboard: document.getElementById('keyboardHeatmap'), sound: document.getElementById('soundToggle')
  };

  if (!els.start || !els.input || !els.display) return;

  let state = resetState();
  let timer = null;
  let soundEnabled = false;
  let bestWpm = Number(localStorage.getItem('kpc_best_wpm_2026') || 0);
  const csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  function resetState() {
    return { running:false, paused:false, text:'', startTime:null, duration:60, timeLeft:60, typedChars:0, correctChars:0, errors:0, streak:0, bestStreak:0, errorMap:{}, lastInput:'', coachEvents:[], lastKeyTime:null };
  }

  function makeText() {
    const difficulty = els.difficulty.value || 'medium';
    const mode = els.mode.value || 'words';
    if (mode === 'sentence') {
      const list = SENTENCES[difficulty] || SENTENCES.medium;
      return Array.from({length: difficulty === 'hard' ? 4 : 5}, () => list[Math.floor(Math.random() * list.length)]).join(' ');
    }
    const list = WORDS[difficulty] || WORDS.medium;
    const count = difficulty === 'hard' ? 54 : difficulty === 'easy' ? 70 : 62;
    return Array.from({length: count}, () => list[Math.floor(Math.random() * list.length)]).join(' ');
  }

  function renderText() {
    els.display.innerHTML = '';
    [...state.text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.index = String(i);
      span.textContent = ch === ' ' ? '·' : ch;
      els.display.appendChild(span);
    });
    updateHighlight();
  }

  function updateHighlight() {
    const typed = els.input.value;
    const spans = els.display.querySelectorAll('.char');
    let correct = 0, errors = 0, streak = 0;
    const map = {};
    spans.forEach((span, i) => {
      span.className = 'char';
      if (i < typed.length) {
        if (typed[i] === state.text[i]) { span.classList.add('correct'); correct++; streak++; }
        else { span.classList.add('incorrect'); errors++; streak = 0; const key = (state.text[i] || typed[i] || '?').toUpperCase(); map[key] = (map[key] || 0) + 1; }
      } else if (i === typed.length) span.classList.add('current');
    });
    state.typedChars = typed.length;
    state.correctChars = correct;
    state.errors = errors;
    state.streak = streak;
    state.bestStreak = Math.max(state.bestStreak, streak);
    state.errorMap = map;
    updateStats();
  }

  function elapsedMinutes() {
    if (!state.startTime) return 1 / 60;
    return Math.max((Date.now() - state.startTime) / 60000, 1 / 60);
  }

  function calcStats() {
    const minutes = elapsedMinutes();
    const wpm = Math.round((state.correctChars / 5) / minutes);
    const raw = Math.round((state.typedChars / 5) / minutes);
    const acc = state.typedChars === 0 ? 100 : Math.max(0, Math.round((state.correctChars / state.typedChars) * 100));
    return { wpm, raw, acc };
  }

  function updateStats() {
    const stats = calcStats();
    els.time.textContent = state.timeLeft;
    els.wpm.textContent = stats.wpm;
    els.raw.textContent = stats.raw;
    els.accuracy.textContent = `${stats.acc}%`;
    els.errors.textContent = state.errors;
    els.streak.textContent = state.streak;
    els.progress.style.width = `${Math.min(100, (state.typedChars / Math.max(state.text.length, 1)) * 100)}%`;
    window.currentWpm = stats.wpm;
    window.KPCGameStats = { score: stats.wpm, best: bestWpm, level: 1, combo: state.bestStreak, wpm: stats.wpm, accuracy: stats.acc };
    renderKeyboard();
  }

  function renderKeyboard() {
    const keys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
    els.keyboard.innerHTML = keys.map(k => `<span class="typing2026-key ${(state.errorMap[k] || 0) > 0 ? 'hot' : ''}" title="${state.errorMap[k] || 0} errors">${k}</span>`).join('');
  }

  function startTest() {
    clearInterval(timer);
    state = resetState();
    state.duration = Number(els.duration.value || 60);
    state.timeLeft = state.duration;
    state.text = makeText();
    state.running = true;
    state.startTime = Date.now();
    state.lastKeyTime = state.startTime;
    els.result.hidden = true;
    els.pause.hidden = true;
    els.input.disabled = false;
    els.input.value = '';
    els.input.placeholder = 'Type the text here...';
    els.start.textContent = 'Restart';
    els.status.textContent = 'Typing live';
    renderText();
    updateStats();
    els.input.focus();
    timer = setInterval(tick, 1000);
  }

  function tick() {
    if (!state.running || state.paused) return;
    state.timeLeft = Math.max(0, state.duration - Math.floor((Date.now() - state.startTime) / 1000));
    updateStats();
    if (state.timeLeft <= 0 || state.typedChars >= state.text.length) finishTest();
  }

  function finishTest() {
    if (!state.running) return;
    state.running = false;
    clearInterval(timer);
    els.input.disabled = true;
    els.status.textContent = 'Complete';
    const stats = calcStats();
    bestWpm = Math.max(bestWpm, stats.wpm);
    localStorage.setItem('kpc_best_wpm_2026', String(bestWpm));
    els.resultWpm.textContent = stats.wpm;
    els.resultAcc.textContent = `${stats.acc}%`;
    els.resultErr.textContent = state.errors;
    els.resultBest.textContent = bestWpm;
    els.resultMsg.textContent = stats.wpm >= 70 ? 'Excellent speed. Keep your accuracy strong.' : stats.wpm >= 40 ? 'Good work. Build consistency and reduce weak keys.' : 'Nice start. Slow down slightly and focus on clean accuracy.';
    renderWeakKeys();
    sendCoachEvents(stats);
    els.result.hidden = false;
    submitLeaderboardScore('speed', stats.wpm, state.bestStreak, 1, stats.wpm);
  }



  function sendCoachEvents(stats) {
    if (!window.KPCAICoach || !state.coachEvents.length) return;
    const difficulty = els.difficulty.value || 'medium';
    const mode = els.mode.value || 'words';
    window.KPCAICoach.track(state.coachEvents.slice(0, 240), `Typing Test 2026 · ${difficulty} · ${mode} · ${stats.wpm} WPM`).catch(() => {});
  }

  function renderWeakKeys() {
    const entries = Object.entries(state.errorMap).sort((a,b) => b[1] - a[1]).slice(0, 8);
    els.weakKeys.innerHTML = entries.length ? entries.map(([k,v]) => `<span>${k}: ${v}</span>`).join('') : 'No weak keys yet. Great accuracy.';
  }

  function pauseTest() { if (!state.running || state.paused) return; state.paused = true; els.pause.hidden = false; els.input.blur(); }
  function resumeTest() { if (!state.running || !state.paused) return; state.paused = false; state.startTime = Date.now() - ((state.duration - state.timeLeft) * 1000); els.pause.hidden = true; els.input.focus(); }

  function beep(type) {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.frequency.value = type === 'error' ? 140 : 520; gain.gain.value = .035; osc.connect(gain); gain.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 45);
    } catch (_) {}
  }

  function submitLeaderboardScore(game, score, combo = 0, level = 1, wpm = 0) {
    const playerName = localStorage.getItem('kpc_player_name') || 'Player';
    fetch('/api/submit-score', { method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf}, body:JSON.stringify({player_name:playerName, game, score:Math.round(Number(score)||0), combo:Math.round(Number(combo)||0), level:Math.round(Number(level)||1), wpm:Math.round(Number(wpm)||0)}) }).catch(() => {});
  }

  els.start.addEventListener('click', startTest);
  els.tryAgain.addEventListener('click', startTest);
  els.resume.addEventListener('click', resumeTest);
  els.restartPause.addEventListener('click', startTest);
  els.focus.addEventListener('click', () => document.body.classList.toggle('typing-2026-focus'));
  els.sound.addEventListener('click', () => { soundEnabled = !soundEnabled; els.sound.textContent = soundEnabled ? 'Sound On' : 'Sound Off'; els.sound.setAttribute('aria-pressed', String(soundEnabled)); });

  els.input.addEventListener('input', () => {
    if (!state.running || state.paused) return;
    const typed = els.input.value;
    if (typed.length > state.lastInput.length) {
      const idx = typed.length - 1;
      const now = Date.now();
      const isCorrect = typed[idx] === state.text[idx];
      const keyValue = (state.text[idx] || typed[idx] || '?');
      const delta = Math.max(0, Math.min(60000, now - (state.lastKeyTime || now)));
      state.coachEvents.push({ key: keyValue, correct: isCorrect, time_ms: delta, slow: delta >= 900 });
      if (state.coachEvents.length > 260) state.coachEvents = state.coachEvents.slice(-260);
      state.lastKeyTime = now;
      beep(isCorrect ? 'ok' : 'error');
    }
    state.lastInput = typed;
    updateHighlight();
    if (state.typedChars >= state.text.length) finishTest();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); state.paused ? resumeTest() : pauseTest(); }
    if (e.key === 'Tab') { e.preventDefault(); startTest(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') { e.preventDefault(); startTest(); }
  });

  document.addEventListener('click', () => { if (state.running && !state.paused) els.input.focus(); });

  state.text = makeText();
  renderText();
  renderKeyboard();
})();
