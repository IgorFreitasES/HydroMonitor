const agua = document.getElementById("agua");

const nivelTexto = document.getElementById("nivelTexto");
const distanciaTexto = document.getElementById("distanciaTexto");
const volumeTexto = document.getElementById("volumeTexto");
const statusTexto = document.getElementById("statusTexto");

const CAPACIDADE_TOTAL = 30000; // litros

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

        nivelTexto.textContent = `${dados.nivel.toFixed(0)} %`;

        distanciaTexto.textContent = `${dados.distancia.toFixed(1)} cm`;

        const volume = (dados.nivel / 100) * CAPACIDADE_TOTAL;

        volumeTexto.textContent =
            `${volume.toLocaleString("pt-BR")} L`;

        if (dados.nivel >= 70) {

            statusTexto.textContent = "🟢 Normal";

        } else if (dados.nivel >= 30) {

            statusTexto.textContent = "🟡 Atenção";

        } else {

            statusTexto.textContent = "🔴 Crítico";

        }

    } catch (erro) {

        console.error(erro);

    }

}

buscarDados();

setInterval(buscarDados, 500);