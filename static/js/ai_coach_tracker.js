(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  function guestId(){
    let id = localStorage.getItem('kpc_ai_guest_id');
    if(!id){ id='guest_'+Math.random().toString(36).slice(2)+Date.now().toString(36); localStorage.setItem('kpc_ai_guest_id',id); }
    return id;
  }
  let lastAt = performance.now();
  let buffer = [];
  function expectedKey(){
    return (document.getElementById('targetKey')?.textContent || document.getElementById('phase41NextKey')?.textContent || '').trim().slice(0,1);
  }
  async function flush(){
    if(!buffer.length) return;
    const events = buffer.splice(0, buffer.length);
    try{
      await fetch('/api/ai-coach/track', {method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf,'X-Guest-ID':guestId()}, body:JSON.stringify({csrf_token:csrf, lesson_name:document.getElementById('lessonName')?.textContent || 'Training Mode', events})});
    }catch(e){ buffer.unshift(...events.slice(-50)); }
  }
  document.addEventListener('keydown', function(e){
    if(e.key.length !== 1) return;
    const now = performance.now();
    const dt = Math.round(now - lastAt); lastAt = now;
    const expect = expectedKey();
    const correct = expect ? e.key.toLowerCase() === expect.toLowerCase() : true;
    buffer.push({key:e.key, expected_key:expect, correct:correct, time_ms:dt, slow:dt >= 900});
    if(buffer.length >= 12) flush();
  }, true);
  setInterval(flush, 6000);
  window.addEventListener('beforeunload', flush);
})();
