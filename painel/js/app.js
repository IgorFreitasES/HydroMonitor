const slider = document.getElementById("slider");

const agua = document.querySelector(".agua");

const porcentagem = document.getElementById("porcentagem");

slider.addEventListener("input", () => {

    agua.style.height = slider.value + "%";

    porcentagem.innerHTML = slider.value + "%";

});