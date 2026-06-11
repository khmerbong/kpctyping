window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
window.__kpcZombieKills = window.__kpcZombieKills || 0;
const zombieWords = [
  "brain","night","grave","ghost","danger","hunter","shadow","panic","escape","shield",
  "attack","typing","speed","survive","monster","target","keyboard","castle","zombie","rescue",
  "silent","forest","dark","runner","strong","clever","school","puzzle","rocket","memory",
  "power","storm","secret","battle","magic","dragon","window","lesson","planet","winner"
];

const ZOMBIE_WALK_FRAMES = Array.from({ length: 24 }, (_, i) =>
  `/static/images/zombie/walk/zombie_walk_${String(i + 1).padStart(2, "0")}.png`
);
const ZOMBIE_FRAME_SPEED = 75;

const bossWords = ["mega zombie", "dark monster", "shadow hunter", "green nightmare", "typing boss"];

const zombieTypes = {
  normal: { label: "Normal", icon: "🧟", speed: 1, hp: 1, score: 10, coins: 1, className: "normal-zombie" },
  fast: { label: "Fast", icon: "⚡🧟", speed: 1.55, hp: 1, score: 14, coins: 2, className: "fast-zombie" },
  tank: { label: "Tank", icon: "🛡️🧟", speed: 0.72, hp: 3, score: 24, coins: 4, className: "tank-zombie" },
  toxic: { label: "Toxic", icon: "☠️🧟", speed: 1.08, hp: 2, score: 18, coins: 3, className: "toxic-zombie" },
  boss: { label: "Boss", icon: "👑🧟", speed: 0.62, hp: 5, score: 70, coins: 12, className: "boss-zombie" }
};

const startBtn = document.getElementById("zombieStartBtn");
const modalRestartBtn = document.getElementById("modalRestartBtn");
const arena = document.getElementById("zombieArena");
const input = document.getElementById("zombieInput");
const hint = document.getElementById("zombieHint");
const message = document.getElementById("zombieMessage");
const livesEl = document.getElementById("zombieLives");
const scoreEl = document.getElementById("zombieScore");
const levelEl = document.getElementById("zombieLevel");
const comboEl = document.getElementById("zombieCombo");
const coinsEl = document.getElementById("zombieCoins");
const runCoinsEl = document.getElementById("runCoins");
const shopMessage = document.getElementById("shopMessage");
const buyLifeBtn = document.getElementById("buyLifeBtn");
const slowTimeBtn = document.getElementById("slowTimeBtn");
const doubleScoreBtn = document.getElementById("doubleScoreBtn");
const bombBtn = document.getElementById("bombBtn");
const bestScoreEl = document.getElementById("bestScore");
const bestComboEl = document.getElementById("bestCombo");
const bestLevelEl = document.getElementById("bestLevel");
const modal = document.getElementById("gameOverModal");
const finalScoreEl = document.getElementById("finalScore");
const finalComboEl = document.getElementById("finalCombo");
const finalLevelEl = document.getElementById("finalLevel");
const levelToast = document.getElementById("levelToast");
const bossHud = document.getElementById("bossHud");
const bossHpText = document.getElementById("bossHpText");
const bossHpFill = document.getElementById("bossHpFill");

let zombies = [];
let score = 0;
let lives = 5;
let level = 1;
let combo = 0;
let bestComboRun = 0;
let running = false;
let spawnTimer = null;
let loopId = null;
let lastTime = 0;
let kills = 0;
let runCoins = 0;
let bossAlive = false;
let audioCtx = null;
let nextBossLevel = 5;
let soundUnlocked = false;
let slowUntil = 0;
let doubleScoreUntil = 0;

const lanes = [30, 82, 134, 186, 238, 290];
const BASE_X = 76;
const MIN_SPAWN_GAP = 360;

function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    soundUnlocked = true;
  } catch (e) {
    soundUnlocked = false;
  }
}

function tone(freq = 440, duration = 0.08, type = "sine", volume = 0.055, delay = 0) {
  try {
    unlockAudio();
    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration);
  } catch (e) {}
}

function noise(duration = 0.2, volume = 0.05, delay = 0) {
  try {
    unlockAudio();
    const start = audioCtx.currentTime + delay;
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(start);
    source.stop(start + duration);
  } catch (e) {}
}

function playCorrectSound() {
  tone(620, 0.055, "triangle", 0.045);
  tone(820, 0.065, "triangle", 0.04, 0.055);
}

function playZombieDeathSound(isBoss = false) {
  noise(isBoss ? 0.38 : 0.24, isBoss ? 0.085 : 0.06);
  tone(isBoss ? 130 : 180, isBoss ? 0.22 : 0.14, "sawtooth", isBoss ? 0.055 : 0.04);
  tone(isBoss ? 420 : 320, 0.07, "square", 0.035, 0.08);
}

function playWrongSound() {
  tone(150, 0.09, "sawtooth", 0.045);
  tone(100, 0.11, "sawtooth", 0.035, 0.08);
}

function playLevelUpSound() {
  tone(520, 0.08, "triangle", 0.04);
  tone(720, 0.1, "triangle", 0.045, 0.08);
  tone(980, 0.14, "triangle", 0.04, 0.18);
}

function playBaseHitSound() {
  tone(210, 0.12, "sawtooth", 0.055);
  noise(0.15, 0.035);
}

function playGameOverSound() {
  tone(260, 0.18, "sawtooth", 0.055);
  tone(190, 0.22, "sawtooth", 0.05, 0.18);
  tone(110, 0.4, "sawtooth", 0.055, 0.42);
  noise(0.55, 0.045, 0.1);
}

function randomWord() {
  return zombieWords[Math.floor(Math.random() * zombieWords.length)];
}

function randomBossWord() {
  return bossWords[Math.floor(Math.random() * bossWords.length)];
}

function getBest() {
  return {
    score: Number(localStorage.getItem("kpcZombieBestScore") || 0),
    combo: Number(localStorage.getItem("kpcZombieBestCombo") || 0),
    level: Number(localStorage.getItem("kpcZombieBestLevel") || 1),
    coins: Number(localStorage.getItem("kpcZombieCoins") || 0),
  };
}

function addCoins(amount) {
  runCoins += amount;
  const current = Number(localStorage.getItem("kpcZombieCoins") || 0);
  localStorage.setItem("kpcZombieCoins", current + amount);
}

function saveBest() {
  const best = getBest();
  localStorage.setItem("kpcZombieBestScore", Math.max(best.score, score));
  localStorage.setItem("kpcZombieBestCombo", Math.max(best.combo, bestComboRun));
  localStorage.setItem("kpcZombieBestLevel", Math.max(best.level, level));
  showBest();
}

function showBest() {
  const best = getBest();
  bestScoreEl.textContent = best.score;
  bestComboEl.textContent = best.combo;
  bestLevelEl.textContent = best.level;
  if (coinsEl) coinsEl.textContent = best.coins;
  if (runCoinsEl) runCoinsEl.textContent = runCoins;
}

function getCoins() {
  return Number(localStorage.getItem("kpcZombieCoins") || 0);
}

function setCoins(value) {
  localStorage.setItem("kpcZombieCoins", Math.max(0, value));
  showBest();
}

function showShopMessage(text) {
  if (!shopMessage) return;
  shopMessage.textContent = text;
  shopMessage.classList.add("show");
  setTimeout(() => shopMessage.classList.remove("show"), 1400);
}

function spendCoins(cost) {
  const coins = getCoins();
  if (coins < cost) {
    showShopMessage(`Need ${cost} coins. Keep killing zombies!`);
    playWrongSound();
    return false;
  }
  setCoins(coins - cost);
  playCorrectSound();
  return true;
}

function buyLife() {
  if (!running) return showShopMessage("Start the game first.");
  if (lives >= 5) return showShopMessage("Lives already full.");
  if (!spendCoins(15)) return;
  lives += 1;
  updateStats();
  showShopMessage("❤️ +1 Life purchased");
}

function activateSlowTime() {
  if (!running) return showShopMessage("Start the game first.");
  if (!spendCoins(25)) return;
  slowUntil = performance.now() + 8000;
  showShopMessage("⚡ Slow Time active for 8s");
}

function activateDoubleScore() {
  if (!running) return showShopMessage("Start the game first.");
  if (!spendCoins(40)) return;
  doubleScoreUntil = performance.now() + 15000;
  showShopMessage("🔥 Double Score active for 15s");
}

function useBomb() {
  if (!running) return showShopMessage("Start the game first.");
  if (!zombies.length) return showShopMessage("No zombies to bomb.");
  if (!spendCoins(60)) return;
  const targets = zombies.slice();
  targets.forEach(z => {
    kills++;
    score += Math.floor(z.type.score / 2);
    removeZombie(z, false);
  });
  combo = 0;
  message.textContent = `💣 Bomb cleared ${targets.length} zombies!`;
  playZombieDeathSound(true);
  levelCheck();
  updateStats();
}

function updateStats() {
  livesEl.textContent = "❤️".repeat(Math.max(0, lives)) || "💀";
  scoreEl.textContent = score; window.KPCGameStats.score = score;
  levelEl.textContent = level; window.KPCGameStats.level = level;
  comboEl.textContent = combo; window.KPCGameStats.combo = combo;
  showBest();
  updateBossHud();
}

function updateBossHud() {
  if (!bossHud || !bossHpText || !bossHpFill) return;
  const boss = zombies.find(z => z.boss);
  if (!boss) {
    bossHud.classList.add("hidden");
    bossHpText.textContent = "HP 0/0";
    bossHpFill.style.width = "0%";
    return;
  }
  bossHud.classList.remove("hidden");
  bossHpText.textContent = `HP ${boss.hp}/${boss.maxHp}`;
  bossHpFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
}

function clearAll() {
  zombies.forEach(z => z.el.remove());
  zombies = [];
  arena.querySelectorAll(".explosion, .spark, .screen-flash").forEach(e => e.remove());
  updateBossHud();
}

function laneIsFree(laneIndex) {
  // V8.1 stability rule: one active zombie per lane.
  // This completely prevents same-lane overlap.
  return !zombies.some(z => z.lane === laneIndex);
}

function pickLane() {
  const freeLanes = lanes.map((_, i) => i).filter(laneIsFree);
  if (!freeLanes.length) return null;
  return freeLanes[Math.floor(Math.random() * freeLanes.length)];
}

function pickZombieType() {
  const roll = Math.random();
  if (level >= 10 && roll < 0.20) return "toxic";
  if (level >= 6 && roll < 0.40) return "tank";
  if (level >= 3 && roll < 0.65) return "fast";
  return "normal";
}

function createZombie({ boss = false } = {}) {
  if (!running) return false;
  if (boss && bossAlive) return false;
  if (!boss && zombies.length >= Math.min(lanes.length, 2 + level)) return false;

  const lane = pickLane();
  if (lane === null) return false;

  const typeKey = boss ? "boss" : pickZombieType();
  const type = zombieTypes[typeKey];
  const el = document.createElement("div");
  const word = boss ? randomBossWord() : randomWord();
  el.className = `zombie-enemy ${type.className}`;
  el.innerHTML = `
    <div class="zombie-tag">${type.label}</div>
    <div class="zombie-face zombie-png-wrap">
      <img class="zombie-walk-sprite" src="${ZOMBIE_WALK_FRAMES[0]}" alt="${type.label} zombie">
      <span class="zombie-type-mark">${type.icon.replace("🧟", "")}</span>
    </div>
    <div class="zombie-word">${word}</div>
    <div class="zombie-hp">${"■".repeat(type.hp)}</div>
  `;
  arena.appendChild(el);

  const baseSpeed = boss ? 16 : 23;
  const speed = (baseSpeed + level * (boss ? 2.2 : 4.4)) * type.speed;
  zombies.push({
    word,
    lane,
    x: arena.clientWidth + 90,
    y: lanes[lane],
    speed,
    boss,
    typeKey,
    type,
    maxHp: boss ? Math.min(8, 3 + Math.floor(level / 5)) : type.hp,
    hp: boss ? Math.min(8, 3 + Math.floor(level / 5)) : type.hp,
    el,
    sprite: el.querySelector(".zombie-walk-sprite"),
    frameOffset: Math.floor(Math.random() * ZOMBIE_WALK_FRAMES.length),
  });

  updateBossHud();

  if (boss) {
    bossAlive = true;
    showToast("👑 Boss Zombie!");
    tone(160, 0.18, "sawtooth", 0.055);
    tone(120, 0.2, "sawtooth", 0.05, 0.14);
  }
  return true;
}

function nearestZombie() {
  return zombies.length ? zombies.reduce((a, b) => (a.x < b.x ? a : b)) : null;
}

function screenFlash() {
  const flash = document.createElement("div");
  flash.className = "screen-flash";
  arena.appendChild(flash);
  setTimeout(() => flash.remove(), 240);
}

function explosion(x, y, boss = false) {
  const boom = document.createElement("div");
  boom.className = boss ? "explosion boss-explosion" : "explosion";
  boom.style.left = `${x}px`;
  boom.style.top = `${y}px`;
  boom.textContent = boss ? "💥🔥" : "💥";
  arena.appendChild(boom);

  const sparkCount = boss ? 14 : 8;
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    const angle = (Math.PI * 2 * i) / sparkCount;
    const distance = (boss ? 58 : 38) + Math.random() * 24;
    spark.style.setProperty("--sx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--sy", `${Math.sin(angle) * distance}px`);
    arena.appendChild(spark);
    setTimeout(() => spark.remove(), 620);
  }

  if (boss) screenFlash();
  setTimeout(() => boom.remove(), boss ? 700 : 520);
}

function removeZombie(z, reachedBase = false) {
  if (z.boss) bossAlive = false;
  z.el.classList.add(reachedBase ? "zombie-bite" : "zombie-hit");
  if (!reachedBase) {
    explosion(z.x + 48, z.y + 24, z.boss);
    playZombieDeathSound(z.boss);
  }
  setTimeout(() => z.el.remove(), 240);
  zombies = zombies.filter(item => item !== z);
}

function showToast(text) {
  levelToast.textContent = text;
  levelToast.classList.add("show");
  setTimeout(() => levelToast.classList.remove("show"), 950);
}

function levelCheck() {
  const newLevel = Math.floor(kills / 7) + 1;
  if (newLevel > level) {
    level = newLevel;
    showToast(`Level ${level}!`);
    playLevelUpSound();
  }

  if (level >= nextBossLevel && !bossAlive) {
    nextBossLevel += 5;
    setTimeout(() => createZombie({ boss: true }), 550);
  }
}

function gameOver() {
  setTimeout(() => { if (window.showGameOverlay) window.showProfessionalGameOver(window.KPCGameStats); }, 600);
  running = false;
  clearInterval(spawnTimer);
  cancelAnimationFrame(loopId);
  hint.textContent = "GAME OVER";
  hint.classList.remove("fade-away");
  message.textContent = "Your base was overrun. Press Restart to try again.";
  input.disabled = true;
  startBtn.textContent = "Restart";
  finalScoreEl.textContent = score;
  finalComboEl.textContent = bestComboRun;
  finalLevelEl.textContent = level;
  saveBest();
  modal.classList.remove("hidden");
  screenFlash();
  playGameOverSound();
  submitLeaderboardScore("zombie", score, bestComboRun, level, 0);
}

function submitWord() {
  if (!running) return;
  const typed = input.value.trim().toLowerCase();
  if (!typed) return;

  const target = nearestZombie();
  if (target && typed === target.word) {
    playCorrectSound();
    target.hp--;
    if (target.hp <= 0) {
      kills++;
      combo++;
      bestComboRun = Math.max(bestComboRun, combo);
      const baseRewardScore = target.type.score + combo;
      const rewardScore = performance.now() < doubleScoreUntil ? baseRewardScore * 2 : baseRewardScore;
      const rewardCoins = target.type.coins + (target.boss ? Math.floor(level / 5) : 0);
      score += rewardScore;
      addCoins(rewardCoins);
      removeZombie(target, false);
      message.textContent = `${target.type.label} destroyed! +${rewardScore} score, +${rewardCoins} coins`;
      saveBest();
      levelCheck();
    } else {
      const hpBar = target.el.querySelector(".zombie-hp");
      if (hpBar) hpBar.textContent = "■".repeat(Math.max(0, target.hp));
      updateBossHud();
      message.textContent = `${target.type.label} hit! HP left: ${target.hp}`;
      target.el.classList.add("shake");
      setTimeout(() => target.el.classList.remove("shake"), 220);
      tone(300, 0.08, "square", 0.045);
    }
  } else {
    combo = 0;
    message.textContent = "Wrong word. Type the highlighted zombie word!";
    playWrongSound();
  }

  input.value = "";
  updateStats();
}

function gameLoop(ts) {
  if (!running) return;
  const dt = lastTime ? (ts - lastTime) / 1000 : 0;
  lastTime = ts;

  zombies.slice().forEach(z => {
    const slowFactor = performance.now() < slowUntil ? 0.45 : 1;
    z.x -= z.speed * slowFactor * dt;
    z.el.style.left = `${z.x}px`;
    z.el.style.top = `${z.y}px`;

    if (z.sprite) {
      const frame = (Math.floor(ts / ZOMBIE_FRAME_SPEED) + z.frameOffset) % ZOMBIE_WALK_FRAMES.length;
      z.sprite.src = ZOMBIE_WALK_FRAMES[frame];
    }

    if (z.x < BASE_X) {
      lives -= z.boss ? 2 : (z.typeKey === "toxic" ? 2 : 1);
      combo = 0;
      removeZombie(z, true);
      playBaseHitSound();
      if (lives <= 0) lives = 0;
      updateStats();
      if (lives <= 0) gameOver();
    }
  });

  const target = nearestZombie();
  zombies.forEach(z => z.el.classList.toggle("target-zombie", z === target));
  loopId = requestAnimationFrame(gameLoop);
}

function startGame() {
  unlockAudio();
  clearInterval(spawnTimer);
  cancelAnimationFrame(loopId);
  clearAll();
  score = 0;
  lives = 5;
  level = 1;
  combo = 0;
  bestComboRun = 0;
  kills = 0;
  runCoins = 0;
  bossAlive = false;
  nextBossLevel = 5;
  slowUntil = 0;
  doubleScoreUntil = 0;
  running = true;
  lastTime = 0;
  modal.classList.add("hidden");
  input.disabled = false;
  input.value = "";
  input.focus();
  startBtn.textContent = "Restart";
  hint.textContent = "Defend your base!";
  hint.classList.remove("fade-away");
  setTimeout(() => hint.classList.add("fade-away"), 1200);
  message.textContent = "Type the highlighted zombie word and press Enter.";
  updateStats();
  showBest();

  tone(460, 0.08, "triangle", 0.035);
  setTimeout(() => tone(640, 0.1, "triangle", 0.035), 90);

  createZombie();
  setTimeout(() => createZombie(), 1200);
  spawnTimer = setInterval(() => {
    createZombie();
  }, Math.max(900, 1700 - level * 55));
  loopId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);
modalRestartBtn.addEventListener("click", startGame);
input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitWord();
  }
  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    useBomb();
  }
});

if (buyLifeBtn) buyLifeBtn.addEventListener("click", buyLife);
if (slowTimeBtn) slowTimeBtn.addEventListener("click", activateSlowTime);
if (doubleScoreBtn) doubleScoreBtn.addEventListener("click", activateDoubleScore);
if (bombBtn) bombBtn.addEventListener("click", useBomb);

showBest();
lives = 5;
updateStats();



function submitLeaderboardScore(game, score, combo = 0, level = 1, wpm = 0) {
  const playerName = localStorage.getItem("kpc_player_name") || "Player";
  fetch("/api/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": (document.querySelector('meta[name="csrf-token"]') || {}).content || "" },
    body: JSON.stringify({
      player_name: playerName,
      game,
      score: Math.round(Number(score) || 0),
      combo: Math.round(Number(combo) || 0),
      level: Math.round(Number(level) || 1),
      wpm: Math.round(Number(wpm) || 0)
    })
  })
  .then(res => {
    if (!res.ok) return;
    const toast = document.createElement("div");
    toast.className = "score-saved-toast";
    toast.textContent = "🏆 Score saved to leaderboard";
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 30);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 1800);
  })
  .catch(() => {});
}



document.addEventListener("DOMContentLoaded", () => {
  console.log("KPC Zombie achievements ready");
});

