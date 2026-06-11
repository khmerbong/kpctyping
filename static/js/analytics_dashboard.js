
(function(){
  "use strict";

  const KEY_ROWS = [
    ["`","1","2","3","4","5","6","7","8","9","0","-","="],
    ["Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],
    ["A","S","D","F","G","H","J","K","L",";","'"],
    ["Z","X","C","V","B","N","M",",",".","/"],
    ["SPACE"]
  ];

  function $(id){ return document.getElementById(id); }
  function pct(value){ return Math.max(0, Math.min(100, Number(value)||0)); }

  function heatClass(errorRate, total){
    if(total === 0) return "level-0";
    if(errorRate >= 70) return "level-5";
    if(errorRate >= 50) return "level-4";
    if(errorRate >= 30) return "level-3";
    if(errorRate >= 15) return "level-2";
    return "level-1";
  }

  function renderCards(){
    const analytics = window.KPCAnalytics;
    if(!analytics) return;

    const xp = analytics.getXP();
    const completed = analytics.getCompleted();
    const weak = analytics.sortedWeakKeys();
    const weakest = weak[0];
    const streak = analytics.updateActivity();

    if($("analyticsXP")) $("analyticsXP").textContent = xp;
    if($("analyticsCompleted")) $("analyticsCompleted").textContent = completed.length + "/25";
    if($("analyticsWeakest")) $("analyticsWeakest").textContent = weakest ? weakest.key : "None";
    if($("analyticsWeakestDetail")) $("analyticsWeakestDetail").textContent = weakest ? (weakest.errorRate + "% error • " + weakest.miss + " misses") : "No mistakes yet";
    if($("analyticsStreak")) $("analyticsStreak").textContent = streak + (streak === 1 ? " day" : " days");
  }

  function renderKeyboard(){
    const box = $("analyticsKeyboardHeatmap");
    const analytics = window.KPCAnalytics;
    if(!box || !analytics) return;

    const weakData = analytics.getWeakKeys();
    box.innerHTML = "";
    KEY_ROWS.forEach(row => {
      const rowEl = document.createElement("div");
      rowEl.className = "analytics-key-row";
      row.forEach(key => {
        const lookup = key === "SPACE" ? " " : key.toLowerCase();
        const raw = weakData[lookup] || weakData[key] || {miss:0, hit:0};
        const miss = Number(raw.miss || 0);
        const hit = Number(raw.hit || 0);
        const total = miss + hit;
        const rate = total ? Math.round((miss / total) * 100) : 0;

        const el = document.createElement("button");
        el.type = "button";
        el.className = "analytics-key " + heatClass(rate, total) + (key === "SPACE" ? " wide" : "");
        el.innerHTML = "<strong>" + key + "</strong><small>" + (total ? rate + "%" : "0%") + "</small>";
        el.title = key + " • " + miss + " misses / " + hit + " hits";
        rowEl.appendChild(el);
      });
      box.appendChild(rowEl);
    });
  }

  function renderWeakTable(){
    const body = $("analyticsWeakKeyRows");
    const analytics = window.KPCAnalytics;
    if(!body || !analytics) return;

    const rows = analytics.sortedWeakKeys().slice(0, 12);
    if(rows.length === 0){
      body.innerHTML = '<tr><td colspan="4">No weak-key data yet. Practice lessons to generate analytics.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(row => {
      const key = row.key === " " ? "SPACE" : row.key.toUpperCase();
      return "<tr><td><strong>" + key + "</strong></td><td>" + row.miss + "</td><td>" + row.hit + "</td><td>" + row.errorRate + "%</td></tr>";
    }).join("");
  }

  function renderBars(id, field, fallbackLabel){
    const box = $(id);
    const analytics = window.KPCAnalytics;
    if(!box || !analytics) return;

    const history = analytics.getHistory();
    if(history.length === 0){
      box.innerHTML = '<div class="analytics-empty">No ' + fallbackLabel + ' history yet.</div>';
      return;
    }

    const max = Math.max(1, ...history.map(item => Number(item[field] || 0)));
    box.innerHTML = history.map(item => {
      const val = Number(item[field] || 0);
      const height = Math.max(8, Math.round((val / max) * 100));
      return '<div class="analytics-bar-wrap" title="' + item.date + ': ' + val + '">' +
        '<div class="analytics-bar" style="height:' + height + '%"></div>' +
        '<small>' + val + '</small>' +
      '</div>';
    }).join("");
  }

  function bind(){
    const reset = $("analyticsResetBtn");
    if(reset){
      reset.addEventListener("click", () => {
        if(window.KPCAnalytics) window.KPCAnalytics.reset();
        renderAll();
      });
    }
  }

  function renderAll(){
    renderCards();
    renderKeyboard();
    renderWeakTable();
    renderBars("analyticsAccuracyTrend", "accuracy", "accuracy");
    renderBars("analyticsWpmTrend", "wpm", "WPM");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if(!$("analyticsDashboard")) return;
    bind();
    renderAll();
    document.addEventListener("keydown", () => setTimeout(renderAll, 40), true);
    setInterval(renderAll, 3000);
  });

  window.KPCAnalyticsDashboard = { render: renderAll };
})();
