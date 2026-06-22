window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
(() => {
  const arena = document.getElementById("spaceArena");
  const input = document.getElementById("spaceInput");
  const startBtn = document.getElementById("spaceStart");
  const restartBtn = document.getElementById("spaceRestart");
  const msg = document.getElementById("spaceCenterMsg");
  const status = document.getElementById("spaceStatus");
  const bossBar = document.getElementById("bossBar");
  const bossFill = document.getElementById("bossFill");

  const livesEl = document.getElementById("spaceLives");
  const scoreEl = document.getElementById("spaceScore");
  const levelEl = document.getElementById("spaceLevel");
  const comboEl = document.getElementById("spaceCombo");
  const bestEl = document.getElementById("spaceBest");

  const words = [
    "star","moon","orbit","rocket","laser","alien","planet","galaxy","meteor","comet",
    "cosmos","gravity","nebula","saturn","jupiter","apollo","asteroid","mission","launch","signal",
    "typing","keyboard","speed","defender","shuttle","voyage","eclipse","station","solar","space",
    "universe","blackhole","spaceship","constellation","interstellar","satellite"
  ];

  const lanes = [42, 100, 158, 216, 274, 332];
  let objects = [];
  let running = false;
  let lives = 5;
  let score = 0;
  let level = 1;
  let combo = 0;
  let kills = 0;
  let lastSpawn = 0;
  let raf = null;
  let best = Number(localStorage.getItem("kpc_space_best") || 0);
  let bossActive = false;

  bestEl.textContent = best; window.KPCGameStats.best = best;

  function audio(freq, dur = 0.08, type = "sine") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch (e) {}
  }

  function hearts() {
    return "❤️".repeat(Math.max(0, lives));
  }

  function updateHud() {
    livesEl.textContent = hearts();
    scoreEl.textContent = score; window.KPCGameStats.score = score;
    levelEl.textContent = level; window.KPCGameStats.level = level;
    comboEl.textContent = combo; window.KPCGameStats.combo = combo;
    bestEl.textContent = Math.max(best, score);
  }

  function randomWord() {
    const pool = level >= 8 ? words.concat(["spaceship","interstellar","constellation","blackhole"]) : words;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function pickType() {
    if (level % 5 === 0 && !bossActive && kills > 0) return "boss";
    const r = Math.random();
    if (level >= 7 && r < 0.18) return "ufo";
    if (level >= 4 && r < 0.42) return "fast";
    return "asteroid";
  }

  function laneFree(laneIndex) {
    return !objects.some(o => o.lane === laneIndex && o.x > arena.clientWidth - 340);
  }

  function spawn() {
    if (window.KPCPause?.isPaused?.()) return;
    let maxEnemies = 3;
    if (level >= 4) maxEnemies = 4;
    if (level >= 7) maxEnemies = 5;
    if (level >= 10) maxEnemies = 6;

    if (objects.length >= maxEnemies) return;
    if (!running) return;
    const freeLanes = lanes.map((_, i) => i).filter(laneFree);
    if (!freeLanes.length) return;

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const type = pickType();
    const boss = type === "boss";
    bossActive = bossActive || boss;

    const hp = boss ? Math.min(10, 3 + Math.floor(level / 5)) : type === "ufo" ? 2 : 1;
    const speed = boss ? 0.38 + level * 0.025 : type === "fast" ? 1.15 + level * 0.055 : type === "ufo" ? 0.82 + level * 0.035 : 0.62 + level * 0.035;
    const icon = boss ? "👾" : type === "ufo" ? "🛸" : "☄️";
    const word = randomWord();

    const el = document.createElement("div");
    el.className = `space-target ${type}`;
    el.style.left = (arena.clientWidth + 80) + "px";
    el.style.top = lanes[lane] + "px";
    el.innerHTML = `
      <div class="target-icon">${icon}</div>
      <div class="target-word">${word}</div>
      <small>${type.toUpperCase()}</small>
    `;
    arena.appendChild(el);

    objects.push({ el, lane, type, word, hp, maxHp: hp, speed, x: arena.clientWidth + 80, y: lanes[lane] });
    updateBossBar();
  }

  function boom(x, y, big = false) {
    const e = document.createElement("div");
    e.className = big ? "space-boom big" : "space-boom";
    e.style.left = x + "px";
    e.style.top = y + "px";
    e.textContent = big ? "💥✨" : "💥";
    arena.appendChild(e);
    setTimeout(() => e.remove(), 700);
  }

  function updateBossBar() {
    const b = objects.find(o => o.type === "boss");
    if (!b) {
      bossBar.classList.add("hidden");
      bossActive = false;
      return;
    }
    bossBar.classList.remove("hidden");
    bossFill.style.width = Math.max(0, (b.hp / b.maxHp) * 100) + "%";
  }

  function destroy(obj) {
    boom(obj.x, obj.y, obj.type === "boss");
    obj.el.remove();
    objects = objects.filter(o => o !== obj);

    const points = obj.type === "boss" ? 300 : obj.type === "ufo" ? 70 : obj.type === "fast" ? 45 : 30;
    score += points + combo * 3;
    combo += 1;
    kills += 1;

    status.textContent = `${obj.type.toUpperCase()} destroyed! +${points} score`;
    audio(obj.type === "boss" ? 160 : 620, obj.type === "boss" ? 0.22 : 0.08, "square");

    if (obj.type === "boss") {
      bossActive = false;
      if (window.KPCAchievements) window.KPCAchievements.check({ bossKilled: true });
    }

    if (window.KPCAchievements) {
      window.KPCAchievements.check({ spaceKills: kills, combo, level });
    }

    if (kills % 8 === 0) {
      level += 1;
      msg.textContent = `Level ${level}!`;
      msg.classList.add("show");
      audio(880, 0.15, "triangle");
      setTimeout(() => msg.classList.remove("show"), 1100);
    }

    updateBossBar();
    updateHud();
  }

  function typeCheck() {
    if (window.KPCPause?.isPaused?.()) return;
    const typed = input.value.trim().toLowerCase();
    if (!typed) return;

    const target = objects.find(o => o.word.toLowerCase() === typed);
    if (!target) {
      return;
    }

    input.value = "";
    target.hp -= 1;
    target.el.classList.add("hit");
    setTimeout(() => target.el.classList.remove("hit"), 160);

    if (target.hp <= 0) {
      destroy(target);
    } else {
      status.textContent = `Hit ${target.type}! HP ${target.hp}/${target.maxHp}`;
      audio(350, 0.06, "sawtooth");
      updateBossBar();
    }
  }

  function gameOver() {
  setTimeout(() => { if (window.showGameOverlay) window.showProfessionalGameOver(window.KPCGameStats); }, 600);
    running = false;
    input.disabled = true;
    msg.textContent = `Game Over — Score ${score}`;
    msg.classList.add("show");
    audio(120, 0.35, "sawtooth");

    if (score > best) {
      best = score;
      localStorage.setItem("kpc_space_best", best);
    }

    try {
      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": (document.querySelector('meta[name="csrf-token"]') || {}).content || "" },
        body: JSON.stringify({
          player_name: window.KPCPlayer ? window.KPCPlayer.getName() : "Guest Player",
          game: "space",
          score,
          combo,
          level,
          wpm: 0
        })
      });
    } catch (e) {}

    updateHud();
  }

  function loop(t) {
    if (!running) return;
    if (window.KPCPause?.isPaused?.()) {
      raf = requestAnimationFrame(loop);
      return;
    }
    let spawnEvery = 2000;
    if (level >= 2) spawnEvery = 1800;
    if (level >= 3) spawnEvery = 1600;
    if (level >= 4) spawnEvery = 1400;
    if (level >= 5) spawnEvery = 1200;

    if (t - lastSpawn > spawnEvery) {
      spawn();
      lastSpawn = t;
    }

    objects.slice().forEach(obj => {
      obj.x -= obj.speed;
      obj.el.style.left = obj.x + "px";

      if (obj.x < 90) {
        boom(obj.x, obj.y);
        obj.el.remove();
        objects = objects.filter(o => o !== obj);
        lives -= 1;
        combo = 0;
        status.textContent = `${obj.type.toUpperCase()} hit your base!`;
        audio(190, 0.12, "sawtooth");
        updateBossBar();
        updateHud();
        if (lives <= 0) {
          gameOver();
        }
      }
    });

    raf = requestAnimationFrame(loop);
  }

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    objects.forEach(o => o.el.remove());
    objects = [];
    running = true;
    if (window.KPCPause?.setPaused) window.KPCPause.setPaused(false);
    lives = 5;
    score = 0;
    level = 1;
    combo = 0;
    kills = 0;
    lastSpawn = 0;
    bossActive = false;
    input.value = "";
    input.disabled = false;
    input.focus();
    msg.textContent = "Mission started!";
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 900);
    status.textContent = "Destroy incoming asteroids!";
    updateBossBar();
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  input.addEventListener("input", typeCheck);
  startBtn.addEventListener("click", reset);
  restartBtn.addEventListener("click", reset);

  updateHud();
})();
