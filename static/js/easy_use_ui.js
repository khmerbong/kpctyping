// KPCTyping Easy-Use UI Patch. UI-only; no backend/API changes.
(function(){
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  ready(function(){
    document.querySelectorAll('.kpc-toast').forEach(function(el){el.remove();});
    if(!document.querySelector('.kpc-skip-link')){
      var skip=document.createElement('a');
      skip.className='kpc-skip-link';
      skip.href='#main-content';
      skip.textContent='Skip to main content';
      document.body.prepend(skip);
    }
    var main=document.querySelector('main');
    if(main && !main.id) main.id='main-content';
    document.querySelectorAll('nav').forEach(function(nav){
      if(!nav.getAttribute('aria-label')) nav.setAttribute('aria-label','Main navigation');
    });
    document.querySelectorAll('button:not([type])').forEach(function(btn){btn.setAttribute('type','button');});
    document.querySelectorAll('input,textarea,select').forEach(function(el){
      if(!el.getAttribute('aria-label') && !el.id){el.setAttribute('aria-label', el.placeholder || 'Input field');}
    });
    var typingInput=document.querySelector('#typingInput');
    if(typingInput){
      typingInput.setAttribute('inputmode','text');
      typingInput.setAttribute('aria-label','Type the current word here');
      var panel=document.querySelector('.typing-panel');
      if(panel && !panel.querySelector('.kpc-help-note')){
        var note=document.createElement('p');
        note.className='kpc-help-note';
        note.textContent='Tip: Press Start, then type the highlighted word here. On phone, tap the input box first.';
        typingInput.insertAdjacentElement('afterend',note);
      }
    }
    var overlayBtn=document.querySelector('#overlayPlayBtn');
    if(overlayBtn) overlayBtn.textContent='Start Typing';
    var startBtn=document.querySelector('#startBtn');
    if(startBtn && /Start Game/i.test(startBtn.textContent)) startBtn.textContent='Start Typing';
    document.querySelectorAll('.kpc-feature-card,.kpc-game-card').forEach(function(card){
      if(!card.getAttribute('aria-label')){
        var h=card.querySelector('h1,h2,h3');
        if(h) card.setAttribute('aria-label', h.textContent.trim());
      }
    });
    var back=document.createElement('button');
    back.className='kpc-back-top';
    back.type='button';
    back.setAttribute('aria-label','Back to top');
    back.textContent='↑';
    document.body.appendChild(back);
    back.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
    window.addEventListener('scroll',function(){back.classList.toggle('show',window.scrollY>500);},{passive:true});
  });
})();
