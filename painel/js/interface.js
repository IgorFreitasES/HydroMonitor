const OPENWEATHER_API_KEY = "COLOQUE_SUA_CHAVE_AQUI";
const OPENWEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=-15.793889&lon=-47.882778&units=metric&lang=pt_br&appid=${OPENWEATHER_API_KEY}`;

const dataTexto = document.getElementById("dataTexto");
const horaTexto = document.getElementById("horaTexto");
const climaLocal = document.getElementById("climaLocal");
const climaEmoji = document.getElementById("climaEmoji");
const climaTemperatura = document.getElementById("climaTemperatura");
const climaDescricao = document.getElementById("climaDescricao");

function atualizarDataHoraInterface() {
  const agora = new Date();

  if (dataTexto) {
    dataTexto.textContent = agora.toLocaleDateString("pt-BR");
  }

  if (horaTexto) {
    horaTexto.textContent = agora.toLocaleTimeString("pt-BR");
  }
}

function obterEmojiClima(clima) {
  const hora = new Date().getHours();
  const dia = hora >= 6 && hora < 18;
  const id = Number(clima?.id);
  const categoria = String(clima?.main || "").toLowerCase();
  const descricao = String(clima?.description || "").toLowerCase();

  if (id >= 200 && id < 300) {
    return "⛈️";
  }

  if ((id >= 300 && id < 600) || categoria.includes("rain") || descricao.includes("chuva")) {
    return "🌧️";
  }

  if ((id >= 700 && id < 800) || descricao.includes("neblina") || descricao.includes("névoa")) {
    return "🌫️";
  }

  if (id === 801 || descricao.includes("parcial")) {
    return "🌤️";
  }

  if (id > 801 || categoria.includes("cloud") || descricao.includes("nublado") || descricao.includes("nuvens")) {
    return "☁️";
  }

  return dia ? "☀️" : "🌙";
}

function exibirClimaIndisponivel() {
  if (climaLocal) {
    climaLocal.textContent = "Brasília-DF";
  }

  if (climaEmoji) {
    climaEmoji.textContent = obterEmojiClima({ id: 801 });
  }

  if (climaTemperatura) {
    climaTemperatura.textContent = "--°C";
  }

  if (climaDescricao) {
    climaDescricao.textContent = "Clima indisponível";
  }
}

async function carregarClimaBrasilia() {
  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "COLOQUE_SUA_CHAVE_AQUI") {
    exibirClimaIndisponivel();
    return;
  }

  try {
    const resposta = await fetch(OPENWEATHER_URL);

    if (!resposta.ok) {
      throw new Error(`OpenWeather indisponível: ${resposta.status}`);
    }

    const dados = await resposta.json();
    const clima = dados.weather?.[0];
    const temperatura = Math.round(Number(dados.main?.temp));

    if (climaLocal) {
      climaLocal.textContent = "Brasília-DF";
    }

    if (climaEmoji) {
      climaEmoji.textContent = obterEmojiClima(clima);
    }

    if (climaTemperatura) {
      climaTemperatura.textContent = Number.isNaN(temperatura) ? "--°C" : `${temperatura}°C`;
    }

    if (climaDescricao) {
      climaDescricao.textContent = clima?.description || "Clima indisponível";
    }
  } catch (erro) {
    console.warn("Erro ao carregar clima:", erro);
    exibirClimaIndisponivel();
  }
}

atualizarDataHoraInterface();
carregarClimaBrasilia();
setInterval(atualizarDataHoraInterface, 1000);
