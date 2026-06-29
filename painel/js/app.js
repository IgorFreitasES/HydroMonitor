const slider = document.getElementById("slider");
const agua = document.getElementById("agua");

slider.addEventListener("input", atualizarNivel);

function atualizarNivel() {

    const nivel = Number(slider.value);

    agua.setAttribute("height", nivel * 2);

    agua.setAttribute("y", 330 - (nivel * 2));

}