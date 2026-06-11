(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const page = document.body?.dataset.page || 'friends';
  const $ = (id) => document.getElementById(id);
  const esc = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const initials = (name='?') => esc(name.trim().slice(0,2).toUpperCase() || '?');

  function toast(message){
    const stack = $('toastStack');
    if(!stack) return;
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3500);
  }

  async function api(url, options={}){
    const res = await fetch(url, {
      ...options,
      headers: {'Content-Type':'application/json','X-CSRF-Token':csrf, ...(options.headers || {})}
    });
    const data = await res.json().catch(() => ({ok:false,error:'invalid_json'}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  function userRow(user, actions=''){
    const status = user.presence || 'offline';
    return `<div class="social-row">
      <div class="social-user">
        <div class="avatar">${initials(user.username)}</div>
        <div>
          <div class="user-name"><span class="presence ${esc(status)}"></span> ${esc(user.username)}</div>
          <div class="user-meta">Lv ${user.level || 1} • ${esc(user.career_rank || 'Beginner')} • ${Number(user.best_wpm || 0).toFixed(0)} WPM • ${Number(user.best_accuracy || 0).toFixed(0)}%</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div>
    </div>`;
  }

  async function loadFriends(){
    try{
      const data = await api('/api/friends');
      const friends = data.friends || [];
      const list = $('friendsList');
      if($('friendCount')) $('friendCount').textContent = friends.length;
      if($('onlineCount')) $('onlineCount').textContent = friends.filter(f => f.presence === 'online').length;
      if($('pendingCount')) $('pendingCount').textContent = data.pending_requests || 0;
      if($('navPending')) $('navPending').textContent = data.pending_requests || 0;
      if($('bestFriendWpm')) $('bestFriendWpm').textContent = Math.max(0, ...friends.map(f => Number(f.best_wpm || 0))).toFixed(0);
      if(list){
        list.innerHTML = friends.length ? friends.map(f => userRow(f, `<button class="social-btn ghost" data-view="${esc(f.username)}">Profile</button><button class="social-btn danger" data-remove="${f.id}">Remove</button>`)).join('') : '<div class="empty-state">No friends yet. Search a player and send your first request.</div>';
        list.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', async () => {
          try { await api('/api/friends/remove', {method:'POST', body:JSON.stringify({friend_id:Number(btn.dataset.remove), csrf_token:csrf})}); toast('Friend removed'); loadFriends(); }
          catch(err){ toast(err.message); }
        }));
        list.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => location.href = `/social-profile/${encodeURIComponent(btn.dataset.view)}`));
      }
    }catch(err){
      if($('friendsList')) $('friendsList').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  }

  function setupSearch(){
    const input = $('playerSearch');
    const output = $('searchResults');
    if(!input || !output) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim();
        if(q.length < 2){ output.innerHTML = '<div class="empty-state">Type at least 2 letters.</div>'; return; }
        try{
          const data = await api(`/api/friends/search?q=${encodeURIComponent(q)}`);
          const users = data.users || [];
          output.innerHTML = users.length ? users.map(u => {
            let action = '<span class="pill">Already friend</span>';
            if(!u.is_friend && !u.pending) action = `<button class="social-btn" data-add="${esc(u.username)}">Add Friend</button>`;
            if(u.pending) action = '<span class="pill">Pending</span>';
            return userRow(u, action);
          }).join('') : '<div class="empty-state">No players found.</div>';
          output.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', async () => {
            try { await api('/api/friends/request', {method:'POST', body:JSON.stringify({username:btn.dataset.add, csrf_token:csrf})}); toast('Friend request sent'); btn.outerHTML='<span class="pill">Pending</span>'; }
            catch(err){ toast(err.message); }
          }));
        }catch(err){ output.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`; }
      }, 260);
    });
  }

  async function loadRequests(){
    try{
      const data = await api('/api/friends/requests');
      const incoming = data.incoming || [];
      const outgoing = data.outgoing || [];
      if($('incomingRequests')){
        $('incomingRequests').innerHTML = incoming.length ? incoming.map(r => userRow(r.user || {}, `<button class="social-btn good" data-accept="${r.request_id}">Accept</button><button class="social-btn ghost" data-reject="${r.request_id}">Reject</button>`)).join('') : '<div class="empty-state">No incoming requests.</div>';
        $('incomingRequests').querySelectorAll('[data-accept],[data-reject]').forEach(btn => btn.addEventListener('click', async () => {
          const action = btn.dataset.accept ? 'accept' : 'reject';
          const request_id = Number(btn.dataset.accept || btn.dataset.reject);
          try { await api('/api/friends/respond', {method:'POST', body:JSON.stringify({request_id, action, csrf_token:csrf})}); toast(`Request ${action}ed`); loadRequests(); }
          catch(err){ toast(err.message); }
        }));
      }
      if($('outgoingRequests')){
        $('outgoingRequests').innerHTML = outgoing.length ? outgoing.map(r => userRow(r.user || {}, '<span class="pill">Waiting</span>')).join('') : '<div class="empty-state">No outgoing requests.</div>';
      }
    }catch(err){
      if($('incomingRequests')) $('incomingRequests').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  }

  async function loadActivity(){
    const feed = $('activityFeed');
    if(!feed) return;
    try{
      const data = await api('/api/activity');
      const items = data.activities || [];
      feed.innerHTML = items.length ? items.slice(0,8).map(a => `<div class="activity-item"><b>${esc(a.username)}</b><br>${esc(a.title)}<div class="user-meta">${esc(a.created_at || '')}</div></div>`).join('') : '<div class="empty-state">No friend activity yet.</div>';
    }catch(err){ feed.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`; }
  }

  async function loadLeaderboard(){
    const box = $('friendsRank');
    if(!box) return;
    try{
      const data = await api('/api/friends/leaderboard');
      const players = data.players || [];
      box.innerHTML = players.length ? `<table class="rank-table"><thead><tr><th>#</th><th>Player</th><th>WPM</th><th>Accuracy</th><th>XP</th><th>Rank</th></tr></thead><tbody>${players.map(p => `<tr><td>${p.rank}</td><td>${esc(p.username)}</td><td>${Number(p.best_wpm||0).toFixed(0)}</td><td>${Number(p.best_accuracy||0).toFixed(0)}%</td><td>${Number(p.xp||0)}</td><td>${esc(p.career_rank||'Beginner')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">No ranking data yet.</div>';
    }catch(err){ box.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`; }
  }

  if(page === 'friends'){ loadFriends(); setupSearch(); loadActivity(); setInterval(loadFriends, 30000); }
  if(page === 'requests'){ loadRequests(); }
  if(page === 'friends-leaderboard'){ loadLeaderboard(); }
})();
