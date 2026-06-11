/* PHASE 6 — Mobile Navigation 2026 */
(function(){
  'use strict';
  const mobileQuery = window.matchMedia('(max-width: 820px)');
  const navSelectors = ['.kpc-nav', '.social-links', '.tour-nav > div'];

  function activePath(){
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.kpc-bottom-nav a, .kpc-nav a, .social-links a, .tour-nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').replace(/\/$/, '') || '/';
      if (href === path) a.classList.add('active');
    });
  }

  function getNav(){ return navSelectors.map(sel => document.querySelector(sel)).find(Boolean); }

  function ensureBottomNav(){
    if (document.querySelector('.kpc-bottom-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'kpc-bottom-nav';
    nav.setAttribute('aria-label','Mobile bottom navigation');
    nav.innerHTML = `
      <a href="/"><span>🏠</span>Home</a>
      <a href="/typing-test"><span>⌨️</span>Test</a>
      <a href="/friends"><span>👥</span>Friends</a>
      <a href="/tournaments"><span>🏆</span>Cups</a>
      <a href="/profile"><span>👤</span>Profile</a>`;
    document.body.appendChild(nav);
  }

  function ensureMenuButton(){
    const existing = document.querySelector('.kpc-mobile-menu-btn');
    if (existing) return existing;
    const host = document.querySelector('.kpc-actions') || document.querySelector('.social-topbar') || document.querySelector('.tour-nav');
    if (!host) return null;
    const btn = document.createElement('button');
    btn.className = 'kpc-mobile-menu-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label','Open mobile menu');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML = '☰';
    host.appendChild(btn);
    return btn;
  }

  function closeMenu(nav, btn){
    if (!nav) return;
    nav.classList.remove('is-mobile-open');
    btn && btn.setAttribute('aria-expanded','false');
    const overlay = document.querySelector('.kpc-mobile-overlay');
    if (overlay) overlay.remove();
    document.documentElement.classList.remove('mobile-menu-lock');
    document.body.style.overflow = '';
  }

  function openMenu(nav, btn){
    if (!nav) return;
    nav.classList.add('is-mobile-open');
    btn && btn.setAttribute('aria-expanded','true');
    if (!document.querySelector('.kpc-mobile-overlay')){
      const overlay = document.createElement('div');
      overlay.className = 'kpc-mobile-overlay';
      overlay.addEventListener('click', () => closeMenu(nav, btn));
      document.body.appendChild(overlay);
    }
    document.documentElement.classList.add('mobile-menu-lock');
    document.body.style.overflow = 'hidden';
  }

  function setup(){
    ensureBottomNav();
    activePath();
    const nav = getNav();
    const btn = ensureMenuButton();
    if (!nav || !btn) return;
    btn.addEventListener('click', () => {
      if (nav.classList.contains('is-mobile-open')) closeMenu(nav, btn);
      else openMenu(nav, btn);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a') && mobileQuery.matches) closeMenu(nav, btn);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu(nav, btn);
    });
    mobileQuery.addEventListener?.('change', () => closeMenu(nav, btn));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
