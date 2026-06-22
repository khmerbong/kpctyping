(function(){
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function load(){
    const table = document.querySelector('.kpc-table tbody'); if(!table) return;
    const params = new URLSearchParams(location.search); const game = params.get('game') || 'all';
    try{
      const res = await fetch('/api/leaderboard?game='+encodeURIComponent(game));
      const payload = await res.json();
      const rows = Array.isArray(payload) ? payload : (payload.scores || payload.data || []);
      if(!Array.isArray(rows) || !rows.length) return;
      table.innerHTML = rows.map((r,i)=>`<tr><td data-label="#">${i+1}</td><td data-label="Guest Player">${esc(r.player_name||r.username||'Guest Player')}</td><td data-label="Game">${esc(r.game||r.game_type||'speed')}</td><td data-label="Score">${esc(r.score||0)}</td><td data-label="Combo">${esc(r.combo||0)}</td><td data-label="Level">${esc(r.level||1)}</td><td data-label="WPM"><strong class="kpc-accent-red">${esc(r.wpm||0)}</strong></td><td data-label="Date">${esc(r.created_at||'')}</td></tr>`).join('');
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
