(function(){
  const KEY='kpc-theme';
  const root=document.documentElement;
  function preferred(){try{return localStorage.getItem(KEY)||((window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')}catch(e){return 'light'}}
  function apply(theme){root.setAttribute('data-theme',theme);root.style.colorScheme=theme;document.querySelectorAll('[data-kpc-theme-toggle]').forEach(btn=>{btn.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');btn.textContent=theme==='dark'?'☀️':'🌙';});}
  apply(preferred());
  document.addEventListener('DOMContentLoaded',function(){if(!document.querySelector('[data-kpc-theme-toggle]')){const b=document.createElement('button');b.type='button';b.className='kpc-theme-toggle kpc-floating-theme-toggle';b.setAttribute('data-kpc-theme-toggle','');b.setAttribute('aria-label','Toggle theme');document.body.appendChild(b);apply(root.getAttribute('data-theme')||preferred());}});
  document.addEventListener('click',function(e){const btn=e.target.closest('[data-kpc-theme-toggle]');if(!btn)return;const next=root.getAttribute('data-theme')==='dark'?'light':'dark';try{localStorage.setItem(KEY,next)}catch(err){}apply(next);});
})();
