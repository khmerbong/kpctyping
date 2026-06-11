window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
const words = [
  "apple", "banana", "school", "future", "typing", "rocket", "dragon", "window",
  "happy", "garden", "family", "computer", "lesson", "planet", "music", "teacher",
  "speed", "keyboard", "orange", "silver", "memory", "number", "puzzle", "hunter",
  "space", "vampire", "zombie", "winner", "bright", "strong", "clever", "simple"
];

const startBtn = document.getElementById("startBtn");
const typingInput = document.getElementById("typingInput");
const wordDisplay = document.getElementById("wordDisplay");
const timeLeftEl = document.getElementById("timeLeft");
const scoreEl = document.getElementById("score");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const messageEl = document.getElementById("message");
const wordListEl = document.getElementById("wordList");

let currentWord = "";
let score = 0;
let correctChars = 0;
let typedChars = 0;
let timeLeft = 60;
let timer = null;
let gameRunning = false;

function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

function showWord() {
  currentWord = randomWord();
  wordDisplay.textContent = currentWord;
  typingInput.value = "";
}

function updateStats() {
  scoreEl.textContent = score; window.KPCGameStats.score = score;
  const minutes = Math.max((60 - timeLeft) / 60, 1 / 60);
  wpmEl.textContent = Math.round(score / minutes);
  const accuracy = typedChars === 0 ? 100 : Math.round((correctChars / typedChars) * 100);
  accuracyEl.textContent = `${accuracy}%`;
}

function startGame() {
  score = 0;
  correctChars = 0;
  typedChars = 0;
  timeLeft = 60;
  gameRunning = true;
  typingInput.disabled = false;
  typingInput.focus();
  startBtn.textContent = "Restart";
  messageEl.textContent = "Type the word exactly and press Space or Enter.";
  wordListEl.innerHTML = "";
  timeLeftEl.textContent = timeLeft;
  updateStats();
  showWord();

  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timeLeftEl.textContent = timeLeft;
    updateStats();
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  setTimeout(() => { if (window.showGameOverlay) window.showProfessionalGameOver(window.KPCGameStats); }, 600);
  gameRunning = false;
  clearInterval(timer);
  typingInput.disabled = true;
  wordDisplay.textContent = "Game Over";
  messageEl.textContent = `Final score: ${score} words. WPM: ${wpmEl.textContent}. Accuracy: ${accuracyEl.textContent}.`;
  submitLeaderboardScore("speed", score, 0, 1, Number(wpmEl.textContent) || 0);
}

function submitWord() {
  if (!gameRunning) return;
  const typed = typingInput.value.trim().toLowerCase();
  if (!typed) return;

  typedChars += typed.length;
  if (typed === currentWord) {
    score++;
    correctChars += currentWord.length;
    const item = document.createElement("span");
    item.textContent = currentWord;
    wordListEl.prepend(item);
    showWord();
  } else {
    messageEl.textContent = "Wrong word. Try again!";
    typingInput.value = "";
  }
  updateStats();
}

startBtn.addEventListener("click", startGame);
typingInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    submitWord();
  }
});



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


// Speed Demon achievement watcher
setInterval(() => {
  if (!window.KPCAchievements) return;
  let wpm = 0;
  const candidates = ["wpm", "typingWpm", "speedWpm", "wpmValue"];
  for (const id of candidates) {
    const el = document.getElementById(id);
    if (el) {
      const n = parseInt((el.textContent || el.value || "0").replace(/\D/g, ""), 10);
      if (!isNaN(n)) wpm = Math.max(wpm, n);
    }
  }
  if (typeof window.currentWpm === "number") wpm = Math.max(wpm, window.currentWpm);
  if (wpm >= 100) window.KPCAchievements.check({ wpm });
}, 1200);
