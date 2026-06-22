window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};

window.showProfessionalGameOver = function(data){
 const ov=document.getElementById('gameOverlay');
 if(!ov) return;
 ov.style.display='flex';
 const title=document.getElementById('overlayTitle');
 const sub=document.getElementById('overlaySubtitle');
 if(title) title.innerHTML='🏆 GAME OVER';

 const score=data?.score||0;
 const best=data?.best||0;
 const level=data?.level||1;
 const combo=data?.combo||0;

 const card=ov.querySelector('.game-overlay-card');
 if(card){
   card.innerHTML=`
    <div class="game-over-card">
      <h1>🏆 GAME OVER</h1>
      <div class="game-over-stats">
        <div><b>Score</b><br>${score}</div>
        <div><b>Best</b><br>${best}</div>
        <div><b>Level</b><br>${level}</div>
        <div><b>Combo</b><br>${combo}</div>
      </div>
      <div class="game-over-actions">
        <button class="overlay-play-btn" onclick="location.reload()">🔄 Play Again</button>
        <button class="overlay-play-btn" onclick="location.href='/'">🏠 Home</button>
      </div>
    </div>`;
 }
};
