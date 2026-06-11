/* KPC Typing SVG Icon System 2026 - no PNG assets */
(function(){
  const svgns='http://www.w3.org/2000/svg';
  const icons={
    home:'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z',
    practice:'M5 5h14v4H5zM5 11h14v8H5zM8 13h2v2H8zM12 13h2v2h-2zM16 13h2v2h-2z',
    learn:'M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5zM7.5 5H18v11H7.5A5.4 5.4 0 0 0 6 16.2V5.5A1.5 1.5 0 0 1 7.5 5z',
    leaderboard:'M4 13h4v8H4zm6-5h4v13h-4zm6-3h4v16h-4z',
    profile:'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-8 9a8 8 0 0 1 16 0z',
    xp:'M12 2l2.7 6.4 6.9.6-5.2 4.5 1.6 6.7-6-3.5-6 3.5 1.6-6.7L2.4 9l6.9-.6z',
    trophy:'M7 4h10v3h4a6 6 0 0 1-6 6 5 5 0 0 1-2 2.6V19h4v3H7v-3h4v-3.4A5 5 0 0 1 9 13a6 6 0 0 1-6-6h4V4zm10 5V7h2a3 3 0 0 1-2 2zm-10 0a3 3 0 0 1-2-2h2v2z',
    fire:'M13 2s1 4-2 6c-2 1.4-4 3.1-4 6a5 5 0 0 0 10 0c0-2.4-1.4-3.9-2.6-5.2.1 2.4-.9 3.6-2.4 4.4.6-2.6-.2-4.7 1-7.2z',
    target:'M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7V2zm0 5a5 5 0 1 0 5 5h-3a2 2 0 1 1-2-2V7zm8-5v4h-4l-5 5 2 2 5-5v4h4V2z',
    settings:'M19.4 13.5a7.8 7.8 0 0 0 0-3l2.1-1.6-2-3.5-2.5 1a8.8 8.8 0 0 0-2.6-1.5L14 2h-4l-.4 2.9A8.8 8.8 0 0 0 7 6.4l-2.5-1-2 3.5 2.1 1.6a7.8 7.8 0 0 0 0 3l-2.1 1.6 2 3.5 2.5-1a8.8 8.8 0 0 0 2.6 1.5L10 22h4l.4-2.9a8.8 8.8 0 0 0 2.6-1.5l2.5 1 2-3.5-2.1-1.6zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z'
  };
  function makeIcon(name){
    const svg=document.createElementNS(svgns,'svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','currentColor'); svg.setAttribute('aria-hidden','true'); svg.classList.add('kpc-icon');
    const p=document.createElementNS(svgns,'path'); p.setAttribute('d',icons[name]||icons.xp); svg.appendChild(p); return svg;
  }
  const map=[
    ['Home','home'],['Practice','practice'],['Learn','learn'],['Leaderboard','leaderboard'],['Profile','profile'],['Settings','settings'],
    ['XP','xp'],['Trophy','trophy'],['Streak','fire'],['Accuracy','target']
  ];
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.kpc-navlinks a,.academy-nav a').forEach(a=>{
      const text=(a.textContent||'').trim(); const item=map.find(m=>text.toLowerCase().includes(m[0].toLowerCase()));
      if(item && !a.querySelector('svg')) a.prepend(makeIcon(item[1]),document.createTextNode(' '));
    });
    document.querySelectorAll('[data-kpc-icon]').forEach(el=>{ el.prepend(makeIcon(el.getAttribute('data-kpc-icon'))); });
  });
})();
