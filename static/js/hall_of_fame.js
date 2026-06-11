(function(){
 const grid=document.getElementById('hofGrid');
 const titles={highest_wpm:'🚀 Highest WPM',highest_accuracy:'🎯 Highest Accuracy',highest_score:'🏆 Highest Score'};
 async function load(){const res=await fetch('/api/hall-of-fame'); const data=await res.json(); grid.innerHTML=Object.entries(data.records||{}).map(([key,items])=>`<article class="card record-card"><h3>${titles[key]||key}</h3>${items.length?items.map((r,i)=>`<div class="record-row"><span>#${i+1} ${r.username}<br><small>${r.country}</small></span><strong>${r.value}</strong></div>`).join(''):'<p class="muted">No records yet.</p>'}</article>`).join('');}
 load();
})();
