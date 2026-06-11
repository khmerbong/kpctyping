// V41 RapidTyping area helper: only adjusts display text, no core logic changes.
(function(){
  function splitTargetLetters(){
    const target = document.getElementById("targetKey");
    if(!target) return;
    // If current logic writes plain text, wrap chars so current char can be visually clear.
    if(target.children.length === 0){
      const text = target.textContent.trim();
      if(text.length > 1 && text !== "SPACE"){
        target.innerHTML = text.split("").map((c,i)=>`<span class="${i===0?'now':''}">${c === " " ? "␣" : c}</span>`).join("");
      }
    }
  }

  function ensureKeyboardRows(){
    const keyboard = document.getElementById("keyboard");
    if(!keyboard) return;
    keyboard.style.display = "flex";
    keyboard.style.flexDirection = "column";
    keyboard.querySelectorAll(".key-row").forEach(row=>{
      row.style.display = "flex";
      row.style.flexDirection = "row";
    });
  }

  function sync(){
    splitTargetLetters();
    ensureKeyboardRows();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => {
      sync();
      setInterval(sync, 500);
    });
  }else{
    sync();
    setInterval(sync, 500);
  }
})();
