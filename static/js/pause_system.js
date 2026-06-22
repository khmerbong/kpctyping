window.KPCPause = window.KPCPause || { paused: false };
window.KPCPause.isPaused = function () {
  return Boolean(window.KPCPause && window.KPCPause.paused);
};
window.KPCPause.setPaused = function (paused) {
  window.KPCPause.paused = Boolean(paused);
  const overlay = document.getElementById('pauseOverlay');
  if (overlay) overlay.style.display = window.KPCPause.paused ? 'flex' : 'none';
};

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const overlay = document.getElementById('pauseOverlay');
    if (!overlay) return;
    event.preventDefault();
    window.KPCPause.setPaused(!window.KPCPause.paused);
  }
});

window.resumeGame = function () {
  window.KPCPause.setPaused(false);
};
