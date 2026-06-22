(function(){
  'use strict';
  const TYPES = new Set(['success','error','warning','info']);
  function ensureRoot(){
    let root = document.querySelector('[data-kpc-toast-root]');
    if(!root){
      root = document.createElement('div');
      root.className = 'kpc-toast-root';
      root.setAttribute('data-kpc-toast-root','');
      root.setAttribute('aria-live','polite');
      root.setAttribute('aria-atomic','true');
      document.body.appendChild(root);
    }
    return root;
  }
  function showToast(message, type='success', timeout=3600){
    const cleanType = TYPES.has(type) ? type : 'info';
    const root = ensureRoot();
    const item = document.createElement('div');
    item.className = `kpc-toast kpc-toast-${cleanType}`;
    item.setAttribute('role', cleanType === 'error' ? 'alert' : 'status');
    item.innerHTML = `<span class="kpc-toast-dot" aria-hidden="true"></span><span class="kpc-toast-message"></span><button class="kpc-toast-close" type="button" aria-label="Close notification">×</button>`;
    item.querySelector('.kpc-toast-message').textContent = String(message || 'Done');
    const close = () => {
      item.classList.add('is-leaving');
      window.setTimeout(()=>item.remove(), 180);
    };
    item.querySelector('.kpc-toast-close').addEventListener('click', close);
    root.appendChild(item);
    window.setTimeout(()=>item.classList.add('is-visible'), 10);
    if(timeout) window.setTimeout(close, timeout);
    return item;
  }
  window.showToast = window.showToast || showToast;
  window.KPCToast = Object.assign(window.KPCToast || {}, {show: showToast});
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-kpc-flash]').forEach(node => {
      const category = (node.getAttribute('data-category') || 'info').toLowerCase();
      const type = category.includes('error') || category.includes('danger') ? 'error' : category.includes('warn') ? 'warning' : category.includes('success') ? 'success' : 'info';
      showToast(node.getAttribute('data-message') || '', type);
    });
  });
})();
