window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
(() => {
  const KEY = "kpc_player_name";

  function cleanName(value) {
    return (value || "Player").trim().replace(/[<>]/g, "").slice(0, 18) || "Player";
  }

  function getName() {
    return cleanName(localStorage.getItem(KEY) || "Player");
  }

  function setName(name) {
    const cleaned = cleanName(name);
    localStorage.setItem(KEY, cleaned);
    document.querySelectorAll("[data-player-name]").forEach(el => el.textContent = cleaned);
    const input = document.getElementById("playerNameInput");
    if (input) input.value = cleaned === "Player" ? "" : cleaned;
    return cleaned;
  }

  window.KPCPlayer = { getName, setName };

  function buildWidget() {
    if (document.getElementById("playerNameBox")) return;

    const box = document.createElement("div");
    box.id = "playerNameBox";
    box.className = "player-name-box";
    box.innerHTML = `
      <div>
        <span class="player-label">👤 Player</span>
        <strong data-player-name>${getName()}</strong>
      </div>
      <div class="player-edit-row">
        <input id="playerNameInput" maxlength="18" placeholder="Enter your name">
        <button id="savePlayerNameBtn" type="button">Save</button>
      </div>
    `;
    document.body.appendChild(box);

    const input = document.getElementById("playerNameInput");
    const btn = document.getElementById("savePlayerNameBtn");
    input.value = getName() === "Player" ? "" : getName();

    btn.addEventListener("click", () => {
      setName(input.value);
      btn.textContent = "Saved!";
      setTimeout(() => btn.textContent = "Save", 900);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btn.click();
    });
  }

  document.addEventListener("DOMContentLoaded", buildWidget);
})();
