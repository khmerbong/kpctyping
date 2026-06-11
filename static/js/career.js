(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = id => document.getElementById(id);
  const allAchievements = {
    first_lesson:['First Lesson','Complete your first typing lesson.'],ten_lessons:['10 Lessons','Complete 10 typing lessons.'],hundred_lessons:['100 Lessons','Complete 100 typing lessons.'],wpm_50:['50 WPM','Reach 50 WPM.'],wpm_80:['80 WPM','Reach 80 WPM.'],wpm_100:['100 WPM','Reach 100 WPM.'],accuracy_95:['95% Accuracy','Finish a lesson with 95% accuracy or higher.'],perfect_accuracy:['Perfect Accuracy','Finish a lesson with 100% accuracy.'],streak_7:['7-Day Streak','Practice for 7 days in a row.'],streak_30:['30-Day Streak','Practice for 30 days in a row.'],xp_1000:['1000 XP','Earn 1000 total XP.']
  };
  function nextRankText(n){ if(!n) return ''; if(n.name==='Max Rank') return n.message; return `Next: ${n.name} • need ${Math.ceil(n.need_xp||0)} XP, ${Math.ceil(n.need_wpm||0)} WPM, ${n.need_accuracy||0}% accuracy`; }
  function render(data){
    if(!data || !data.ok){ $('careerStatus').textContent='Unable to load career data.'; return; }
    $('careerRank').textContent=data.rank || 'Beginner';
    $('nextRankHint').textContent=nextRankText(data.next_rank);
    $('careerLevel').textContent=data.level.level;
    $('xpBar').style.width=(data.level.progress_percent||0)+'%';
    $('xpText').textContent=`${data.xp} XP • ${data.level.xp_needed_for_next} XP to Level ${data.level.level+1}`;
    const st=data.streak||{}, stats=data.stats||{};
    $('careerStreak').textContent=(st.current_streak||0)+' days'; $('bestStreak').textContent='Best: '+(st.best_streak||0);
    $('achievementCount').textContent=data.achievement_count||0;
    $('lessonsCompleted').textContent=stats.lessons_completed||0; $('bestWpm').textContent=stats.best_wpm||0; $('avgWpm').textContent=Math.round(stats.avg_wpm||0);
    $('bestAccuracy').textContent=(Math.round((stats.best_accuracy||0)*10)/10)+'%'; $('avgAccuracy').textContent=(Math.round((stats.avg_accuracy||0)*10)/10)+'%'; $('perfectLessons').textContent=stats.perfect_lessons||0;
    const unlocked=new Set((data.achievements||[]).map(a=>a.achievement_key));
    $('achievementList').innerHTML=Object.entries(allAchievements).map(([key,val])=>`<article class="achievement ${unlocked.has(key)?'':'locked'}"><b>${unlocked.has(key)?'🏆':'🔒'} ${val[0]}</b><small>${val[1]}</small></article>`).join('');
    $('careerStatus').textContent='Career loaded successfully.';
  }
  async function load(){ const r=await fetch('/api/career'); if(r.status===401){ location.href='/login'; return; } render(await r.json()); }
  async function post(url, body){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify(Object.assign({csrf_token:csrf}, body||{}))}); const j=await r.json(); if(j.career) render(j.career); $('careerStatus').textContent=j.message || (j.awarded_xp?`Awarded +${j.awarded_xp} XP`:(j.duplicate?'Already claimed for this lesson today.':'Updated.')); return j; }
  window.KPCCareer={claimXP:(payload)=>post('/api/xp/claim',payload),refresh:load};
  $('dailyRewardBtn')?.addEventListener('click',()=>post('/api/daily-reward',{}));
  $('testLessonXP')?.addEventListener('click',()=>post('/api/xp/claim',{event_type:'lesson_complete',lesson_id:'career-test',wpm:50,accuracy:95}));
  load();
})();
