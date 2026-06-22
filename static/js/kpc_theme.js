// KPC Typing Phase 6 Dark Mode
(function () {
  const STORAGE_KEY = 'kpc-theme';
  const root = document.documentElement;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]') || document.getElementById('kpc-theme-color');

  function preferredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function applyTheme(theme) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', nextTheme);
    document.body && document.body.setAttribute('data-theme', nextTheme);
    if (themeColorMeta) themeColorMeta.setAttribute('content', nextTheme === 'dark' ? '#0f172a' : '#e7193f');

    document.querySelectorAll('[data-kpc-theme-toggle]').forEach((button) => {
      const icon = button.querySelector('[data-kpc-theme-icon]');
      const label = button.querySelector('[data-kpc-theme-text]');
      button.setAttribute('aria-pressed', nextTheme === 'dark' ? 'true' : 'false');
      if (icon) icon.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
      if (label) label.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
      button.title = nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  function saveTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) {}
  }

  applyTheme(preferredTheme());

  document.addEventListener('click', function (event) {
    const toggle = event.target.closest('[data-kpc-theme-toggle]');
    if (!toggle) return;
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
    if (window.KPCToast) {
      window.KPCToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'success');
    }
  });
})();
