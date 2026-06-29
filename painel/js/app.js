const agua = document.getElementById("agua");

function atualizarNivel(nivel) {

    const topoReservatorio = 105;
    const alturaMaxima = 140;

    const altura = (nivel / 100) * alturaMaxima;

    agua.setAttribute("height", altura);
    agua.setAttribute("y", topoReservatorio + alturaMaxima - altura);
}

async function buscarDados() {

    try {

        const resposta = await fetch("http://192.168.1.52/dados");

        const dados = await resposta.json();

        atualizarNivel(dados.nivel);

    } catch (erro) {

        console.error("Erro ao conectar ao ESP32:", erro);

    }

}

buscarDados();

setInterval(buscarDados, 500);