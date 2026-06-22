window.KPCGameStats = window.KPCGameStats || {score:0,best:0,level:1,combo:0};
(() => {
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function makeLetters(word, typed) {
    const cleanWord = String(word || "");
    const cleanTyped = String(typed || "").toLowerCase();
    return cleanWord.split("").map((ch, i) => {
      const expected = ch.toLowerCase();
      const got = cleanTyped[i];
      let cls = "letter-pending";
      if (got !== undefined) {
        cls = got === expected ? "letter-correct pop" : "letter-wrong shake";
      }
      return `<span class="${cls}">${escapeHtml(ch)}</span>`;
    }).join("");
  }

  function getWordFromElement(el) {
    if (!el) return "";
    return (el.dataset.rawWord || el.textContent || "").trim();
  }

  function applyToElement(el, typed) {
    if (!el) return;
    const raw = getWordFromElement(el);
    if (!raw) return;
    el.dataset.rawWord = raw;
    el.classList.add("kpc-letter-feedback-word");
    el.innerHTML = makeLetters(raw, typed);
  }

  function findTargets() {
    const selectors = [
      "#currentWord",
      "#word",
      ".current-word",
      ".target-word",
      ".zombie-word",
      ".vampire-word",
      ".space-word",
      ".typing-word",
      ".word-display",
      ".highlight-word",
      ".target .word",
      ".word-pill"
    ];
    return Array.from(document.querySelectorAll(selectors.join(",")))
      .filter(el => (el.dataset.rawWord || el.textContent || "").trim().length > 0);
  }

  function highlightedTarget() {
    const selectors = [
      ".highlighted .target-word",
      ".active .target-word",
      ".selected .target-word",
      ".highlighted .zombie-word",
      ".active .zombie-word",
      ".highlighted .vampire-word",
      ".active .vampire-word",
      ".highlighted .space-word",
      ".active .space-word",
      ".target-word.highlighted",
      ".zombie-word.highlighted",
      ".vampire-word.highlighted",
      ".space-word.highlighted"
    ];
    return document.querySelector(selectors.join(","));
  }

  function nearestByTyped(typed) {
    const targets = findTargets();
    if (!targets.length) return null;
    if (!typed) return highlightedTarget() || targets[0];

    const low = typed.toLowerCase();
    const starts = targets.filter(el => getWordFromElement(el).toLowerCase().startsWith(low[0] || ""));
    return highlightedTarget() || starts[0] || targets[0];
  }

  function update(input) {
    const typed = input.value || "";
    const targets = findTargets();

    // Reset all visible targets to normal letter split first
    targets.forEach(el => applyToElement(el, ""));

    const target = nearestByTyped(typed);
    if (target) applyToElement(target, typed);

    if (typed && target) {
      const raw = getWordFromElement(target).toLowerCase();
      const ok = raw.startsWith(typed.toLowerCase());
      target.classList.toggle("typing-match", ok);
      target.classList.toggle("typing-mismatch", !ok);
    }
  }

  function bindInput(input) {
    if (!input || input.dataset.kpcLetterFeedbackBound) return;
    input.dataset.kpcLetterFeedbackBound = "1";
    ["input", "keyup", "change"].forEach(evt => {
      input.addEventListener(evt, () => update(input));
    });
    input.addEventListener("focus", () => update(input));
  }

  function init() {
    document.querySelectorAll("input[type='text'], input:not([type]), textarea").forEach(bindInput);
    findTargets().forEach(el => applyToElement(el, ""));
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll("input[type='text'], input:not([type]), textarea").forEach(bindInput);

    // Prepare newly created target words without blocking game logic
    findTargets().forEach(el => {
      if (!el.dataset.rawWord && !el.querySelector(".letter-correct,.letter-pending,.letter-wrong")) {
        applyToElement(el, "");
      }
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    init();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.KPCLetterFeedback = { update, init, applyToElement };
})();
