const ESP32_BASE_URL = "http://192.168.1.52";
const WIFI_CONFIG_URL = `${ESP32_BASE_URL}/wifi`;
const WIFI_TEST_URL = `${ESP32_BASE_URL}/wifi/testar`;

const formWifi = document.getElementById("formWifi");
const wifiSsid = document.getElementById("wifiSsid");
const wifiSenha = document.getElementById("wifiSenha");
const wifiMensagem = document.getElementById("wifiMensagem");
const btnSalvarWifi = document.getElementById("btnSalvarWifi");
const btnTestarWifi = document.getElementById("btnTestarWifi");

function exibirMensagemWifi(texto, tipo = "info") {
  if (!wifiMensagem) {
    return;
  }

  wifiMensagem.textContent = texto;
  wifiMensagem.dataset.tipo = tipo;
}

function definirBotoesWifiDesabilitados(desabilitado) {
  if (btnSalvarWifi) {
    btnSalvarWifi.disabled = desabilitado;
  }

  if (btnTestarWifi) {
    btnTestarWifi.disabled = desabilitado;
  }
}

async function carregarStatusWifi() {
  if (!wifiSsid) {
    return;
  }

  try {
    const resposta = await fetch(WIFI_CONFIG_URL, {
      method: "GET",
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (dados.ssid && !wifiSsid.value) {
      wifiSsid.value = dados.ssid;
    }

    const status = dados.conectado ? "conectado" : "desconectado";
    const ip = dados.ip ? ` - IP ${dados.ip}` : "";
    exibirMensagemWifi(`ESP32 ${status}${ip}. A senha salva nao e exibida.`, "info");
  } catch (erro) {
    exibirMensagemWifi("ESP32 offline ou endpoint /wifi indisponivel.", "aviso");
  }
}

async function salvarWifi(evento) {
  evento.preventDefault();

  const payload = {
    ssid: wifiSsid.value.trim(),
    senha: wifiSenha.value
  };

  if (!payload.ssid) {
    exibirMensagemWifi("Informe o SSID antes de salvar.", "erro");
    return;
  }

  definirBotoesWifiDesabilitados(true);
  exibirMensagemWifi("Salvando credenciais no ESP32...", "info");

  try {
    const resposta = await fetch(WIFI_CONFIG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok || dados.ok === false) {
      throw new Error(dados.mensagem || `HTTP ${resposta.status}`);
    }

    wifiSenha.value = "";
    exibirMensagemWifi(dados.mensagem || "Credenciais salvas no ESP32.", "sucesso");
  } catch (erro) {
    exibirMensagemWifi("Erro ao salvar. Verifique se o ESP32 esta online e acessivel.", "erro");
  } finally {
    definirBotoesWifiDesabilitados(false);
  }
}

async function testarWifi() {
  const payload = {
    ssid: wifiSsid.value.trim(),
    senha: wifiSenha.value
  };

  if (!payload.ssid) {
    exibirMensagemWifi("Informe o SSID antes de testar.", "erro");
    return;
  }

  definirBotoesWifiDesabilitados(true);
  exibirMensagemWifi("Consultando teste de conexao no ESP32...", "info");

  try {
    const resposta = await fetch(WIFI_TEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const dados = await resposta.json().catch(() => ({}));
    const tipo = dados.ok ? "sucesso" : "aviso";
    exibirMensagemWifi(dados.mensagem || "Teste de conexao ainda nao implementado no firmware.", tipo);
  } catch (erro) {
    exibirMensagemWifi("ESP32 offline ou endpoint /wifi/testar indisponivel.", "aviso");
  } finally {
    definirBotoesWifiDesabilitados(false);
  }
}

if (formWifi) {
  formWifi.addEventListener("submit", salvarWifi);
  carregarStatusWifi();
}

if (btnTestarWifi) {
  btnTestarWifi.addEventListener("click", testarWifi);
}
