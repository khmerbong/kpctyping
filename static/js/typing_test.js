(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = (id) => document.getElementById(id);
  const startBtn = $('startBtn');
  const input = $('typingInput');
  const wpmEl = $('wpm');
  const accuracyEl = $('accuracy');
  const scoreEl = $('score');
  const timeEl = $('timeLeft');
  const typeBox = document.querySelector('.type-box');
  if(!startBtn || !input || !typeBox) return;

  const keyboardDetails = document.querySelector('.kpc-keyboard-details[data-desktop-open]');
  if(keyboardDetails){
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 780px)').matches;
    keyboardDetails.open = !isMobile;
  }

  function isMobileViewport(){
    return window.matchMedia ? window.matchMedia('(max-width: 780px)').matches : window.innerWidth <= 780;
  }
  function keepTypingAreaComfortable(){
    if(!isMobileViewport()) return;
    const card = document.querySelector('.beginner-type-card') || typeBox;
    if(card && typeof card.scrollIntoView === 'function'){
      setTimeout(() => card.scrollIntoView({block:'start', inline:'nearest', behavior:'smooth'}), 70);
    }
  }
  function focusTypingInput(){
    if(!started && !ended) return;
    try{ input.focus({preventScroll:true}); }catch(e){ try{ input.focus(); }catch(_){} }
  }

  const originalText = (typeBox.textContent || '').replace(/\s+/g,' ').trim();
  const textBank = [
    'The quick brown fox jumps over the lazy dog. Practice makes perfect typing. Keep your eyes on the text and let your fingers move smoothly.',
    'Every clean sentence builds better rhythm. Type slowly first, keep your hands relaxed, and let speed come naturally after your accuracy feels steady.',
    'Strong typing is not about rushing. It is about reading ahead, pressing the right key, and keeping the same calm pace from start to finish.',
    'When you make a mistake, do not panic. Correct your focus, breathe for a moment, and continue typing with confidence and control.',
    'Good practice should feel long enough to train your fingers. Keep moving through each word until the timer ends and your final score is saved.',
    'A fast typist uses accuracy, rhythm, and patience. Watch the next letter, trust your fingers, and try to make every line cleaner than the last.',
    'Typing every day for a few minutes can make a big difference. Small practice sessions help your hands remember the keyboard faster.',
    'Do not look down too often. Let your eyes stay on the screen while your fingers learn where each letter belongs on the keyboard.',
    'Clean typing starts with simple words, then grows into longer sentences, symbols, numbers, and real work that needs focus.',
    'Keep your shoulders relaxed and your wrists light. A comfortable position helps you type longer without losing speed or accuracy.',
    'Learning to type well is like learning music. The keys have rhythm, the words have flow, and practice makes the motion feel natural.',
    'Today is a good time to improve. Type with care, finish every word, and keep going until the timer reaches zero.'
  ];
  function pickText(except){
    const choices = textBank.filter(t => t !== except);
    return choices[Math.floor(Math.random() * choices.length)] || textBank[0];
  }
  let target = originalText || pickText('');
  let lastBankText = target;
  let segmentCount = 1;
  function appendMoreText(){
    const next = pickText(lastBankText);
    lastBankText = next;
    segmentCount += 1;
    target = (target + ' ' + next).replace(/\s+/g, ' ').trim();
    const label = document.getElementById('typingTextStatus');
    if(label) label.textContent = `Text ${segmentCount} loaded automatically · Keep typing until time ends`;
  }
  let started = false, ended = false, startAt = 0, endAt = 0, timer = null, seconds = 60;
  let lastScrollAt = 0;
  let lastTypedLength = 0;
  let lastAnimIndex = -1;
  let lastAnimGood = true;
  let progressBar = null;

  function ensureProgressBar(){
    if(progressBar) return progressBar;
    const wrap = document.createElement('div');
    wrap.className = 'kpc-typing-progress';
    wrap.setAttribute('aria-label','Typing progress');
    wrap.innerHTML = '<span></span>';
    typeBox.insertAdjacentElement('afterend', wrap);
    progressBar = wrap.querySelector('span');
    return progressBar;
  }
  function showSuccessBurst(title='Great job!', sub='Lesson completed'){
    const old = document.querySelector('.kpc-success-burst');
    if(old) old.remove();
    const burst = document.createElement('div');
    burst.className = 'kpc-success-burst';
    let confetti = '';
    for(let i=0;i<12;i++){
      const x = Math.round((Math.random()*2-1)*170);
      const y = Math.round(-70-Math.random()*190);
      const left = 50 + (Math.random()*18-9);
      const top = 50 + (Math.random()*10-5);
      confetti += `<i class="kpc-confetti" style="left:${left}%;top:${top}%;--x:${x}px;--y:${y}px;animation-delay:${Math.random()*0.12}s"></i>`;
    }
    burst.innerHTML = `${confetti}<div class="kpc-success-burst-inner"><b>🎉 ${title}</b><br><small>${sub}</small></div>`;
    document.body.appendChild(burst);
    setTimeout(()=>burst.remove(), 1500);
  }

  function getGuestName(){
    let name = localStorage.getItem('kpc_player_name');
    if(!name){ name = 'Guest' + Math.floor(Math.random()*9000+1000); localStorage.setItem('kpc_player_name', name); }
    return name;
  }
  function showTypingToast(message, type='info'){
    try{
      if(window.KPCToast && typeof window.KPCToast.show === 'function') return window.KPCToast.show(message, type);
      if(typeof window.showToast === 'function') return window.showToast(message, type);
    }catch(e){}
  }
  function setSaveStatus(message, type='info'){
    const result = document.getElementById('kpcTypingResult');
    if(result){
      let status = result.querySelector('[data-save-status]');
      if(!status){
        status = document.createElement('small');
        status.setAttribute('data-save-status','');
        status.className = 'kpc-save-status';
        result.appendChild(document.createElement('br'));
        result.appendChild(status);
      }
      status.textContent = message;
      status.dataset.type = type;
    }
    showTypingToast(message, type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
  }
  function escapeHtml(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function visibleChar(ch){ return ch === ' ' ? '␣' : ch; }
  function charClass(ch, base){ return base + (ch === ' ' ? ' current-space' : ''); }
  function renderText(){
    const typed = input.value || '';
    while(target.length - typed.length < 120 && !ended){ appendMoreText(); }
    let html = '';
    for(let i=0;i<target.length;i++){
      const ch = target[i];
      if(i < typed.length){
        const good = typed[i]===ch;
        const anim = i === lastAnimIndex ? (lastAnimGood ? ' kpc-pop' : ' kpc-shake') : '';
        const cls = charClass(ch, (good?'kpc-char-ok':'kpc-char-bad') + anim);
        html += `<span class="${cls}">${escapeHtml(visibleChar(ch))}</span>`;
      }
      else if(i === typed.length){ html += `<span class="${charClass(ch, 'current-letter')}">${escapeHtml(visibleChar(ch))}</span>`; }
      else { html += escapeHtml(visibleChar(ch)); }
    }
    typeBox.innerHTML = html;
    const now = Date.now();
    if(now - lastScrollAt > 180){
      lastScrollAt = now;
      requestAnimationFrame(() => {
        const cur = typeBox.querySelector('.current-letter');
        if(cur && typeof cur.scrollIntoView === 'function'){
          cur.scrollIntoView({block:'center', inline:'nearest'});
        }
      });
    }
  }
  function remainingSeconds(){
    if(!started || !endAt) return seconds;
    return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  }
  function elapsedDuration(){
    return Math.max(10, Math.round(((ended ? Math.min(Date.now(), endAt || Date.now()) : Date.now()) - startAt) / 1000) || 10);
  }
  function calc(){
    const typed = input.value || '';
    const elapsedSec = started ? Math.max((Date.now() - startAt)/1000, 0) : 0;
    const elapsedMin = Math.max(elapsedSec/60, 1/60);
    let correct = 0, errors = 0;
    for(let i=0;i<typed.length;i++){
      if(typed[i] === target[i]) correct++; else errors++;
    }
    const wpm = Math.max(0, Math.round((correct/5)/elapsedMin));
    const displayWpm = (elapsedSec < 3 || correct < 5) ? 0 : wpm;
    const acc = typed.length ? Math.max(0, Math.round((correct/typed.length)*100)) : 100;
    return {typed, correct, errors, wpm, displayWpm, elapsedSec, acc, score: Math.max(0, Math.round(wpm*10 + correct - errors*2))};
  }
  function updateStats(){
    const s = calc();
    if(wpmEl) wpmEl.textContent = s.displayWpm;
    if(accuracyEl) accuracyEl.textContent = s.acc + '%';
    if(scoreEl) scoreEl.textContent = s.errors;
    if(started) seconds = remainingSeconds();
    if(timeEl) timeEl.textContent = seconds + 's';
    const bar = ensureProgressBar();
    const activeSegmentProgress = Math.min(100, Math.round((s.typed.length/Math.max(target.length,1))*100));
    if(bar) bar.style.width = activeSegmentProgress + '%';
    window.KPCGameStats = {score:s.score, best:Math.max(Number(localStorage.getItem('kpc_best_score')||0), s.score), level:1, combo:s.correct, wpm:s.wpm, accuracy:s.acc};
    renderText();
  }
  async function submitScore(){
    const s = calc();
    if(s.correct < 3 && s.wpm <= 0){
      setSaveStatus('Score not saved because the attempt was too short.', 'warning');
      return {saved:false, reason:'too_short'};
    }
    const duration = elapsedDuration();
    localStorage.setItem('kpc_last_wpm', s.wpm);
    localStorage.setItem('kpc_last_accuracy', s.acc);
    localStorage.setItem('kpc_best_wpm', Math.max(Number(localStorage.getItem('kpc_best_wpm')||0), s.wpm));
    localStorage.setItem('kpc_best_score', Math.max(Number(localStorage.getItem('kpc_best_score')||0), s.score));
    if(window.KPCGuest){
      KPCGuest.recordAttempt({mode:'speed', lesson_id:'Typing Test', wpm:s.wpm, accuracy:s.acc, score:s.score, correct_keys:s.correct, wrong_keys:s.errors, total_keys:s.typed.length, duration_sec:duration, player_name:getGuestName(), attempt_id:String(Date.now())});
    }
    let serverSaved = false;
    try{
      const res = await fetch('/api/submit-score', {method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf}, body:JSON.stringify({csrf_token:csrf, player_name:getGuestName(), game:'speed', score:s.score, combo:s.correct, level:1, wpm:s.wpm, accuracy:s.acc, duration_sec:duration, total_keys:s.typed.length, attempt_id:String(Date.now())})});
      const payload = await res.json().catch(()=>({ok:false,error:'Invalid server response'}));
      if(!res.ok || payload.ok === false || payload.success === false){
        const msg = payload.error || payload.message || 'Score was not accepted by the server.';
        setSaveStatus('⚠ ' + msg, 'error');
      }else{
        serverSaved = true;
        const name = payload.player_name ? ` as ${payload.player_name}` : '';
        setSaveStatus('✅ Score saved' + name + '.', 'success');
      }
    }catch(e){
      setSaveStatus('⚠ Score saved locally, but server is offline.', 'warning');
    }
    try{
      const events = target.split('').slice(0, Math.min(input.value.length, 250)).map((key,i)=>({key, correct: input.value[i]===key, time_ms: 280 + Math.floor(Math.random()*180)}));
      await fetch('/api/ai-coach/track', {method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf,'X-Guest-ID':localStorage.getItem('kpc_ai_guest_id')||'guest-local'}, body:JSON.stringify({csrf_token:csrf, lesson_name:'Typing Test', events})});
    }catch(e){}
    return {saved:serverSaved};
  }
  function endGame(){
    if(ended) return; ended = true; document.body.classList.remove('kpc-test-running'); clearInterval(timer); seconds = 0; input.disabled = true; startBtn.textContent = '↻ Restart Test';
    updateStats();
    const s = calc();
    showSuccessBurst('Test finished', `WPM ${s.wpm} · Accuracy ${s.acc}%`);
    let result = document.getElementById('kpcTypingResult');
    if(!result){ result = document.createElement('div'); result.id='kpcTypingResult'; result.className='kpc-live-result ref-card pad kpc-mt-sm'; typeBox.parentElement.appendChild(result); }
    result.innerHTML = `<b>✅ Test finished</b><br>WPM: <b>${s.wpm}</b> · Accuracy: <b>${s.acc}%</b> · Errors: <b>${s.errors}</b><br><small data-save-status>Saving score...</small>`;
    submitScore();
    started = false;
  }
  function start(){
    if(started || ended){ location.reload(); return; }
    seconds = 60; started = true; ended = false; document.body.classList.add('kpc-test-running'); startAt = Date.now(); endAt = startAt + 60000; input.disabled = false; input.value=''; input.classList.remove('kpc-hidden-input'); input.classList.add('kpc-touch-capture'); focusTypingInput(); keepTypingAreaComfortable(); startBtn.textContent = 'Running...';
    lastTypedLength = 0; lastAnimIndex = -1; renderText(); updateStats();
    timer = setInterval(()=>{ seconds = remainingSeconds(); updateStats(); if(seconds<=0) endGame(); },250);
  }
  startBtn.addEventListener('click', start);
  typeBox.addEventListener('click', () => { if(!started && !ended) start(); else focusTypingInput(); });
  input.addEventListener('paste', e => e.preventDefault());
  input.addEventListener('drop', e => e.preventDefault());
  input.addEventListener('input', ()=>{
    if(!started) start();
    const typed = input.value || '';
    if(typed.length > lastTypedLength){
      lastAnimIndex = typed.length - 1;
      lastAnimGood = typed[lastAnimIndex] === target[lastAnimIndex];
    }else{
      lastAnimIndex = -1;
    }
    lastTypedLength = typed.length;
    updateStats();
    if(target.length - input.value.length < 120 && seconds > 1){
      appendMoreText();
      renderText();
    }
  });
  window.KPCTypingTest = { start, endGame, focus: focusTypingInput, calc: calc };
  const guide = document.querySelector('.kpc-keyboard-details[data-desktop-open]');
  if(guide && window.matchMedia && window.matchMedia('(min-width: 980px)').matches){
    // Keep the page clean by default, but open the guide on wide desktops where it helps.
    guide.open = true;
  }
  input.disabled = true; renderText(); updateStats();
})();
