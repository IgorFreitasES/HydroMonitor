const agua = document.getElementById("agua");

const nivelTexto = document.getElementById("nivelTexto");
const volumeTexto = document.getElementById("volumeTexto");
const statusTexto = document.getElementById("statusTexto");
const bombaTexto = document.getElementById("bombaTexto");

const wifiTexto = document.getElementById("wifiTexto");
const descricaoNivel =
    document.getElementById("descricaoNivel");

const barraNivel = document.getElementById("barraNivel");

const CAPACIDADE_TOTAL = 30000;
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

        // Atualiza a animação da água
        atualizarNivel(dados.nivel);

        // Barra de nível
        barraNivel.style.width = `${dados.nivel}%`;

        // Nível
        nivelTexto.textContent = `${dados.nivel.toFixed(0)} %`;

        if (dados.nivel >= 90) {

    descricaoNivel.textContent =
        "Reservatório cheio";

} else if (dados.nivel >= 70) {

    descricaoNivel.textContent =
        "Operação normal";

} else if (dados.nivel >= 40) {

    descricaoNivel.textContent =
        "Nível intermediário";

} else if (dados.nivel >= 15) {

    descricaoNivel.textContent =
        "Baixo nível";

} else {

    descricaoNivel.textContent =
        "Abastecimento necessário";

}




        // Volume
        volumeTexto.textContent =
            `${dados.volume.toLocaleString("pt-BR")} L`;

        // Status
        if (dados.status === "NORMAL") {

    statusTexto.textContent = "🟢 Operação";

} else if (dados.status === "ATENCAO") {

    statusTexto.textContent = "🟡 Atenção";

} else {

    statusTexto.textContent = "🔴 Alarme";

}

        // Bomba
        bombaTexto.textContent =
            dados.bomba ? "🟢 Ligada" : "⚪ Desligada";

        // ESP32
        

        // Wi-Fi
        wifiTexto.textContent = `${dados.wifi.qualidade}%`;
        

    } catch (erro) {

        console.error("Erro ao buscar dados:", erro);

    }

}
buscarDados();

setInterval(buscarDados, 500);