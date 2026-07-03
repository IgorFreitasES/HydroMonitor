const DIAGNOSTICO_URL = "/diagnostico";
const UPDATE_URL = "/update";

const elementosDiagnostico = {
  dataHora: document.getElementById("diagnosticoDataHora"),
  fonteDados: document.getElementById("diagFonteDados"),
  botaoAtualizar: document.getElementById("btnAtualizarDiagnostico"),
  statusEsp32: document.getElementById("diagStatusEsp32"),
  ip: document.getElementById("diagIp"),
  uptime: document.getElementById("diagUptime"),
  firmware: document.getElementById("diagFirmware"),
  ultimaReinicializacao: document.getElementById("diagUltimaReinicializacao"),
  ultimaAtualizacao: document.getElementById("diagUltimaAtualizacao"),
  memoriaLivre: document.getElementById("diagMemoriaLivre"),
  heapLivre: document.getElementById("diagHeapLivre"),
  flashDisponivel: document.getElementById("diagFlashDisponivel"),
  temperatura: document.getElementById("diagTemperatura"),
  redeWifi: document.getElementById("diagRedeWifi"),
  rssi: document.getElementById("diagRssi"),
  qualidadeWifi: document.getElementById("diagQualidadeWifi"),
  gateway: document.getElementById("diagGateway"),
  mac: document.getElementById("diagMac"),
  canalWifi: document.getElementById("diagCanalWifi"),
  distanciaAtual: document.getElementById("diagDistanciaAtual"),
  sensor: document.getElementById("diagSensor"),
  ultimaLeituraValida: document.getElementById("diagUltimaLeituraValida"),
  errosLeitura: document.getElementById("diagErrosLeitura"),
  bomba: document.getElementById("diagBomba"),
  modo: document.getElementById("diagModo"),
  tempoBombaLigada: document.getElementById("diagTempoBombaLigada"),
  bluetoothStatus: document.getElementById("diagBluetoothStatus"),
  firmwareVersaoAtual: document.getElementById("firmwareVersaoAtual"),
  firmwareEstado: document.getElementById("firmwareEstado"),
  firmwareForm: document.getElementById("formFirmwareUpdate"),
  firmwareArquivo: document.getElementById("firmwareArquivo"),
  firmwareBotaoEnviar: document.getElementById("btnEnviarFirmware"),
  firmwareProgressoBarra: document.getElementById("firmwareProgressoBarra"),
  firmwareProgressoTexto: document.getElementById("firmwareProgressoTexto"),
  firmwareMensagem: document.getElementById("firmwareMensagem")
};

const dadosSimuladosDiagnostico = {
  statusEsp32: "Online",
  ip: "192.168.1.52",
  uptime: "2d 04h 18min",
  versaoFirmware: "v1.0.0",
  ultimaReinicializacao: "02/07/2026 08:12:44",
  memoriaLivre: 184320,
  heapLivre: 151552,
  flashDisponivel: 1048576,
  temperaturaInterna: null,
  ssid: "HydroMonitor-Lab",
  rssi: -58,
  qualidadeWifi: 82,
  gateway: "192.168.1.1",
  mac: "24:6F:28:AA:BB:CC",
  canalWifi: 6,
  distanciaAtual: 72.4,
  statusSensorUltrassonico: "Operacional",
  ultimaLeituraValida: "02/07/2026 20:45:12",
  errosLeitura: "0 nas últimas 24h",
  statusBomba: "Desligada",
  modoOperacao: "Automático",
  tempoBombaLigada: "00h 00min",
  bluetoothStatus: "Desativado"
};

function texto(valor, fallback = "--") {
  return valor === null || valor === undefined || valor === "" ? fallback : String(valor);
}

function formatarBytes(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "--";
  }

  const numero = Number(valor);

  if (numero >= 1048576) {
    return `${(numero / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  }

  return `${(numero / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
}

function formatarTemperatura(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "Indisponível";
  }

  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}°C`;
}

function formatarDistancia(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "-- cm";
  }

  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

function formatarBomba(valor) {
  if (typeof valor === "boolean") {
    return valor ? "Ligada" : "Desligada";
  }

  return texto(valor);
}

function atualizarDataHoraDiagnostico() {
  if (!elementosDiagnostico.dataHora) {
    return;
  }

  elementosDiagnostico.dataHora.textContent = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function normalizarDiagnostico(dados) {
  const rede = dados.rede ?? dados.wifi ?? {};
  const sensor = dados.sensor ?? {};
  const bomba = dados.bombaDetalhes ?? dados.bomba_info ?? {};
  const esp32 = dados.esp32 ?? dados.dispositivo ?? {};

  return {
    statusEsp32: dados.statusEsp32 ?? dados.status_esp32 ?? esp32.status ?? dados.status ?? "Online",
    ip: dados.ip ?? dados.ipDispositivo ?? dados.ip_dispositivo ?? rede.ip ?? esp32.ip,
    uptime: dados.uptime ?? esp32.uptime,
    versaoFirmware: dados.versaoFirmware ?? dados.versao_firmware ?? dados.firmware ?? esp32.firmware,
    ultimaReinicializacao: dados.ultimaReinicializacao ?? dados.ultima_reinicializacao ?? esp32.ultimaReinicializacao,
    memoriaLivre: dados.memoriaLivre ?? dados.memoria_livre ?? dados.heapLivre ?? dados.freeHeap ?? esp32.memoriaLivre,
    heapLivre: dados.heapLivre ?? dados.heap_livre ?? dados.freeHeap ?? esp32.heapLivre,
    flashDisponivel: dados.flashDisponivel ?? dados.flash_disponivel ?? dados.freeSketchSpace ?? esp32.flashDisponivel,
    temperaturaInterna: dados.temperaturaInterna ?? dados.temperatura_interna ?? dados.temperatura ?? esp32.temperatura,
    ssid: dados.redeWifi ?? dados.rede_wifi ?? dados.ssid ?? rede.ssid,
    rssi: dados.rssi ?? dados.wifiRssi ?? dados.wifi_rssi ?? rede.rssi,
    qualidadeWifi: dados.qualidadeWifi ?? dados.qualidade_wifi ?? rede.qualidade,
    gateway: dados.gateway ?? rede.gateway,
    mac: dados.mac ?? dados.macAddress ?? dados.mac_address ?? rede.mac,
    canalWifi: dados.canalWifi ?? dados.canal_wifi ?? rede.canal,
    distanciaAtual: dados.distanciaAtual ?? dados.distancia_atual ?? dados.distancia ?? sensor.distancia,
    statusSensorUltrassonico: dados.statusSensorUltrassonico ?? dados.sensorUltrassonico ?? dados.sensor_ultrassonico ?? sensor.status,
    ultimaLeituraValida: dados.ultimaLeituraValida ?? dados.ultima_leitura_valida ?? sensor.ultimaLeituraValida,
    errosLeitura: dados.errosLeitura ?? dados.erros_leitura ?? sensor.erros,
    statusBomba: dados.statusBomba ?? dados.bomba ?? bomba.status,
    modoOperacao: dados.modoOperacao ?? dados.modo_operacao ?? dados.modo ?? bomba.modo,
    tempoBombaLigada: dados.tempoBombaLigada ?? dados.tempo_bomba_ligada ?? bomba.tempoLigada,
    bluetoothStatus: dados.bluetoothStatus ?? dados.bluetooth_status ?? dados.bluetooth?.status ?? "Desativado",
    ultimaAtualizacao: new Date().toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium"
    })
  };
}

function preencherDiagnostico(dados, origem) {
  const diagnostico = normalizarDiagnostico(dados);

  elementosDiagnostico.statusEsp32.textContent = texto(diagnostico.statusEsp32);
  elementosDiagnostico.ip.textContent = texto(diagnostico.ip);
  elementosDiagnostico.uptime.textContent = texto(diagnostico.uptime);
  elementosDiagnostico.firmware.textContent = texto(diagnostico.versaoFirmware);
  elementosDiagnostico.firmwareVersaoAtual.textContent = texto(diagnostico.versaoFirmware);
  elementosDiagnostico.ultimaReinicializacao.textContent = texto(diagnostico.ultimaReinicializacao, "Placeholder");
  elementosDiagnostico.ultimaAtualizacao.textContent = diagnostico.ultimaAtualizacao;
  elementosDiagnostico.memoriaLivre.textContent = formatarBytes(diagnostico.memoriaLivre);
  elementosDiagnostico.heapLivre.textContent = formatarBytes(diagnostico.heapLivre);
  elementosDiagnostico.flashDisponivel.textContent = formatarBytes(diagnostico.flashDisponivel);
  elementosDiagnostico.temperatura.textContent = formatarTemperatura(diagnostico.temperaturaInterna);
  elementosDiagnostico.redeWifi.textContent = texto(diagnostico.ssid);
  elementosDiagnostico.rssi.textContent = diagnostico.rssi === undefined ? "-- dBm" : `${diagnostico.rssi} dBm`;
  elementosDiagnostico.qualidadeWifi.textContent = diagnostico.qualidadeWifi === undefined ? "--%" : `${diagnostico.qualidadeWifi}%`;
  elementosDiagnostico.gateway.textContent = texto(diagnostico.gateway);
  elementosDiagnostico.mac.textContent = texto(diagnostico.mac);
  elementosDiagnostico.canalWifi.textContent = texto(diagnostico.canalWifi, "Placeholder");
  elementosDiagnostico.distanciaAtual.textContent = formatarDistancia(diagnostico.distanciaAtual);
  elementosDiagnostico.sensor.textContent = texto(diagnostico.statusSensorUltrassonico);
  elementosDiagnostico.ultimaLeituraValida.textContent = texto(diagnostico.ultimaLeituraValida, "Placeholder");
  elementosDiagnostico.errosLeitura.textContent = texto(diagnostico.errosLeitura, "Placeholder");
  elementosDiagnostico.bomba.textContent = formatarBomba(diagnostico.statusBomba);
  elementosDiagnostico.modo.textContent = texto(diagnostico.modoOperacao);
  elementosDiagnostico.tempoBombaLigada.textContent = texto(diagnostico.tempoBombaLigada, "Placeholder");
  elementosDiagnostico.bluetoothStatus.textContent = `Bluetooth: ${texto(diagnostico.bluetoothStatus, "Desativado")}`;
  elementosDiagnostico.fonteDados.textContent = origem;
}

async function buscarDiagnostico() {
  elementosDiagnostico.botaoAtualizar.disabled = true;
  elementosDiagnostico.botaoAtualizar.textContent = "Atualizando...";

  try {
    const resposta = await fetch(DIAGNOSTICO_URL, { cache: "no-store" });

    if (!resposta.ok) {
      throw new Error(`Endpoint indisponível: ${resposta.status}`);
    }

    const dados = await resposta.json();
    preencherDiagnostico(dados, "Dados do ESP32");
  } catch (erro) {
    console.warn("Usando dados simulados de diagnóstico:", erro);
    preencherDiagnostico(dadosSimuladosDiagnostico, "Dados simulados");
  } finally {
    elementosDiagnostico.botaoAtualizar.disabled = false;
    elementosDiagnostico.botaoAtualizar.textContent = "Atualizar dados";
  }
}

function atualizarEstadoFirmware(estado, mensagem, progresso = null) {
  elementosDiagnostico.firmwareEstado.textContent = estado;
  elementosDiagnostico.firmwareMensagem.textContent = mensagem;
  elementosDiagnostico.firmwareMensagem.dataset.tipo = estado === "erro" ? "erro" : "info";

  if (progresso === null) {
    return;
  }

  const progressoLimitado = Math.max(0, Math.min(100, Number(progresso) || 0));
  elementosDiagnostico.firmwareProgressoBarra.style.width = `${progressoLimitado}%`;
  elementosDiagnostico.firmwareProgressoTexto.textContent = `${progressoLimitado.toFixed(0)}%`;
}

function validarArquivoFirmware() {
  const arquivo = elementosDiagnostico.firmwareArquivo.files[0];

  if (!arquivo) {
    atualizarEstadoFirmware("erro", "Selecione um arquivo .bin antes de enviar.", 0);
    return null;
  }

  if (!arquivo.name.toLowerCase().endsWith(".bin")) {
    atualizarEstadoFirmware("erro", "Arquivo inválido. Selecione um firmware com extensão .bin.", 0);
    return null;
  }

  return arquivo;
}

function enviarFirmware(evento) {
  evento.preventDefault();

  const arquivo = validarArquivoFirmware();

  if (!arquivo) {
    return;
  }

  const dados = new FormData();
  dados.append("firmware", arquivo);

  const requisicao = new XMLHttpRequest();

  elementosDiagnostico.firmwareBotaoEnviar.disabled = true;
  atualizarEstadoFirmware("enviando", "Enviando atualização para POST /update...", 0);

  requisicao.upload.addEventListener("progress", (eventoProgresso) => {
    if (!eventoProgresso.lengthComputable) {
      return;
    }

    const progresso = (eventoProgresso.loaded / eventoProgresso.total) * 100;
    atualizarEstadoFirmware("enviando", "Enviando atualização para POST /update...", progresso);
  });

  requisicao.addEventListener("load", () => {
    elementosDiagnostico.firmwareBotaoEnviar.disabled = false;

    if (requisicao.status >= 200 && requisicao.status < 300) {
      atualizarEstadoFirmware("concluído", "Atualização enviada. Aguarde a reinicialização do dispositivo.", 100);
      return;
    }

    atualizarEstadoFirmware("erro", `Falha no envio. Endpoint retornou status ${requisicao.status || "indisponível"}.`, 0);
  });

  requisicao.addEventListener("error", () => {
    elementosDiagnostico.firmwareBotaoEnviar.disabled = false;
    atualizarEstadoFirmware("erro", "Não foi possível enviar a atualização. O endpoint POST /update pode ainda não estar disponível.", 0);
  });

  requisicao.addEventListener("abort", () => {
    elementosDiagnostico.firmwareBotaoEnviar.disabled = false;
    atualizarEstadoFirmware("erro", "Envio da atualização cancelado.", 0);
  });

  requisicao.open("POST", UPDATE_URL);
  requisicao.send(dados);
}

function prepararArquivoFirmware() {
  const arquivo = elementosDiagnostico.firmwareArquivo.files[0];

  if (!arquivo) {
    atualizarEstadoFirmware("aguardando", "Selecione um arquivo .bin oficial para preparar o envio futuro.", 0);
    return;
  }

  if (!arquivo.name.toLowerCase().endsWith(".bin")) {
    atualizarEstadoFirmware("erro", "Arquivo inválido. Selecione um firmware com extensão .bin.", 0);
    return;
  }

  atualizarEstadoFirmware("aguardando", `Arquivo selecionado: ${arquivo.name}`, 0);
}

elementosDiagnostico.botaoAtualizar.addEventListener("click", buscarDiagnostico);
elementosDiagnostico.firmwareForm.addEventListener("submit", enviarFirmware);
elementosDiagnostico.firmwareArquivo.addEventListener("change", prepararArquivoFirmware);

atualizarDataHoraDiagnostico();
atualizarEstadoFirmware("aguardando", "Selecione um arquivo .bin oficial para preparar o envio futuro.", 0);
buscarDiagnostico();
setInterval(atualizarDataHoraDiagnostico, 1000);
