/* PHASE 7 — Performance Optimization
   Adds lazy loading, idle loading helpers, long-task monitoring and safe asset hints. */
(function(){
  'use strict';
  const d=document;
  const idle=window.requestIdleCallback || function(cb){ return setTimeout(function(){ cb({timeRemaining:function(){return 0;}}); }, 1); };

  function lazyMedia(){
    d.querySelectorAll('img:not([loading])').forEach(function(img){
      img.loading='lazy';
      img.decoding='async';
    });
    d.querySelectorAll('iframe:not([loading])').forEach(function(frame){ frame.loading='lazy'; });
  }

  function markReady(){
    d.documentElement.classList.add('kpc-perf-ready');
    window.dispatchEvent(new CustomEvent('kpc:performance-ready'));
  }

  function preloadRouteAssets(){
    const path=location.pathname;
    const assets=[];
    if(path.includes('typing-test')) assets.push('/static/js/typing_engine_v2.js','/static/css/typing2026.css');
    if(path.includes('tournament')) assets.push('/static/css/tournament2026.css','/static/js/tournaments.js');
    if(path.includes('friends')) assets.push('/static/css/social2026.css','/static/js/friends.js');
    if(path.includes('ai-coach')) assets.push('/static/css/ai_coach2026.css','/static/js/ai_coach2026.js');
    assets.forEach(function(href){
      if(d.querySelector('link[href="'+href+'"]')) return;
      const link=d.createElement('link');
      link.rel=href.endsWith('.css')?'preload':'prefetch';
      link.as=href.endsWith('.css')?'style':'script';
      link.href=href;
      d.head.appendChild(link);
    });
  }

  function monitorLongTasks(){
    if(!('PerformanceObserver' in window)) return;
    try{
      const obs=new PerformanceObserver(function(list){
        const entries=list.getEntries();
        const total=entries.reduce(function(sum,e){return sum+e.duration;},0);
        if(total>150) console.warn('[KPC Performance] Long tasks detected:', Math.round(total)+'ms');
      });
      obs.observe({entryTypes:['longtask']});
    }catch(e){}
  }

  if(d.readyState==='loading'){
    d.addEventListener('DOMContentLoaded', function(){ lazyMedia(); markReady(); idle(preloadRouteAssets); idle(monitorLongTasks); });
  }else{
    lazyMedia(); markReady(); idle(preloadRouteAssets); idle(monitorLongTasks);
  }
})();
