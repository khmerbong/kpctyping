window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
window.__kpcVampireKills = window.__kpcVampireKills || 0;
const arena = document.getElementById("vampireArena");
const startBtn = document.getElementById("vampireStartBtn");
const input = document.getElementById("vampireInput");
const message = document.getElementById("vampireMessage");
const hint = document.getElementById("vampireHint");
const levelToast = document.getElementById("vampireLevelToast");
const livesEl = document.getElementById("vampireLives");
const scoreEl = document.getElementById("vampireScore");
const levelEl = document.getElementById("vampireLevel");
const comboEl = document.getElementById("vampireCombo");
const bestScoreEl = document.getElementById("vampireBestScore");
const bestComboEl = document.getElementById("vampireBestCombo");
const bestLevelEl = document.getElementById("vampireBestLevel");
const bossHud = document.getElementById("vampireBossHud");
const bossHpText = document.getElementById("vampireBossHpText");
const bossHpFill = document.getElementById("vampireBossHpFill");
const overModal = document.getElementById("vampireGameOverModal");
const finalScore = document.getElementById("vampireFinalScore");
const finalCombo = document.getElementById("vampireFinalCombo");
const finalLevel = document.getElementById("vampireFinalLevel");
const modalRestartBtn = document.getElementById("vampireModalRestartBtn");

const words = [
  "night", "castle", "shadow", "hunter", "silver", "garlic", "moon", "fang", "blood", "magic",
  "dark", "curse", "forest", "ghost", "danger", "attack", "silent", "battle", "escape", "legend",
  "vampire", "monster", "midnight", "thunder", "mirror", "coffin", "ancient", "secret", "defend", "target"
];
const bossWords = ["vampire king", "dark castle", "midnight hunter", "silver arrow", "ancient blood", "final shadow"];
const lanes = [42, 102, 162, 222, 282, 342];
const STORAGE = {
  score: "kpc_vampire_best_score",
  combo: "kpc_vampire_best_combo",
  level: "kpc_vampire_best_level"
};

let vampires = [];
let score = 0;
let lives = 5;
let combo = 0;
let bestComboRun = 0;
let level = 1;
let kills = 0;
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let nextId = 1;
let activeTargetId = null;
let animationId = null;

function playTone(freq = 440, duration = 0.08, type = "sine", volume = 0.05) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function loadBest() {
  bestScoreEl.textContent = localStorage.getItem(STORAGE.score) || "0";
  bestComboEl.textContent = localStorage.getItem(STORAGE.combo) || "0";
  bestLevelEl.textContent = localStorage.getItem(STORAGE.level) || "1";
}

function saveBest() {
  const bestScore = Number(localStorage.getItem(STORAGE.score) || 0);
  const bestCombo = Number(localStorage.getItem(STORAGE.combo) || 0);
  const bestLevel = Number(localStorage.getItem(STORAGE.level) || 1);
  if (score > bestScore) localStorage.setItem(STORAGE.score, score);
  if (bestComboRun > bestCombo) localStorage.setItem(STORAGE.combo, bestComboRun);
  if (level > bestLevel) localStorage.setItem(STORAGE.level, level);
  loadBest();
}

function updateUi() {
  livesEl.textContent = "❤️".repeat(Math.max(0, lives));
  scoreEl.textContent = score; window.KPCGameStats.score = score;
  levelEl.textContent = level; window.KPCGameStats.level = level;
  comboEl.textContent = combo; window.KPCGameStats.combo = combo;
  const boss = vampires.find(v => v.isBoss);
  if (boss) {
    bossHud.classList.remove("hidden");
    bossHpText.textContent = `HP ${boss.hp}/${boss.maxHp}`;
    bossHpFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
  } else {
    bossHud.classList.add("hidden");
  }
}

function randomWord() {
  const longChance = Math.min(0.32, level * 0.025);
  const pool = Math.random() < longChance ? words.filter(w => w.length >= 7) : words;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickType() {
  const roll = Math.random();
  if (level >= 7 && roll < 0.18) return "elite";
  if (level >= 4 && roll < 0.45) return "fast";
  return "normal";
}

function laneIsFree(laneIndex) {
  return !vampires.some(v => v.lane === laneIndex && v.x > arena.clientWidth - 420);
}

function availableLane() {
  const shuffled = lanes.map((_, i) => i).sort(() => Math.random() - 0.5);
  return shuffled.find(i => laneIsFree(i));
}

function createVampireElement(v) {
  const el = document.createElement("div");
  el.className = `vampire-enemy ${v.type}-vampire ${v.isBoss ? "boss-vampire" : ""}`;
  el.dataset.id = v.id;
  el.innerHTML = `
    <div class="vampire-body">${v.icon}</div>
    <div class="vampire-word">${v.word}</div>
    <div class="vampire-tag">${v.isBoss ? "BOSS" : v.type.toUpperCase()}</div>
  `;
  arena.appendChild(el);
  v.el = el;
}

function spawnVampire(forceBoss = false) {
  if (!running) return;
  const lane = availableLane();
  if (lane === undefined) return;

  const isBoss = forceBoss || (level > 1 && level % 5 === 0 && !vampires.some(v => v.isBoss) && kills > 0 && kills % 12 === 0);
  const type = isBoss ? "boss" : pickType();
  const config = {
    normal: { speed: 34 + level * 2.2, hp: 1, icon: "🦇", score: 10 },
    fast: { speed: 54 + level * 2.8, hp: 1, icon: "🧛", score: 16 },
    elite: { speed: 28 + level * 1.8, hp: 2, icon: "🧛‍♂️", score: 25 },
    boss: { speed: 18 + level * 0.9, hp: 4 + Math.floor(level / 5), icon: "👑🧛", score: 100 }
  }[type];

  const v = {
    id: nextId++,
    lane,
    x: arena.clientWidth + 80,
    y: lanes[lane],
    word: isBoss ? bossWords[Math.floor(Math.random() * bossWords.length)] : randomWord(),
    type,
    speed: config.speed,
    hp: config.hp,
    maxHp: config.hp,
    icon: config.icon,
    scoreValue: config.score,
    isBoss
  };
  vampires.push(v);
  createVampireElement(v);
  setTargetIfNeeded();
  if (isBoss) {
    message.textContent = "👑 Vampire King appeared! Type the boss phrase multiple times!";
    showToast("👑 Boss Appears!");
    playTone(120, .25, "sawtooth", .06);
  }
}

function setTargetIfNeeded() {
  if (activeTargetId && vampires.some(v => v.id === activeTargetId)) return;
  if (!vampires.length) { activeTargetId = null; return; }
  const target = vampires.reduce((a, b) => a.x < b.x ? a : b);
  activeTargetId = target.id;
}

function showToast(text) {
  levelToast.textContent = text;
  levelToast.classList.add("show");
  setTimeout(() => levelToast.classList.remove("show"), 900);
}

function hitEffect(v, defeated = false) {
  const burst = document.createElement("div");
  burst.className = defeated ? "vampire-burst" : "vampire-hit-flash";
  burst.style.left = `${v.x + 20}px`;
  burst.style.top = `${v.y + 20}px`;
  burst.textContent = defeated ? "✨" : "⚡";
  arena.appendChild(burst);
  setTimeout(() => burst.remove(), 620);
}

function removeVampire(v) {
  if (v.el) v.el.remove();
  vampires = vampires.filter(item => item.id !== v.id);
  if (activeTargetId === v.id) activeTargetId = null;
}

function defeat(v) {
  hitEffect(v, true);
  score += v.scoreValue + combo * 2;
  combo++;
  bestComboRun = Math.max(bestComboRun, combo);
  kills++;
  playTone(v.isBoss ? 260 : 640, v.isBoss ? .22 : .08, "triangle", .055);
  removeVampire(v);
  if (kills % 8 === 0) {
    level++;
    showToast(`Level ${level}`);
    message.textContent = `Level ${level}! Vampires are faster now.`;
    playTone(880, .14, "square", .045);
  }
  updateUi();
}

function checkInput() {
  if (!running) return;
  const typed = input.value.trim().toLowerCase();
  if (!typed) return;
  const target = vampires.find(v => v.id === activeTargetId) || vampires.find(v => v.word.toLowerCase() === typed);
  if (!target) return;
  if (typed === target.word.toLowerCase()) {
    input.value = "";
    target.hp -= 1;
    if (target.hp > 0) {
      hitEffect(target, false);
      score += 12;
      combo++;
      bestComboRun = Math.max(bestComboRun, combo);
      message.textContent = `Hit! Boss HP ${target.hp}/${target.maxHp}`;
      playTone(420, .07, "triangle", .045);
    } else {
      defeat(target);
      message.textContent = target.isBoss ? "👑 Vampire King defeated!" : "Vampire defeated!";
    }
    setTargetIfNeeded();
  }
}

function loseLife(v) {
  lives--;
  combo = 0;
  playTone(90, .22, "sawtooth", .055);
  message.textContent = `${v.word} escaped!`;
  removeVampire(v);
  if (lives <= 0) endGame();
  updateUi();
}

function render() {
  vampires.forEach(v => {
    v.el.style.left = `${v.x}px`;
    v.el.style.top = `${v.y}px`;
    v.el.classList.toggle("target-vampire", v.id === activeTargetId);
    const word = v.el.querySelector(".vampire-word");
    if (word && v.hp > 1) word.textContent = `${v.word} ×${v.hp}`;
  });
}

function loop(timestamp) {
  if (!running) return;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;
  spawnTimer -= dt;
  const interval = Math.max(0.82, 1.75 - level * 0.07);
  if (spawnTimer <= 0) {
    spawnVampire(false);
    spawnTimer = interval;
  }
  vampires.slice().forEach(v => {
    v.x -= v.speed * dt;
    if (v.x < 58) loseLife(v);
  });
  setTargetIfNeeded();
  render();
  updateUi();
  animationId = requestAnimationFrame(loop);
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);
  vampires.forEach(v => v.el && v.el.remove());
  vampires = [];
  score = 0;
  lives = 5;
  combo = 0;
  bestComboRun = 0;
  level = 1;
  kills = 0;
  nextId = 1;
  activeTargetId = null;
  running = true;
  lastTime = performance.now();
  spawnTimer = 0.2;
  input.disabled = false;
  input.value = "";
  input.focus();
  startBtn.textContent = "Restart";
  overModal.classList.add("hidden");
  hint.textContent = "Type the nearest vampire word";
  message.textContent = "The night hunt begins.";
  updateUi();
  animationId = requestAnimationFrame(loop);
}

function endGame() {
  setTimeout(() => { if (window.showGameOverlay) window.showProfessionalGameOver(window.KPCGameStats); }, 600);
  running = false;
  input.disabled = true;
  if (animationId) cancelAnimationFrame(animationId);
  saveBest();
  finalScore.textContent = score;
  finalCombo.textContent = bestComboRun;
  finalLevel.textContent = level;
  overModal.classList.remove("hidden");
  message.textContent = "Game over. Try again!";
  playTone(70, .45, "sawtooth", .06);
  submitLeaderboardScore("vampire", score, bestComboRun, level, 0);
}

startBtn.addEventListener("click", startGame);
modalRestartBtn.addEventListener("click", startGame);
input.addEventListener("input", checkInput);
loadBest();
updateUi();



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



setInterval(() => {
  if (window.KPCAchievements && typeof combo !== "undefined" && typeof level !== "undefined") {
    window.KPCAchievements.check({ combo: combo, level: level });
  }
}, 1800);

