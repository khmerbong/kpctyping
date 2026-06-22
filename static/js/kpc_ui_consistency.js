// KPC UI Consistency Phase 1: safe table labels + active mobile nav
(function(){
  function labelTables(){
    document.querySelectorAll('table').forEach(function(table){
      var headers=[].map.call(table.querySelectorAll('thead th'),function(th){return th.textContent.trim();});
      if(!headers.length){return;}
      table.querySelectorAll('tbody tr').forEach(function(row){
        [].forEach.call(row.children,function(td,i){
          if(!td.getAttribute('data-label') && headers[i]) td.setAttribute('data-label',headers[i]);
        });
      });
    });
  }
  function activeNav(){
    var path=location.pathname;
    document.querySelectorAll('.kpc-bottom-nav a,.kpc-links a').forEach(function(a){
      try{ if(a.getAttribute('href')===path) a.classList.add('active'); }catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded',function(){labelTables();activeNav();});
})();
