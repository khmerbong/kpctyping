
(function(){
  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll(".auth-form input").forEach(function(input){
      input.addEventListener("input", function(){ input.classList.toggle("has-value", !!input.value); });
    });
  });
})();
