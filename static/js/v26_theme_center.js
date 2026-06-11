// V26 Theme Center: 6 visual themes + custom keyboard skin. Clean Light is default.
(function(){
  const themes=[
    {id:"aurora-night",num:"1",name:"Aurora",sub:"Night",sw:"v26-swatch-aurora"},
    {id:"clean-light",num:"2",name:"Clean",sub:"Default",sw:"v26-swatch-clean"},
    {id:"ocean",num:"3",name:"Ocean",sub:"Kids",sw:"v26-swatch-ocean"},
    {id:"neon-purple",num:"4",name:"Neon",sub:"Gamer",sw:"v26-swatch-neon"},
    {id:"wood-desk",num:"5",name:"Wood",sub:"Desk",sw:"v26-swatch-wood"},
    {id:"cyber-dark",num:"6",name:"Cyber",sub:"Dark",sw:"v26-swatch-cyber"}
  ];
  const skins=["classic","glass","neon","soft"];
  function getTheme(){return localStorage.getItem("kpc_v26_theme")||"clean-light"}
  function getSkin(){return localStorage.getItem("kpc_v26_key_skin")||"classic"}
  function apply(){
    document.body.classList.add("v26-theme-ready");
    document.body.setAttribute("data-kpc-theme",getTheme());
    document.body.setAttribute("data-key-skin",getSkin());
    document.querySelectorAll(".v26-theme-btn").forEach(b=>b.classList.toggle("active",b.dataset.theme===getTheme()));
    document.querySelectorAll(".v26-skin-btn").forEach(b=>b.classList.toggle("active",b.dataset.skin===getSkin()));
  }
  function makePanel(){
    if(document.getElementById("v26ThemeCenter"))return;
    const panel=document.createElement("section");
    panel.id="v26ThemeCenter";
    panel.className="v26-theme-center"+(localStorage.getItem("kpc_v26_panel_collapsed")==="1"?" collapsed":"");
    panel.innerHTML=`
      <div class="v26-theme-head"><span>🎨 Theme Center</span><button class="v26-theme-toggle" type="button">Custom</button></div>
      <div class="v26-theme-body">
        <div class="v26-theme-grid">
          ${themes.map(t=>`<button type="button" class="v26-theme-btn" data-theme="${t.id}"><span class="v26-theme-swatch ${t.sw}"></span>${t.num}. ${t.name}<small>${t.sub}</small></button>`).join("")}
        </div>
        <div class="v26-custom-row">
          <label>Keyboard Skin</label>
          <div class="v26-style-row">
            ${skins.map(s=>`<button type="button" class="v26-skin-btn" data-skin="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join("")}
          </div>
        </div>
        <div class="v26-note">Theme #2 Clean Light is the default. Your custom choice is saved automatically on this device.</div>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector(".v26-theme-toggle").addEventListener("click",()=>{
      panel.classList.toggle("collapsed");
      localStorage.setItem("kpc_v26_panel_collapsed",panel.classList.contains("collapsed")?"1":"0");
    });
    panel.querySelectorAll(".v26-theme-btn").forEach(btn=>btn.addEventListener("click",()=>{localStorage.setItem("kpc_v26_theme",btn.dataset.theme);apply();}));
    panel.querySelectorAll(".v26-skin-btn").forEach(btn=>btn.addEventListener("click",()=>{localStorage.setItem("kpc_v26_key_skin",btn.dataset.skin);apply();}));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{makePanel();apply();});
  else{makePanel();apply();}
})();
