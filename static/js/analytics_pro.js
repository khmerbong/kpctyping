(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  function setText(id, value){ const el=$(id); if(el) el.textContent=value; }
  function esc(v){ return window.KPCGuest ? KPCGuest.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function emptyHtml(title, text){ return `<div class="kpc-empty-state"><b>${esc(title)}</b><p>${esc(text)}</p></div>`; }
  function renderBars(id, points, suffix=''){
    const el=$(id); if(!el) return;
    el.innerHTML='';
    const max = Math.max(1, ...points.map(p => Number(p.value)||0));
    if(!points.length){ el.innerHTML=emptyHtml('No chart data yet', 'Complete a typing test or training lesson first.'); return; }
    points.forEach(p=>{
      const b=document.createElement('div');
      b.className='bar';
      b.style.height = Math.max(8, ((Number(p.value)||0)/max)*160) + 'px';
      b.title = `${p.label}: ${p.value}${suffix}`;
      const small = document.createElement('small');
      small.textContent = String(p.label || '').slice(5) || String(p.label || '');
      b.appendChild(small);
      el.appendChild(b);
    });
  }
  function renderHeatmap(items){
    const el=$('weakHeatmap'); if(!el) return;
    el.innerHTML='';
    if(!items.length){ el.innerHTML=emptyHtml('No weak keys yet', 'AI Coach will identify weak keys after practice.'); return; }
    const max=Math.max(1,...items.map(i=>Number(i.count)||0));
    items.forEach(i=>{
      const k=document.createElement('div');
      k.className='heat-key';
      k.style.opacity = String(.45 + ((Number(i.count)||0)/max)*.55);
      k.title=`${i.key}: ${i.count} mistakes`;
      k.textContent=i.key;
      el.appendChild(k);
    });
  }
  function renderSessions(rows){
    const el=$('recentSessions'); if(!el) return;
    el.innerHTML='';
    if(!rows.length){ el.innerHTML='<tr class="kpc-table-empty"><td colspan="6">No saved sessions yet. Complete your first typing test.</td></tr>'; return; }
    rows.forEach(r=>{
      const tr=document.createElement('tr');
      const values=[String(r.created_at||'').slice(0,10), r.mode||'speed', r.lesson_id||'Typing Test', r.wpm||0, (r.accuracy||0)+'%', (r.weak_keys||[]).join(', ') || '—'];
      values.forEach(v=>{ const td=document.createElement('td'); td.textContent=v; tr.appendChild(td); });
      el.appendChild(tr);
    });
  }
  function renderAi(ai){
    const el=$('aiCoachList'); if(!el) return;
    const weak=(ai.weak_keys||[]).map(x=>x.key||x).join(', ') || 'None yet';
    const slow=(ai.slow_keys||[]).map(x=>x.key||x).join(', ') || 'None yet';
    el.innerHTML='';
    [['Weak keys', weak], ['Slow keys', slow], ['Accuracy', (ai.accuracy||0)+'%'], ['Recommendation', ai.recommended_lesson||'Start training']].forEach(([a,b])=>{
      const li=document.createElement('li');
      li.textContent = `${a}: ${b}`;
      el.appendChild(li);
    });
  }
  function normalizeLocal(){
    return window.KPCGuest ? KPCGuest.analytics() : {ok:true, guest:true, session_count:0, best_wpm:0, avg_wpm:0, best_accuracy:0, avg_accuracy:0, total_practice_minutes:0, speed_trend:[], accuracy_trend:[], weak_key_heatmap:[], recent_sessions:[]};
  }
  function render(data){
    setText('bestWpm', data.best_wpm || 0);
    setText('avgWpm', data.avg_wpm || 0);
    setText('bestAccuracy', `${data.best_accuracy || 0}%`);
    setText('avgAccuracy', `${data.avg_accuracy || 0}%`);
    setText('sessionCount', data.session_count || 0);
    setText('practiceMinutes', data.total_practice_minutes || 0);
    renderBars('speedChart', data.speed_trend||[], ' WPM');
    renderBars('accuracyChart', data.accuracy_trend||[], '%');
    renderHeatmap(data.weak_key_heatmap||[]);
    renderSessions(data.recent_sessions||[]);
    renderAi(data.ai_coach||{});
    const source = data.guest ? 'Guest browser data' : 'Account database';
    setText('analyticsStatus', (data.session_count || 0) ? `Ready — ${data.session_count} real sessions analyzed. Source: ${source}.` : `No data yet. Source: ${source}. Start a typing test to build analytics.`);
  }
  async function loadAnalytics(){
    setText('analyticsStatus','Loading analytics...');
    try{
      const res=await fetch('/api/analytics/pro?days=30', {headers:{'Accept':'application/json'}});
      if(res.ok){
        const data=await res.json();
        if(data.ok){ render(data); return; }
      }
    }catch(e){}
    render(normalizeLocal());
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('refreshAnalytics')?.addEventListener('click',loadAnalytics);
    loadAnalytics();
  });
})();
