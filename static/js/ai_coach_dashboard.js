(function(){
  "use strict";
  function $(id){return document.getElementById(id)}
  function localPayload(){
    const data=(window.KPCAICoach&&window.KPCAICoach.readLocal())||{events:[],sessions:[]};
    const map={};
    data.events.forEach(e=>{const k=e.key||e.expected||'?'; if(!map[k]) map[k]={key_value:k,hits:0,misses:0,total_reaction_ms:0,slow_count:0}; if(e.correct) map[k].hits++; else map[k].misses++; const r=Number(e.reaction_ms||0); map[k].total_reaction_ms+=r; if(r>=900) map[k].slow_count++;});
    return {key_stats:Object.values(map), sessions:data.sessions||[]};
  }
  function merge(server){
    const loc=localPayload();
    const map={};
    (server.weak_keys||[]).concat(server.slow_keys||[]).forEach(r=>{map[r.key_value]=Object.assign({},r)});
    loc.key_stats.forEach(r=>{const k=r.key_value; if(!map[k]) map[k]={key_value:k,hits:0,misses:0,total_reaction_ms:0,slow_count:0}; map[k].hits+=r.hits; map[k].misses+=r.misses; map[k].total_reaction_ms+=r.total_reaction_ms; map[k].slow_count+=r.slow_count;});
    const stats=Object.values(map);
    const hits=stats.reduce((a,b)=>a+Number(b.hits||0),0), misses=stats.reduce((a,b)=>a+Number(b.misses||0),0), total=hits+misses;
    const score=r=>Number(r.misses||0)*5+Number(r.slow_count||0)*2+Math.max(0,(Number(r.total_reaction_ms||0)/Math.max(1,Number(r.hits||0)+Number(r.misses||0)))-650)/100;
    const weak=stats.slice().sort((a,b)=>score(b)-score(a)).slice(0,8);
    const slow=stats.slice().sort((a,b)=>Number(b.slow_count||0)-Number(a.slow_count||0)).slice(0,8);
    const keys=(weak.map(x=>x.key_value).filter(Boolean));
    return {summary:{total_hits:hits,total_misses:misses,accuracy:total?Math.round((hits/total)*1000)/10:100,sessions:(server.sessions||[]).length+(loc.sessions||[]).length},weak_keys:weak,slow_keys:slow,recommended_lesson:{keys:keys.length?keys:['F','J','D','K','SPACE'],text:((keys.length?keys:['F','J','D','K','SPACE']).join(' ')+' ').repeat(10).trim(),goal:'Practice slowly until accuracy reaches 95% before increasing speed.'},sessions:(loc.sessions||[]).concat(server.sessions||[]).slice(0,20)};
  }
  function keyRow(r,max){const total=Number(r.hits||0)+Number(r.misses||0); const avg=Math.round(Number(r.total_reaction_ms||0)/Math.max(1,total)); const pct=Math.min(100,Math.round(((Number(r.misses||0)*5+Number(r.slow_count||0)*2)/Math.max(1,max))*100)); return `<div class="ai-key-row"><div class="ai-key">${String(r.key_value||'?')}</div><div class="ai-key-meta"><b>${r.misses||0} misses • ${r.hits||0} correct</b><small>${avg}ms avg • ${r.slow_count||0} slow hits</small><div class="ai-bar"><i style="width:${pct}%"></i></div></div><small>${total} tries</small></div>`;}
  function render(data){
    $('aiTotalHits').textContent=data.summary.total_hits; $('aiTotalMisses').textContent=data.summary.total_misses; $('aiAccuracy').textContent=data.summary.accuracy+'%'; $('aiSessions').textContent=data.summary.sessions;
    const max=Math.max(1,...data.weak_keys.map(r=>Number(r.misses||0)*5+Number(r.slow_count||0)*2));
    $('aiWeakKeys').innerHTML=data.weak_keys.length?data.weak_keys.map(r=>keyRow(r,max)).join(''):'<div class="ai-empty">No weak keys yet. Practice in Training Mode first.</div>';
    $('aiSlowKeys').innerHTML=data.slow_keys.length?data.slow_keys.map(r=>keyRow(r,max)).join(''):'<div class="ai-empty">No slow keys yet.</div>';
    $('aiLessonText').value=data.recommended_lesson.text; $('aiPracticeGoal').textContent=data.recommended_lesson.goal;
    $('aiRecentSessions').innerHTML=data.sessions.length?data.sessions.map(s=>`<div class="ai-session"><b>${s.lesson_name||'Training Lesson'}</b><span>${s.wpm||0} WPM</span><span>${s.accuracy||0}%</span><small>${String(s.created_at||'').slice(0,19).replace('T',' ')}</small></div>`).join(''):'<div class="ai-empty">No sessions yet.</div>';
    $('aiStatus').textContent='AI Coach updated. Data shown includes local browser practice and synced account data when available.';
  }
  async function load(){
    let server={ok:true,summary:{},weak_keys:[],slow_keys:[],sessions:[],recommended_lesson:{}};
    try{server=await (await fetch('/api/ai-coach')).json();}catch(e){}
    render(merge(server));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    load();
    $('aiRefresh').addEventListener('click',load);
    $('aiCopyLesson').addEventListener('click',()=>{navigator.clipboard&&navigator.clipboard.writeText($('aiLessonText').value); $('aiStatus').textContent='Lesson text copied.';});
    $('aiClearLocal').addEventListener('click',()=>{localStorage.removeItem('kpc_phase8_ai_events');localStorage.removeItem('kpc_phase8_ai_sessions');load();});
  });
})();
