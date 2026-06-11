
// KPCTyping Mockup #2 All Pages UI helper. UI only, no API or backend changes.
(function(){
  const pageName = (() => {
    const p = location.pathname;
    if (p.includes('ai-coach')) return 'AI Coach';
    if (p.includes('analytics')) return 'Analytics';
    if (p.includes('career')) return 'Career';
    if (p.includes('tournament')) return 'Tournament';
    if (p.includes('friends')) return 'Friends';
    if (p.includes('multiplayer')) return 'Multiplayer';
    if (p.includes('leaderboard')) return 'Leaderboard';
    if (p.includes('hall-of-fame')) return 'Hall of Fame';
    if (p.includes('mobile-app')) return 'Mobile App';
    return 'KPCTyping';
  })();
  document.documentElement.classList.add('kpc-mockup2-all-pages');
  document.body.classList.add('kpc-premium-page');
  // Add a non-invasive premium shell marker used by CSS.
  const main = document.querySelector('main');
  if (main && !main.classList.contains('kpc-premium-shell')) main.classList.add('kpc-premium-shell');
  // Add subtle page label when there is no clear nav brand; does not affect logic.
  if (!document.querySelector('.kpc-ui-page-chip')) {
    const chip = document.createElement('div');
    chip.className = 'kpc-ui-page-chip';
    chip.textContent = pageName;
    chip.style.cssText = 'position:fixed;right:18px;bottom:88px;z-index:40;padding:9px 12px;border-radius:999px;background:rgba(124,77,255,.18);border:1px solid rgba(164,143,255,.24);color:#e9e2ff;font:800 12px system-ui;backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.25);pointer-events:none;';
    document.body.appendChild(chip);
  }
})();
