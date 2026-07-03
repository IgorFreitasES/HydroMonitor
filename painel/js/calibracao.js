const CALIBRACAO_GET_URL = "/calibracao";
const CALIBRACAO_POST_URL = "/calibracao";
const DISTANCIA_URL = "/distancia";
const CAPACIDADE_RESERVATORIO = 108800;

const estadoCalibracao = {
  distanciaAtual: 72.4,
  usandoSimulacao: true
};

const elementosCalibracao = {
  dataHora: document.getElementById("calibracaoDataHora"),
  fonteDados: document.getElementById("calibracaoFonteDados"),
  capacidade: document.getElementById("capacidadeReservatorio"),
  distanciaCheio: document.getElementById("distanciaCheio"),
  distanciaVazio: document.getElementById("distanciaVazio"),
  distanciaAtual: document.getElementById("distanciaAtual"),
  nivelCalculado: document.getElementById("nivelCalculadoAtual"),
  ultimaAtualizacao: document.getElementById("calibracaoUltimaAtualizacao"),
  mensagem: document.getElementById("mensagemCalibracao"),
  form: document.getElementById("formCalibracao"),
  btnDefinirCheio: document.getElementById("btnDefinirCheio"),
  btnDefinirVazio: document.getElementById("btnDefinirVazio"),
  btnSalvar: document.getElementById("btnSalvarCalibracao"),
  btnVoltar: document.getElementById("btnVoltarCalibracao")
};

const calibracaoSimulada = {
  capacidade: CAPACIDADE_RESERVATORIO,
  distanciaCheio: 28.0,
  distanciaVazio: 142.0
};

function formatarNumero(valor, casas = 1) {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return "--";
  }

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function formatarValorInput(valor) {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return "";
  }

  return numero.toFixed(1);
}

function obterDataHoraAtual() {
  return new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function atualizarDataHoraCalibracao() {
  if (!elementosCalibracao.dataHora) {
    return;
  }

  elementosCalibracao.dataHora.textContent = obterDataHoraAtual();
}

function limitarNivel(nivel) {
  return Math.max(0, Math.min(100, Number(nivel) || 0));
}

function calcularNivel(distanciaAtual, distanciaCheio, distanciaVazio) {
  const atual = Number(distanciaAtual);
  const cheio = Number(distanciaCheio);
  const vazio = Number(distanciaVazio);
  const faixa = vazio - cheio;

  if ([atual, cheio, vazio].some(Number.isNaN) || faixa <= 0) {
    return null;
  }

  return limitarNivel(((vazio - atual) / faixa) * 100);
}

function normalizarCalibracao(dados) {
  return {
    capacidade: dados.capacidade ?? dados.capacidadeReservatorio ?? dados.capacidade_reservatorio ?? CAPACIDADE_RESERVATORIO,
    distanciaCheio: dados.distanciaCheio ?? dados.distancia_100 ?? dados.distancia100 ?? dados.cheio,
    distanciaVazio: dados.distanciaVazio ?? dados.distancia_0 ?? dados.distancia0 ?? dados.vazio
  };
}

function normalizarDistancia(dados) {
  if (typeof dados === "number") {
    return dados;
  }

  return dados.distancia ?? dados.distanciaAtual ?? dados.distancia_atual ?? dados.cm;
}

function preencherCalibracao(dados, origem) {
  const calibracao = normalizarCalibracao(dados);

  elementosCalibracao.capacidade.value = calibracao.capacidade || CAPACIDADE_RESERVATORIO;
  elementosCalibracao.distanciaCheio.value = calibracao.distanciaCheio ?? "";
  elementosCalibracao.distanciaVazio.value = calibracao.distanciaVazio ?? "";
  elementosCalibracao.fonteDados.textContent = origem;
  estadoCalibracao.usandoSimulacao = origem !== "Dados do ESP32";

  atualizarLeituras();
}

function atualizarLeituras() {
  const nivel = calcularNivel(
    estadoCalibracao.distanciaAtual,
    elementosCalibracao.distanciaCheio.value,
    elementosCalibracao.distanciaVazio.value
  );

  elementosCalibracao.distanciaAtual.textContent = `${formatarNumero(estadoCalibracao.distanciaAtual)} cm`;
  elementosCalibracao.nivelCalculado.textContent = nivel === null ? "--%" : `${formatarNumero(nivel, 0)}%`;
  elementosCalibracao.ultimaAtualizacao.textContent = obterDataHoraAtual();
}

function exibirMensagem(texto, tipo = "info") {
  elementosCalibracao.mensagem.textContent = texto;
  elementosCalibracao.mensagem.dataset.tipo = tipo;
}

async function carregarCalibracao() {
  try {
    const resposta = await fetch(CALIBRACAO_GET_URL, { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error(`Endpoint indisponível: ${resposta.status}`);
    }

    const dados = await resposta.json();
    preencherCalibracao(dados, "Dados do ESP32");
    exibirMensagem("Calibração carregada do ESP32.");
  } catch (erro) {
    console.warn("Usando calibração simulada:", erro);
    preencherCalibracao(calibracaoSimulada, "Dados simulados");
    exibirMensagem("Endpoint de calibração indisponível. Usando dados simulados.", "aviso");
  }
}

async function carregarDistancia() {
  try {
    const resposta = await fetch(DISTANCIA_URL, { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error(`Endpoint indisponível: ${resposta.status}`);
    }

    const dados = await resposta.json();
    const distancia = normalizarDistancia(dados);

    if (distancia === undefined || Number.isNaN(Number(distancia))) {
      throw new Error("Resposta de distância inválida");
    }

    estadoCalibracao.distanciaAtual = Number(distancia);
    elementosCalibracao.fonteDados.textContent = "Dados do ESP32";
  } catch (erro) {
    console.warn("Usando distância simulada:", erro);
    estadoCalibracao.distanciaAtual += (Math.random() - 0.5) * 0.8;
    elementosCalibracao.fonteDados.textContent = "Dados simulados";
  }

  atualizarLeituras();
}

function definirNivelAtualComoCheio() {
  elementosCalibracao.distanciaCheio.value = formatarValorInput(estadoCalibracao.distanciaAtual);
  atualizarLeituras();
  exibirMensagem("Distância atual definida como referência de 100%.");
}

function definirNivelAtualComoVazio() {
  elementosCalibracao.distanciaVazio.value = formatarValorInput(estadoCalibracao.distanciaAtual);
  atualizarLeituras();
  exibirMensagem("Distância atual definida como referência de 0%.");
}

async function salvarCalibracao(evento) {
  evento.preventDefault();

  const payload = {
    capacidade: CAPACIDADE_RESERVATORIO,
    distanciaCheio: Number(elementosCalibracao.distanciaCheio.value),
    distanciaVazio: Number(elementosCalibracao.distanciaVazio.value)
  };

  if (
    Number.isNaN(payload.distanciaCheio) ||
    Number.isNaN(payload.distanciaVazio) ||
    payload.distanciaVazio <= payload.distanciaCheio
  ) {
    exibirMensagem("Informe distâncias válidas: a distância de 0% deve ser maior que a de 100%.", "erro");
    return;
  }

  elementosCalibracao.btnSalvar.disabled = true;
  elementosCalibracao.btnSalvar.textContent = "Salvando...";

  try {
    const resposta = await fetch(CALIBRACAO_POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
      throw new Error(`Endpoint indisponível: ${resposta.status}`);
    }

    exibirMensagem("Calibração salva no ESP32.");
    elementosCalibracao.fonteDados.textContent = "Dados do ESP32";
  } catch (erro) {
    console.warn("Salvamento simulado de calibração:", erro);
    exibirMensagem("Endpoint de salvamento indisponível. Calibração mantida como simulação local.", "aviso");
    elementosCalibracao.fonteDados.textContent = "Dados simulados";
  } finally {
    elementosCalibracao.btnSalvar.disabled = false;
    elementosCalibracao.btnSalvar.textContent = "Salvar calibração";
  }
}

function voltarParaMonitoramento() {
  window.location.href = "index.html";
}

elementosCalibracao.distanciaCheio.addEventListener("input", atualizarLeituras);
elementosCalibracao.distanciaVazio.addEventListener("input", atualizarLeituras);
elementosCalibracao.btnDefinirCheio.addEventListener("click", definirNivelAtualComoCheio);
elementosCalibracao.btnDefinirVazio.addEventListener("click", definirNivelAtualComoVazio);
elementosCalibracao.btnVoltar.addEventListener("click", voltarParaMonitoramento);
elementosCalibracao.form.addEventListener("submit", salvarCalibracao);

atualizarDataHoraCalibracao();
carregarCalibracao();
carregarDistancia();
setInterval(atualizarDataHoraCalibracao, 1000);
setInterval(carregarDistancia, 5000);
