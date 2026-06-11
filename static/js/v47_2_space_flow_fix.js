// V47.2 focus helper only. Does not override typing logic.
(function(){
  function focusInput(){
    var input=document.getElementById("academyInput");
    if(!input) return;
    try{input.focus({preventScroll:true});}catch(e){try{input.focus();}catch(err){}}
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded", function(){
      focusInput();
      document.addEventListener("click", function(){setTimeout(focusInput,20);}, true);
      setInterval(focusInput,900);
    });
  }else{
    focusInput();
    document.addEventListener("click", function(){setTimeout(focusInput,20);}, true);
    setInterval(focusInput,900);
  }
})();
