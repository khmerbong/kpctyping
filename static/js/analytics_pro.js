const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
const $ = (id) => document.getElementById(id);
function setText(id, value){ const el=$(id); if(el) el.textContent=value; }
function renderBars(id, points, suffix=''){
  const el=$(id); if(!el) return;
  el.innerHTML='';
  const max = Math.max(1, ...points.map(p => Number(p.value)||0));
  if(!points.length){ el.innerHTML='<p>No chart data yet. Complete or add a test session.</p>'; return; }
  points.forEach(p=>{
    const b=document.createElement('div');
    b.className='bar';
    b.style.height = Math.max(8, ((Number(p.value)||0)/max)*160) + 'px';
    b.title = `${p.label}: ${p.value}${suffix}`;
    b.innerHTML=`<small>${String(p.label).slice(5)}</small>`;
    el.appendChild(b);
  });
}
function renderHeatmap(items){
  const el=$('weakHeatmap'); if(!el) return;
  el.innerHTML='';
  if(!items.length){ el.innerHTML='<p>No weak keys yet.</p>'; return; }
  const max=Math.max(1,...items.map(i=>i.count));
  items.forEach(i=>{
    const k=document.createElement('div');
    k.className='heat-key';
    k.style.opacity = String(.45 + (i.count/max)*.55);
    k.title=`${i.key}: ${i.count} mistakes`;
    k.textContent=i.key;
    el.appendChild(k);
  });
}
function renderSessions(rows){
  const el=$('recentSessions'); if(!el) return;
  el.innerHTML='';
  if(!rows.length){ el.innerHTML='<tr><td colspan="6">No saved sessions yet.</td></tr>'; return; }
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${String(r.created_at||'').slice(0,10)}</td><td>${r.mode||''}</td><td>${r.lesson_id||''}</td><td>${r.wpm||0}</td><td>${r.accuracy||0}%</td><td>${(r.weak_keys||[]).join(', ')}</td>`;
    el.appendChild(tr);
  });
}
function renderAi(ai){
  const el=$('aiCoachList'); if(!el) return;
  const weak=(ai.weak_keys||[]).map(x=>x.key||x).join(', ') || 'None yet';
  const slow=(ai.slow_keys||[]).map(x=>x.key||x).join(', ') || 'None yet';
  el.innerHTML=`<li>Weak keys: <b>${weak}</b></li><li>Slow keys: <b>${slow}</b></li><li>Accuracy: <b>${ai.accuracy||0}%</b></li><li>Recommendation: <b>${ai.recommended_lesson||'Start training'}</b></li>`;
}
async function loadAnalytics(){
  setText('analyticsStatus','Loading analytics...');
  const res=await fetch('/api/analytics/pro?days=30');
  const data=await res.json();
  if(!data.ok){ setText('analyticsStatus', data.error || 'Login required'); return; }
  setText('bestWpm', data.best_wpm);
  setText('avgWpm', data.avg_wpm);
  setText('bestAccuracy', `${data.best_accuracy}%`);
  setText('avgAccuracy', `${data.avg_accuracy}%`);
  setText('sessionCount', data.session_count);
  setText('practiceMinutes', data.total_practice_minutes);
  renderBars('speedChart', data.speed_trend||[], ' WPM');
  renderBars('accuracyChart', data.accuracy_trend||[], '%');
  renderHeatmap(data.weak_key_heatmap||[]);
  renderSessions(data.recent_sessions||[]);
  renderAi(data.ai_coach||{});
  setText('analyticsStatus', `Ready — ${data.session_count} sessions analyzed. Rank: ${data.career?.rank || 'Beginner'}`);
}
async function addTestSession(){
  const weak=['R','T','G','Y'].sort(()=>Math.random()-.5).slice(0,2);
  const payload={lesson_id:'phase10_test',mode:'training',wpm:Math.floor(35+Math.random()*45),accuracy:Math.floor(82+Math.random()*18),duration_sec:180,total_keys:420,correct_keys:390,wrong_keys:30,weak_keys:weak,key_times:{R:420,T:390,G:520}};
  const res=await fetch('/api/analytics/track',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':token},body:JSON.stringify(payload)});
  const data=await res.json();
  setText('analyticsStatus', data.ok ? 'Test session saved.' : (data.error||'Save failed'));
  await loadAnalytics();
}
document.addEventListener('DOMContentLoaded',()=>{
  $('refreshAnalytics')?.addEventListener('click',loadAnalytics);
  $('seedDemoSession')?.addEventListener('click',addTestSession);
  loadAnalytics().catch(err=>setText('analyticsStatus',err.message));
});
