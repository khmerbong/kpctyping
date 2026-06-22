// v39 typing polish: shared mobile/touch keyboard for Typing Test, Training Mode and games.
// Adds ABC / 123 / Symbols modes, supports Shift, and types through the real input.
(function(){
  const KEY_LAYOUTS = {
    abc: [
      ['q','w','e','r','t','y','u','i','o','p'],
      ['a','s','d','f','g','h','j','k','l'],
      ['Shift','z','x','c','v','b','n','m','Backspace'],
      ['123','Space','.',',','?','!','Symbols']
    ],
    num: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['-','=','[',']','\\',';','\'', '/', 'Backspace'],
      ['ABC','Space','.',',','?','!','Symbols']
    ],
    sym: [
      ['!','@','#','$','%','^','&','*','(',')'],
      ['_','+','{','}','|',':','"','<','>'],
      ['ABC','123','Space','-','=','[',']','/','Backspace']
    ]
  };
  let shiftOn = false;
  let mode = 'abc';
  let panelRef = null;

  function isSmallScreen(){
    return window.matchMedia ? window.matchMedia('(max-width: 780px)').matches : window.innerWidth <= 780;
  }

  function findKeyboardTarget(selector){
    const preferred = document.querySelector('[data-mobile-keyboard]');
    if(preferred) return preferred;
    return document.querySelector(selector || 'main, .training-shell, .game-shell');
  }

  function activeTypingInput(){
    const active = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) ? document.activeElement : null;
    const candidates = [
      document.getElementById('typingInput'),
      document.getElementById('lessonInput'),
      document.getElementById('academyInput'),
      document.querySelector('[data-mobile-typing-input]'),
      active
    ].filter(Boolean);
    return candidates.find(el => !el.readOnly) || null;
  }

  function ensureTypingStarted(input){
    if(!input) return;
    if(input.id === 'typingInput' && input.disabled){
      const startBtn = document.getElementById('startBtn');
      if(startBtn) startBtn.click();
    }
    if(input.disabled) input.disabled = false;
    try{ input.focus({preventScroll:true}); }catch(e){ try{ input.focus(); }catch(_){} }
  }

  function currentTargetChar(input){
    const current = document.querySelector('.beginner-type-box .current-letter, #lessonText .current-letter, .kpc-lesson-type-box .current-letter, .type-box .current-letter');
    if(!current) return '';
    const txt = current.textContent || '';
    if(txt === '␣') return ' ';
    return txt.slice(0, 1);
  }

  function modeForChar(ch){
    if(!ch || ch === ' ') return mode;
    if(/[a-zA-Z]/.test(ch)) return 'abc';
    if(/[0-9\-=\[\]\\;'.,/?]/.test(ch)) return 'num';
    return 'sym';
  }

  function setMode(nextMode){
    if(!KEY_LAYOUTS[nextMode]) return;
    mode = nextMode;
    shiftOn = false;
    renderPanel();
  }

  function resolveTypedValue(key, input){
    if(key === 'Space') return ' ';
    if(typeof key !== 'string' || key.length !== 1) return '';
    const target = currentTargetChar(input);
    if(/^[a-z]$/i.test(key)){
      const shouldUpper = shiftOn || (target && target.length === 1 && target.toLowerCase() === key.toLowerCase() && target === target.toUpperCase() && /[A-Z]/.test(target));
      return shouldUpper ? key.toUpperCase() : key.toLowerCase();
    }
    return key;
  }

  function refreshShiftState(){
    document.querySelectorAll('.kpc-v32-mobile-keyboard, .kpc-v33-mobile-keyboard, .kpc-v39-mobile-keyboard').forEach(panel => {
      panel.classList.toggle('shift-on', !!shiftOn);
      panel.dataset.keyboardMode = mode;
    });
    document.querySelectorAll('.key-tile[data-key="shift"]').forEach(el => {
      el.classList.toggle('active', !!shiftOn);
      el.setAttribute('aria-pressed', shiftOn ? 'true' : 'false');
    });
    document.querySelectorAll('.key-tile[data-mode-key]').forEach(el => {
      el.classList.toggle('active', el.dataset.modeKey === mode);
    });
  }

  function setInputValue(input, nextValue){
    const old = input.value || '';
    input.value = nextValue;
    try{ input.setSelectionRange(input.value.length, input.value.length); }catch(e){}
    try{
      input.dispatchEvent(new InputEvent('input', {
        bubbles:true,
        cancelable:true,
        inputType: nextValue.length < old.length ? 'deleteContentBackward' : 'insertText',
        data: nextValue.length > old.length ? nextValue.slice(old.length) : null
      }));
    }catch(e){
      input.dispatchEvent(new Event('input', {bubbles:true,cancelable:true}));
    }
  }

  function applyTouchKey(key){
    if(key === 'Shift'){
      shiftOn = !shiftOn;
      refreshShiftState();
      highlight(key);
      return;
    }
    if(key === 'ABC') return setMode('abc');
    if(key === '123') return setMode('num');
    if(key === 'Symbols') return setMode('sym');

    const input = activeTypingInput();
    if(!input){
      document.dispatchEvent(new KeyboardEvent('keydown',{key:key,bubbles:true}));
      highlight(key);
      return;
    }
    ensureTypingStarted(input);
    const value = input.value || '';
    let next = value;
    if(key === 'Backspace'){
      next = value.slice(0, -1);
    }else{
      const typedChar = resolveTypedValue(key, input);
      if(typedChar) next = value + typedChar;
    }
    setInputValue(input, next);
    if(shiftOn && key !== 'Backspace' && key !== 'Space') shiftOn = false;
    const nextMode = modeForChar(currentTargetChar(input));
    if(nextMode !== mode) mode = nextMode;
    renderPanel();
    highlight(key);
  }

  function makeButton(key){
    const b = document.createElement('button');
    b.className = 'key-tile mobile-touch-target';
    b.type = 'button';
    b.dataset.key = String(key).toLowerCase();
    if(key === 'ABC') b.dataset.modeKey = 'abc';
    if(key === '123') b.dataset.modeKey = 'num';
    if(key === 'Symbols') b.dataset.modeKey = 'sym';
    b.textContent = key === 'Space' ? 'Space' : key === 'Backspace' ? '⌫' : key === 'Shift' ? '⇧' : String(key).toUpperCase();
    if(key === 'Space') b.classList.add('is-space');
    if(key === 'Backspace') b.classList.add('is-backspace');
    if(key === 'Shift') b.classList.add('is-shift');
    if(key === 'ABC' || key === '123' || key === 'Symbols') b.classList.add('is-mode');
    b.setAttribute('aria-label', key);
    if(key === 'Shift') b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => applyTouchKey(key));
    return b;
  }

  function renderPanel(){
    if(!panelRef) return;
    const rowsRoot = panelRef.querySelector('[data-mobile-keyboard-rows]');
    const help = panelRef.querySelector('[data-mobile-keyboard-help]');
    if(help) help.textContent = mode === 'abc' ? 'ABC mode · Tap 123 or Symbols for lesson punctuation.' : mode === 'num' ? '123 mode · Numbers and common punctuation.' : 'Symbols mode · Extra symbols for advanced lessons.';
    if(!rowsRoot) return;
    rowsRoot.innerHTML = '';
    KEY_LAYOUTS[mode].forEach((row, index) => {
      const grid = document.createElement('div');
      grid.className = 'mobile-grid mobile-grid-row mobile-grid-row-' + (index + 1);
      row.forEach(k => grid.appendChild(makeButton(k)));
      rowsRoot.appendChild(grid);
    });
    refreshShiftState();
  }

  function buildMobileKeyboard(targetSelector){
    const target = findKeyboardTarget(targetSelector);
    if(!target || target.dataset.mobileReady === '1') return;
    target.dataset.mobileReady = '1';
    panelRef = document.createElement('section');
    panelRef.className = 'mobile-panel kpc-v32-mobile-keyboard kpc-v33-mobile-keyboard kpc-v39-mobile-keyboard';
    const title = document.createElement('h3');
    title.textContent = 'Touch Keyboard';
    const help = document.createElement('p');
    help.setAttribute('data-mobile-keyboard-help','');
    const rows = document.createElement('div');
    rows.setAttribute('data-mobile-keyboard-rows','');
    panelRef.appendChild(title);
    panelRef.appendChild(help);
    panelRef.appendChild(rows);
    target.appendChild(panelRef);
    const nextMode = modeForChar(currentTargetChar(activeTypingInput()));
    if(nextMode) mode = nextMode;
    renderPanel();
  }

  function highlight(k){
    const key = String(k === ' ' ? 'Space' : k).toLowerCase();
    document.querySelectorAll('.key-tile,.kpc-keycap,.kbd').forEach(el => {
      const data = String(el.dataset.key || el.textContent || '').trim().toLowerCase();
      el.classList.toggle('active', data === key || (key === 'space' && data === 'space'));
    });
  }

  document.addEventListener('keydown', e => highlight(e.key === ' ' ? 'Space' : e.key));
  document.addEventListener('input', () => {
    const input = activeTypingInput();
    const suggested = modeForChar(currentTargetChar(input));
    if(suggested && suggested !== mode){
      mode = suggested;
      renderPanel();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    if(isSmallScreen() || document.querySelector('[data-mobile-keyboard]')){
      buildMobileKeyboard('[data-mobile-keyboard], main, .training-shell, .game-shell');
    }
  });
  window.KPCMobileTyping = { buildMobileKeyboard, highlight, applyTouchKey, activeTypingInput, currentTargetChar, setMode };
})();
