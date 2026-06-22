(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const typeBox = document.getElementById('lessonText') || document.querySelector('.type-box');
  const input = document.getElementById('lessonInput');
  if(!typeBox) return;

  const lessonText = (typeBox.dataset.lessonText || typeBox.textContent || '').trim();
  const lessonId = String(typeBox.dataset.lessonId || '1');
  const lessonTitle = typeBox.dataset.lessonTitle || 'Typing Lesson';
  const lessonCategory = typeBox.dataset.lessonCategory || '';
  const finishBtn = document.getElementById('lessonFinish');
  const resetBtn = document.getElementById('lessonReset');
  const hint = document.getElementById('lessonHint');
  const statePill = document.getElementById('lessonStatePill');
  const keyboard = document.getElementById('lessonKeyboard');
  const focusLabel = document.getElementById('lessonFocusKeys');

  let typed = '';
  let startAt = 0, running = false, saved = false;
  let lastTypedLength = 0;
  let lastAnimIndex = -1;
  let lastAnimGood = true;

  const keyRows = [
    [{k:'1'},{k:'2'},{k:'3'},{k:'4'},{k:'5'},{k:'6'},{k:'7'},{k:'8'},{k:'9'},{k:'0'},{k:'-'},{k:'='}],
    [{k:'q'},{k:'w'},{k:'e'},{k:'r'},{k:'t'},{k:'y'},{k:'u'},{k:'i'},{k:'o'},{k:'p'},{k:'['},{k:']'},{k:'\\'}],
    [{k:'a'},{k:'s'},{k:'d'},{k:'f'},{k:'g'},{k:'h'},{k:'j'},{k:'k'},{k:'l'},{k:';'},{k:"'"}],
    [{k:'shift',label:'Shift',wide:true},{k:'z'},{k:'x'},{k:'c'},{k:'v'},{k:'b'},{k:'n'},{k:'m'},{k:','},{k:'.'},{k:'/'},{k:'shift',label:'Shift',wide:true}],
    [{k:'space',label:'Space',space:true}]
  ];
  const baseKeys = new Set(keyRows.flat().map(x => x.k).filter(Boolean));
  const shiftedMap = {
    '!':'1','@':'2','#':'3','$':'4','%':'5','^':'6','&':'7','*':'8','(':'9',')':'0',
    '_':'-','+':'=','{':'[','}':']','|':'\\',':':';','"':"'",'<':',','>':'.','?':'/'
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function isEditable(el){ return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
  function set(id,val){ const el=document.getElementById(id); if(el) el.textContent=val; }
  function playerName(){ let n=localStorage.getItem('kpc_player_name'); if(!n){ n='Guest'+Math.floor(Math.random()*9000+1000); localStorage.setItem('kpc_player_name',n); } return n; }
  function showLessonToast(message, type='info'){
    try{
      if(window.KPCToast && typeof window.KPCToast.show === 'function') return window.KPCToast.show(message, type);
      if(typeof window.showToast === 'function') return window.showToast(message, type);
    }catch(e){}
  }
  function visibleChar(ch){ return ch === ' ' ? '␣' : ch; }
  function charClass(ch, base){ return base + (ch === ' ' ? ' current-space' : ''); }

  function keyInfo(ch){
    if(ch === ' ') return {key:'space', shift:false, label:'Space'};
    if(!ch) return {key:'', shift:false, label:''};
    if(shiftedMap[ch]) return {key:shiftedMap[ch], shift:true, label:ch};
    if(/[A-Z]/.test(ch)) return {key:ch.toLowerCase(), shift:true, label:ch};
    return {key:String(ch).toLowerCase(), shift:false, label:ch};
  }

  function getFocusKeys(){
    const chars = [];
    for(const ch of lessonText){
      const info = keyInfo(ch);
      if(info.key && baseKeys.has(info.key) && info.key !== 'space' && !chars.includes(info.key)) chars.push(info.key);
    }
    return new Set(chars.length <= 8 ? chars : []);
  }
  const focusKeys = getFocusKeys();
  function focusText(){
    const id = Number(lessonId);
    if(focusKeys.size && id <= 14) return 'Focus Keys: ' + Array.from(focusKeys).map(k => k.toUpperCase()).join(' + ');
    if(lessonText.includes(' ') && id <= 30) return 'Focus: Accuracy and rhythm';
    if(/[A-Z]/.test(lessonText)) return 'Focus: Shift + clean accuracy';
    if(/[0-9!@#$%^&*()_+{}:"<>?]/.test(lessonText)) return 'Focus: Numbers and symbols';
    if(lessonCategory === 'Advanced') return 'Focus: Speed and consistency';
    return 'Focus: Accuracy and rhythm';
  }
  if(focusLabel) focusLabel.textContent = focusText();

  function syncHiddenInput(){ if(input && input.value !== typed) input.value = typed; }
  function startIfNeeded(){
    if(!running && !saved){
      running = true;
      startAt = Date.now();
      if(hint) hint.textContent = 'កំពុងវាយ... Keep going';
      if(statePill) statePill.textContent = 'Typing';
      typeBox.classList.add('is-running');
    }
  }
  function showSuccessBurst(title='Lesson completed', sub='XP saved'){
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

  function renderKeyboard(){
    if(!keyboard) return;
    const nextInfo = keyInfo(lessonText[typed.length] || '');
    keyboard.innerHTML = keyRows.map((row, rowIndex) => {
      const keys = row.map(item => {
        const k = item.k;
        const cls = ['kpc-keycap'];
        if(item.wide) cls.push('wide');
        if(item.space) cls.push('space');
        if(focusKeys.has(k)) cls.push('focus');
        if(nextInfo.key === k || (nextInfo.shift && k === 'shift')) cls.push('next');
        const label = item.label || k.toUpperCase();
        return `<span class="${cls.join(' ')}" data-key="${escapeHtml(k)}">${escapeHtml(label)}</span>`;
      }).join('');
      return `<div class="kpc-key-row row-${rowIndex+1}">${keys}</div>`;
    }).join('');
  }
  function renderLessonText(){
    let html = '';
    for(let i=0;i<lessonText.length;i++){
      const ch = lessonText[i];
      if(i < typed.length){
        const good = typed[i] === ch;
        const anim = i === lastAnimIndex ? (lastAnimGood ? ' kpc-pop' : ' kpc-shake') : '';
        const cls = charClass(ch, (good?'kpc-char-ok':'kpc-char-bad') + anim);
        html += `<span class="${cls}">${escapeHtml(visibleChar(ch))}</span>`;
      }else if(i === typed.length){
        html += `<span class="${charClass(ch, 'current-letter')}">${escapeHtml(visibleChar(ch))}</span>`;
      }else{
        html += escapeHtml(visibleChar(ch));
      }
    }
    typeBox.innerHTML = html;
    renderKeyboard();
  }
  function updateFinish(progress){
    if(!finishBtn) return;
    if(saved){
      finishBtn.disabled = true;
      finishBtn.textContent = 'Saved ✓';
      finishBtn.classList.add('is-disabled');
    }else if(progress < 100){
      finishBtn.disabled = true;
      finishBtn.textContent = 'Finish';
      finishBtn.classList.add('is-disabled');
      finishBtn.title = 'Complete the full lesson first';
    }else{
      finishBtn.disabled = false;
      finishBtn.textContent = 'Finish';
      finishBtn.classList.remove('is-disabled');
      finishBtn.title = '';
    }
  }
  function stats(){
    let correct=0, errors=0;
    for(let i=0;i<typed.length;i++){ if(typed[i]===lessonText[i]) correct++; else errors++; }
    const elapsedSec = running ? Math.max((Date.now()-startAt)/1000,0) : 0;
    const mins = Math.max(elapsedSec/60,1/60);
    const wpm = typed.length ? Math.round((correct/5)/mins) : 0;
    const displayWpm = (elapsedSec < 3 || correct < 5) ? 0 : wpm;
    const acc = typed.length ? Math.round(correct/typed.length*100) : 100;
    const progress = lessonText.length ? Math.min(100,Math.round(typed.length/lessonText.length*100)) : 0;
    set('lessonWpm',displayWpm); set('lessonAcc',acc+'%'); set('lessonProgress',progress+'%'); set('lessonErrors',errors);
    const bar=document.getElementById('lessonProgressBar'); if(bar) bar.style.width=progress+'%';
    updateFinish(progress);
    renderLessonText();
    return {typed,correct,errors,wpm,acc,progress,score:Math.max(0,wpm*10+correct-errors*2)};
  }
  async function save(){
    const s=stats();
    if(saved) return;
    if(s.progress < 100){
      if(hint) hint.textContent = 'សូមវាយឱ្យចប់មេរៀនសិន មុនចុច Finish · Complete the lesson first';
      return;
    }
    saved = true;
    running = false;
    if(statePill) statePill.textContent = 'Saved';
    updateFinish(100);
    const completed = JSON.parse(localStorage.getItem('kpc_completed_lessons')||'[]');
    if(!completed.includes(lessonId)) completed.push(lessonId);
    localStorage.setItem('kpc_completed_lessons', JSON.stringify(completed));
    localStorage.setItem('kpc_lessons_completed', String(completed.length));
    localStorage.setItem('kpc_last_wpm',s.wpm); localStorage.setItem('kpc_last_accuracy',s.acc);
    localStorage.setItem('kpc_xp', String(Number(localStorage.getItem('kpc_xp')||0)+25));
    const duration = Math.max(10, Math.round((Date.now()-startAt)/1000)||10);
    if(window.KPCGuest){
      KPCGuest.recordAttempt({mode:'lesson', lesson_id:lessonTitle || ('Lesson '+lessonId), wpm:s.wpm, accuracy:s.acc, score:s.score, correct_keys:s.correct, wrong_keys:s.errors, total_keys:typed.length, duration_sec:duration, player_name:playerName(), weak_keys:[]});
    }
    const result=document.getElementById('lessonResult');
    if(result) result.innerHTML=`Saving lesson result...`;
    let serverMessage = 'Saved locally.';
    let serverOk = false;
    try{
      const res = await fetch('/api/submit-score',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify({csrf_token:csrf,player_name:playerName(),game:'lesson',score:s.score,combo:s.correct,level:Number(lessonId),wpm:s.wpm,accuracy:s.acc,duration_sec:duration,total_keys:typed.length,attempt_id:String(Date.now())})});
      const payload = await res.json().catch(()=>({ok:false,error:'Invalid server response'}));
      if(!res.ok || payload.ok === false || payload.success === false){
        serverMessage = payload.error || payload.message || 'Server did not accept this lesson score.';
        showLessonToast(serverMessage, 'error');
      }else{
        serverOk = true;
        serverMessage = payload.player_name ? `Server saved as ${payload.player_name}.` : 'Server saved.';
        showLessonToast('Lesson score saved.', 'success');
      }
    }catch(e){
      serverMessage = 'Saved locally, but server is offline.';
      showLessonToast(serverMessage, 'warning');
    }
    try{const events=lessonText.split('').map((key,i)=>({key,correct:typed[i]===key,time_ms:250+Math.floor(Math.random()*220)})); await fetch('/api/ai-coach/track',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf,'X-Guest-ID':localStorage.getItem('kpc_ai_guest_id')||'guest-local'},body:JSON.stringify({csrf_token:csrf,lesson_name:lessonTitle,events})});}catch(e){}
    showSuccessBurst('Lesson completed', `WPM ${s.wpm} · Accuracy ${s.acc}% · XP +25`);
    if(result) result.innerHTML=`✅ Lesson saved · WPM <b>${s.wpm}</b> · Accuracy <b>${s.acc}%</b> · XP +25<br><small class="${serverOk ? 'kpc-save-ok' : 'kpc-save-warning'}">${escapeHtml(serverMessage)}</small>`;
  }
  function applyTyped(newValue, anim=true){
    if(saved) return;
    const nextValue = String(newValue || '').slice(0, lessonText.length);
    if(nextValue.length > typed.length) startIfNeeded();
    if(anim && nextValue.length > lastTypedLength){
      lastAnimIndex = nextValue.length - 1;
      lastAnimGood = nextValue[lastAnimIndex] === lessonText[lastAnimIndex];
    }else{
      lastAnimIndex = -1;
    }
    typed = nextValue;
    lastTypedLength = typed.length;
    syncHiddenInput();
    const s=stats();
    if(s.progress>=100) save();
  }
  function reset(){
    typed = '';
    startAt = 0;
    running = false;
    saved = false;
    lastTypedLength = 0;
    lastAnimIndex = -1;
    if(input) input.value = '';
    if(hint) hint.textContent = 'ចាប់ផ្តើមវាយ ដើម្បីចាប់មេរៀន · Start typing anywhere';
    if(statePill) statePill.textContent = 'Ready';
    typeBox.classList.remove('is-running');
    const result=document.getElementById('lessonResult'); if(result) result.textContent = '';
    stats();
    focusCapture();
  }
  function focusCapture(){
    typeBox.focus({preventScroll:true});
    if(input) setTimeout(()=>input.focus({preventScroll:true}), 0);
  }
  function handleKeydown(e){
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target;
    if(isEditable(target) && target !== input) return;
    if(['Tab','Escape','Shift','CapsLock','Control','Alt','Meta'].includes(e.key)) return;
    if(e.key === 'Backspace'){
      e.preventDefault();
      applyTyped(typed.slice(0,-1), false);
      return;
    }
    if(e.key === 'Enter'){
      if(lessonText[typed.length] !== '\n') return;
      e.preventDefault();
      applyTyped(typed + '\n');
      return;
    }
    if(e.key === ' ' || e.key.length === 1){
      if(typed.length >= lessonText.length) return;
      e.preventDefault();
      applyTyped(typed + e.key);
    }
  }

  document.addEventListener('keydown', handleKeydown);
  typeBox.addEventListener('click', focusCapture);
  typeBox.addEventListener('focus', () => { if(input) input.focus({preventScroll:true}); });
  if(input){
    input.addEventListener('input', () => applyTyped(input.value, true));
    input.addEventListener('paste', e => e.preventDefault());
  }
  resetBtn && (resetBtn.onclick = reset);
  finishBtn && (finishBtn.onclick = () => save());

  renderLessonText();
  renderKeyboard();
  stats();
})();
