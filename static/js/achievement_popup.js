window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
(() => {
  const KEY = "kpc_achievements_unlocked";

  const ACHIEVEMENTS = {
    first_blood: { title: "First Blood", desc: "Kill your first zombie." },
    zombie_hunter: { title: "Zombie Hunter", desc: "Kill 50 zombies." },
    zombie_slayer: { title: "Zombie Slayer", desc: "Kill 100 zombies." },
    combo_master: { title: "Combo Master", desc: "Reach 25 combo." },
    combo_legend: { title: "Combo Legend", desc: "Reach 50 combo." },
    survivor: { title: "Survivor", desc: "Reach Level 10." },
    nightmare_survivor: { title: "Nightmare Survivor", desc: "Reach Level 20." },
    vampire_slayer: { title: "Vampire Slayer", desc: "Kill your first vampire." },
    space_defender: { title: "Space Defender", desc: "Destroy your first asteroid." },
    speed_demon: { title: "Speed Demon", desc: "Reach 100 WPM." },
    boss_killer: { title: "Boss Killer", desc: "Defeat your first boss." }
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function popup(title, desc) {
    let p = document.getElementById("achievementPopup");
    if (!p) {
      p = document.createElement("div");
      p.id = "achievementPopup";
      p.className = "achievement-popup";
      document.body.appendChild(p);
    }
    p.innerHTML = `
      <div class="achievement-badge">🏅</div>
      <div>
        <b>Achievement Unlocked!</b>
        <strong>${title}</strong>
        <small>${desc}</small>
      </div>
    `;
    p.classList.add("show");
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(660, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch (e) {}
    setTimeout(() => p.classList.remove("show"), 3400);
  }

  function unlock(id) {
    const item = ACHIEVEMENTS[id];
    if (!item) return false;

    const data = load();
    if (data[id]) return false;

    data[id] = {
      unlocked: true,
      title: item.title,
      desc: item.desc,
      time: new Date().toISOString()
    };
    save(data);
    popup(item.title, item.desc);
    updatePanel();
    return true;
  }

  function check(stats = {}) {
    if ((stats.zombieKills || 0) >= 1) unlock("first_blood");
    if ((stats.zombieKills || 0) >= 50) unlock("zombie_hunter");
    if ((stats.zombieKills || 0) >= 100) unlock("zombie_slayer");
    if ((stats.vampireKills || 0) >= 1) unlock("vampire_slayer");
    if ((stats.spaceKills || 0) >= 1) unlock("space_defender");
    if ((stats.combo || 0) >= 25) unlock("combo_master");
    if ((stats.combo || 0) >= 50) unlock("combo_legend");
    if ((stats.level || 0) >= 10) unlock("survivor");
    if ((stats.level || 0) >= 20) unlock("nightmare_survivor");
    if ((stats.wpm || 0) >= 100) unlock("speed_demon");
    if (stats.bossKilled) unlock("boss_killer");
  }

  function progress() {
    const data = load();
    const unlocked = Object.keys(ACHIEVEMENTS).filter(k => data[k]).length;
    return { unlocked, total: Object.keys(ACHIEVEMENTS).length, data, all: ACHIEVEMENTS };
  }

  function updatePanel() {
    document.querySelectorAll("[data-achievement-progress]").forEach(el => {
      const p = progress();
      el.textContent = `${p.unlocked}/${p.total}`;
    });
  }

  function buildPanel() {
    if (!document.querySelector("[data-achievement-progress]")) return;
    updatePanel();
  }

  window.KPCAchievements = { unlock, check, progress, updatePanel, all: ACHIEVEMENTS };
  window.KPCAchievement = { unlock: (title, desc) => popup(title, desc) };

  document.addEventListener("DOMContentLoaded", buildPanel);
})();
