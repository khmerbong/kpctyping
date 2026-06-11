/* Optional helper for future phases: load route-specific scripts only when needed. */
window.KPCLazyRoutes = window.KPCLazyRoutes || {
  loadScript: function(src){
    return new Promise(function(resolve,reject){
      if(document.querySelector('script[src="'+src+'"]')) return resolve();
      var s=document.createElement('script');
      s.src=src; s.defer=true; s.onload=resolve; s.onerror=reject;
      document.body.appendChild(s);
    });
  },
  loadStyle: function(href){
    return new Promise(function(resolve,reject){
      if(document.querySelector('link[href="'+href+'"]')) return resolve();
      var l=document.createElement('link');
      l.rel='stylesheet'; l.href=href; l.onload=resolve; l.onerror=reject;
      document.head.appendChild(l);
    });
  }
};
