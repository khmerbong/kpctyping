(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = id => document.getElementById(id);
  const achievements = {
    first_lesson:['First Lesson','Complete your first typing lesson.'], ten_lessons:['10 Lessons','Complete 10 typing lessons.'], wpm_50:['50 WPM','Reach 50 WPM.'], accuracy_95:['95% Accuracy','Finish a lesson with 95% accuracy or higher.'], xp_1000:['1000 XP','Earn 1000 total XP.']
  };
  function localCareer(){
    const xp=Number(localStorage.getItem('kpc_xp')||0), lessons=Number(localStorage.getItem('kpc_lessons_completed')||0), bestWpm=Number(localStorage.getItem('kpc_best_wpm')||localStorage.getItem('kpc_last_wpm')||0), acc=Number(localStorage.getItem('kpc_last_accuracy')||0);
    const level=Math.floor(xp/100)+1, progress=xp%100;
    const unlocked=[]; if(lessons>=1) unlocked.push({achievement_key:'first_lesson'}); if(lessons>=10) unlocked.push({achievement_key:'ten_lessons'}); if(bestWpm>=50) unlocked.push({achievement_key:'wpm_50'}); if(acc>=95) unlocked.push({achievement_key:'accuracy_95'}); if(xp>=1000) unlocked.push({achievement_key:'xp_1000'});
    return {ok:true, guest:true, xp, level:{level,progress_percent:progress,xp_needed_for_next:100-progress}, rank: bestWpm>=80?'Pro Typer':bestWpm>=50?'Fast Learner':'Beginner', next_rank:{name:'Fast Learner',need_xp:Math.max(0,300-xp),need_wpm:Math.max(0,50-bestWpm),need_accuracy:90}, streak:{current_streak:Number(localStorage.getItem('kpc_streak')||0),best_streak:Number(localStorage.getItem('kpc_best_streak')||0)}, stats:{lessons_completed:lessons,best_wpm:bestWpm,avg_wpm:bestWpm,best_accuracy:acc,avg_accuracy:acc,perfect_lessons:acc>=100?1:0}, achievement_count:unlocked.length, achievements:unlocked};
  }
  function nextRankText(n){ if(!n) return ''; if(n.name==='Max Rank') return n.message; return `Next: ${n.name} • need ${Math.ceil(n.need_xp||0)} XP, ${Math.ceil(n.need_wpm||0)} WPM, ${n.need_accuracy||0}% accuracy`; }
  function render(data){
    if(!data || !data.ok){ data=localCareer(); }
    $('careerRank').textContent=data.rank || 'Beginner'; $('nextRankHint').textContent=nextRankText(data.next_rank); $('careerLevel').textContent=data.level.level; $('xpBar').style.width=(data.level.progress_percent||0)+'%'; $('xpText').textContent=`${data.xp} XP • ${data.level.xp_needed_for_next} XP to Level ${data.level.level+1}`;
    const st=data.streak||{}, stats=data.stats||{}; $('careerStreak').textContent=(st.current_streak||0)+' days'; $('bestStreak').textContent='Best: '+(st.best_streak||0); $('achievementCount').textContent=data.achievement_count||0;
    $('lessonsCompleted').textContent=stats.lessons_completed||0; $('bestWpm').textContent=stats.best_wpm||0; $('avgWpm').textContent=Math.round(stats.avg_wpm||0); $('bestAccuracy').textContent=(Math.round((stats.best_accuracy||0)*10)/10)+'%'; $('avgAccuracy').textContent=(Math.round((stats.avg_accuracy||0)*10)/10)+'%'; $('perfectLessons').textContent=stats.perfect_lessons||0;
    const unlocked=new Set((data.achievements||[]).map(a=>a.achievement_key)); $('achievementList').innerHTML=Object.entries(achievements).map(([key,val])=>`<article class="achievement ${unlocked.has(key)?'':'locked'}"><b>${unlocked.has(key)?'🏆':'🔒'} ${val[0]}</b><small>${val[1]}</small></article>`).join('');
    $('careerStatus').textContent=data.guest?'Guest career loaded from this browser. Login can be fixed later for account sync.':'Career loaded from account.';
  }
  async function load(){ try{ const r=await fetch('/api/career'); if(r.ok){ render(await r.json()); return; } }catch(e){} render(localCareer()); }
  function addLocalXP(amount){ localStorage.setItem('kpc_xp', String(Number(localStorage.getItem('kpc_xp')||0)+amount)); localStorage.setItem('kpc_streak','1'); localStorage.setItem('kpc_best_streak', Math.max(1, Number(localStorage.getItem('kpc_best_streak')||0))); render(localCareer()); }
  $('dailyRewardBtn')?.addEventListener('click',()=>addLocalXP(15)); $('testLessonXP')?.addEventListener('click',()=>{ localStorage.setItem('kpc_lessons_completed', String(Number(localStorage.getItem('kpc_lessons_completed')||0)+1)); addLocalXP(25); });
  window.KPCCareer={refresh:load, claimXP:(p)=>{addLocalXP(25); return Promise.resolve({ok:true});}};
  load();
})();
