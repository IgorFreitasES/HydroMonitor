const agua = document.getElementById("agua");
const onda = document.getElementById("onda");
const barraNivel = document.getElementById("barraNivel");
const nivelTexto = document.getElementById("nivelTexto");
const descricaoNivel = document.getElementById("descricaoNivel");
const statusTexto = document.getElementById("statusTexto");
const bombaTexto = document.getElementById("bombaTexto");
const wifiTexto = document.getElementById("wifiTexto");
const wifiBarras = document.getElementById("wifiBarras");
const volumeTexto = document.getElementById("volumeTexto");
const nivelTorreTexto = document.getElementById("nivelTorreTexto");
const dataHoraTexto = document.getElementById("dataHoraTexto");

const ESP32_URL = "http://192.168.1.52/dados";
const INTERVALO_ATUALIZACAO = 500;
const CAPACIDADE_RESERVATORIO = 108800;
const TOPO_AGUA = 132;
const FUNDO_AGUA = 286;
const ALTURA_AGUA = FUNDO_AGUA - TOPO_AGUA;

let ultimoNivel = null;

function limitarNivel(nivel) {
  return Math.max(0, Math.min(100, Number(nivel) || 0));
}

function atualizarNivel(nivel) {
  const nivelLimitado = limitarNivel(nivel);

  if (nivelLimitado === ultimoNivel) {
    return;
  }

  ultimoNivel = nivelLimitado;

  const altura = (nivelLimitado / 100) * ALTURA_AGUA;
  const yAgua = FUNDO_AGUA - altura;

  agua.setAttribute("height", altura);
  agua.setAttribute("y", yAgua);

  if (onda) {
    onda.setAttribute(
      "d",
      `M112 ${yAgua} C135 ${yAgua - 8} 158 ${yAgua + 8} 181 ${yAgua} S227 ${yAgua - 8} 250 ${yAgua} S296 ${yAgua + 8} 319 ${yAgua} S365 ${yAgua - 8} 388 ${yAgua} L388 308 L112 308 Z`
    );
  }

  if (nivelTorreTexto) {
    nivelTorreTexto.textContent = `${nivelLimitado.toFixed(0)}%`;
  }
}

function atualizarDescricaoNivel(nivel) {
  if (nivel >= 90) {
    descricaoNivel.textContent = "Reservatório cheio";
    return;
  }

  if (nivel >= 70) {
    descricaoNivel.textContent = "Operação normal";
    return;
  }

  if (nivel >= 40) {
    descricaoNivel.textContent = "Nível intermediário";
    return;
  }

  if (nivel >= 15) {
    descricaoNivel.textContent = "Baixo nível";
    return;
  }

  descricaoNivel.textContent = "Abastecimento necessário";
}

function traduzirStatus(status) {
  if (status === "NORMAL") {
    return " Operação";
  }

  if (status === "ATENCAO") {
    return " Atenção";
  }

  return " Alarme";
}

function traduzirStatusBomba(bomba) {
  return bomba ? " Ligada" : " Desligada";
}

function calcularBarrasWifi(qualidade) {
  if (qualidade === null || qualidade === undefined || Number.isNaN(Number(qualidade))) {
    return 0;
  }

  const qualidadeLimitada = limitarNivel(qualidade);

  if (qualidadeLimitada <= 20) {
    return 1;
  }

  if (qualidadeLimitada <= 45) {
    return 2;
  }

  if (qualidadeLimitada <= 70) {
    return 3;
  }

  return 4;
}

function atualizarBarrasWifi(qualidade) {
  if (!wifiBarras) {
    return;
  }

  const barrasAtivas = calcularBarrasWifi(qualidade);
  const barras = wifiBarras.querySelectorAll("span");

  barras.forEach((barra, indice) => {
    barra.classList.toggle("ativo", indice < barrasAtivas);
  });
}

function atualizarWifi(wifi) {
  wifiTexto.textContent = `${wifi.qualidade}%`;
  atualizarBarrasWifi(wifi.qualidade);
}

function calcularVolume(nivel) {
  return (limitarNivel(nivel) * CAPACIDADE_RESERVATORIO) / 100;
}

function atualizarVolume(nivel) {
  const volume = calcularVolume(nivel);

  volumeTexto.textContent = `${volume.toLocaleString("pt-BR", {
    maximumFractionDigits: 0
  })} L`;
}

function atualizarDataHora() {
  if (!dataHoraTexto) {
    return;
  }

  dataHoraTexto.textContent = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function atualizarInterface(dados) {
  const nivel = limitarNivel(dados.nivel);

  atualizarNivel(nivel);
  atualizarDescricaoNivel(nivel);
  atualizarVolume(nivel);
  atualizarWifi(dados.wifi);

  barraNivel.style.width = `${nivel}%`;
  nivelTexto.textContent = `${nivel.toFixed(0)} %`;
  statusTexto.textContent = traduzirStatus(dados.status);
  bombaTexto.textContent = traduzirStatusBomba(dados.bomba);
}

function exibirFalhaComunicacao() {
  statusTexto.textContent = "Offline";
  wifiTexto.textContent = "--";
  atualizarBarrasWifi(null);
  bombaTexto.textContent = "--";
}

async function buscarDados() {
  try {
    const resposta = await fetch(ESP32_URL);
    const dados = await resposta.json();

    atualizarInterface(dados);
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
    exibirFalhaComunicacao();
  }
}

atualizarDataHora();
buscarDados();
setInterval(atualizarDataHora, 1000);
setInterval(buscarDados, INTERVALO_ATUALIZACAO);
