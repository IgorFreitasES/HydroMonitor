#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>

const char* WIFI_SSID = "KAYROSLINK-6349";
const char* WIFI_PASSWORD = "34676230";
const char* PREFERENCES_NAMESPACE = "hydromonitor";
const char* PREF_WIFI_SSID = "wifi_ssid";
const char* PREF_WIFI_PASS = "wifi_pass";

const int PINO_TRIGGER = 5;
const int PINO_ECHO = 18;
const int PORTA_SERVIDOR = 80;
const int SERIAL_BAUD_RATE = 115200;

const int NIVEL_MINIMO = 0;
const int NIVEL_MAXIMO = 100;
const int STATUS_ATENCAO = 30;
const int STATUS_NORMAL = 70;

const int WIFI_RSSI_MINIMO = -90;
const int WIFI_RSSI_MAXIMO = -40;
const int HTTP_OK = 200;
const int HTTP_BAD_REQUEST = 400;
const int HTTP_NAO_IMPLEMENTADO = 501;

const int ATRASO_INICIAL_MS = 1000;
const int ATRASO_CONEXAO_WIFI_MS = 500;
const int ATRASO_LEITURA_MS = 500;
const int TEMPO_LIMITE_CONEXAO_WIFI_MS = 15000;
const int PULSO_TRIGGER_BAIXO_US = 5;
const int PULSO_TRIGGER_ALTO_US = 10;
const int TEMPO_RECONEXAO_WIFI_MS = 10000;
const long TEMPO_LEITURA_SENSOR_US = 30 * 1000;
const float VELOCIDADE_SOM_CM_US = 0.0343;
const float FATOR_ECO_ULTRASSONICO = 2.0;
const float DISTANCIA_MINIMA_VALIDA = 0.0;
const float DISTANCIA_MAXIMA_VALIDA = 300.0;

const float CAPACIDADE_RESERVATORIO = 108800.0;
const float DISTANCIA_CHEIO = 20.0;
const float DISTANCIA_VAZIO = 110.0;

// Versao e build centralizados para release do firmware.
const char* FIRMWARE_VERSION = "1.0.0";
const uint32_t BUILD_NUMBER = 1;
const char* MODO_OPERACAO = "Automatico";

WebServer server(PORTA_SERVIDOR);
Preferences preferences;

float distancia = 0.0;
float percentual = 0.0;
float ultimaDistanciaValida = 0.0;
float ultimoPercentualValido = 0.0;
bool leituraSensorValida = false;
bool bomba = false;
unsigned long ultimaTentativaWiFi = 0;
String wifiSSIDAtual = "";
String wifiSenhaAtual = "";
String wifiSourceAtual = "Default";

void adicionarCabecalhosPadrao() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void enviarJson(JsonDocument& json, int codigo = HTTP_OK) {
  String resposta;
  serializeJson(json, resposta);

  adicionarCabecalhosPadrao();
  server.send(codigo, "application/json", resposta);
}

void carregarCredenciaisWiFi() {
  preferences.begin(PREFERENCES_NAMESPACE, true);
  String ssidSalvo = preferences.getString(PREF_WIFI_SSID, "");
  String senhaSalva = preferences.getString(PREF_WIFI_PASS, "");
  preferences.end();

  if (ssidSalvo.length() > 0) {
    wifiSSIDAtual = ssidSalvo;
    wifiSenhaAtual = senhaSalva;
    wifiSourceAtual = "Preferences";
    return;
  }

  wifiSSIDAtual = WIFI_SSID;
  wifiSenhaAtual = WIFI_PASSWORD;
  wifiSourceAtual = "Default";
}

void salvarCredenciaisWiFi(const String& ssid, const String& senha) {
  preferences.begin(PREFERENCES_NAMESPACE, false);
  preferences.putString(PREF_WIFI_SSID, ssid);
  preferences.putString(PREF_WIFI_PASS, senha);
  preferences.end();

  wifiSSIDAtual = ssid;
  wifiSenhaAtual = senha;
  wifiSourceAtual = "Preferences";
}

bool tentarConectarWiFi(const String& ssid, const String& senha, const char* origem) {
  if (ssid.length() == 0) {
    return false;
  }

  wifiSSIDAtual = ssid;
  wifiSenhaAtual = senha;
  wifiSourceAtual = origem;

  Serial.print("Conectando ao Wi-Fi (");
  Serial.print(origem);
  Serial.print(")");

  WiFi.disconnect();
  WiFi.begin(wifiSSIDAtual.c_str(), wifiSenhaAtual.c_str());

  unsigned long inicio = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - inicio < TEMPO_LIMITE_CONEXAO_WIFI_MS) {
    delay(ATRASO_CONEXAO_WIFI_MS);
    Serial.print(".");
  }

  Serial.println();

  return WiFi.status() == WL_CONNECTED;
}

int calcularQualidadeWiFi(int rssi) {
  int qualidade = map(rssi, WIFI_RSSI_MINIMO, WIFI_RSSI_MAXIMO, NIVEL_MINIMO, NIVEL_MAXIMO);
  return constrain(qualidade, NIVEL_MINIMO, NIVEL_MAXIMO);
}

const char* obterStatusNivel(float nivel) {
  if (nivel >= STATUS_NORMAL) {
    return "NORMAL";
  }

  if (nivel >= STATUS_ATENCAO) {
    return "ATENCAO";
  }

  return "CRITICO";
}

float calcularDistancia(long tempo) {
  if (tempo <= 0) {
    return 0.0;
  }

  return tempo * VELOCIDADE_SOM_CM_US / FATOR_ECO_ULTRASSONICO;
}

bool distanciaValida(float distanciaAtual) {
  return distanciaAtual > DISTANCIA_MINIMA_VALIDA && distanciaAtual <= DISTANCIA_MAXIMA_VALIDA;
}

float calcularPercentual(float distanciaAtual) {
  float faixaCalibracao = DISTANCIA_VAZIO - DISTANCIA_CHEIO;

  if (faixaCalibracao <= 0) {
    return NIVEL_MINIMO;
  }

  float percentualCalculado = ((DISTANCIA_VAZIO - distanciaAtual) / faixaCalibracao) * NIVEL_MAXIMO;
  return constrain(percentualCalculado, NIVEL_MINIMO, NIVEL_MAXIMO);
}

void atualizarLeituraSensor() {
  digitalWrite(PINO_TRIGGER, LOW);
  delayMicroseconds(PULSO_TRIGGER_BAIXO_US);

  digitalWrite(PINO_TRIGGER, HIGH);
  delayMicroseconds(PULSO_TRIGGER_ALTO_US);

  digitalWrite(PINO_TRIGGER, LOW);

  long tempo = pulseIn(PINO_ECHO, HIGH, TEMPO_LEITURA_SENSOR_US);
  float distanciaLida = calcularDistancia(tempo);

  if (!distanciaValida(distanciaLida)) {
    leituraSensorValida = false;

    if (ultimaDistanciaValida > 0.0) {
      distancia = ultimaDistanciaValida;
      percentual = ultimoPercentualValido;
    }

    return;
  }

  leituraSensorValida = true;
  distancia = distanciaLida;
  percentual = calcularPercentual(distancia);
  ultimaDistanciaValida = distancia;
  ultimoPercentualValido = percentual;
}

void verificarWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  if (wifiSSIDAtual.length() == 0) {
    return;
  }

  unsigned long agora = millis();

  if (agora - ultimaTentativaWiFi < TEMPO_RECONEXAO_WIFI_MS) {
    return;
  }

  ultimaTentativaWiFi = agora;
  Serial.println("Wi-Fi desconectado. Tentando reconectar...");
  WiFi.disconnect();
  WiFi.begin(wifiSSIDAtual.c_str(), wifiSenhaAtual.c_str());
}

void enviarDados() {
  JsonDocument json;
  bool wifiConectado = WiFi.status() == WL_CONNECTED;
  int rssi = wifiConectado ? WiFi.RSSI() : WIFI_RSSI_MINIMO;

  json["nivel"] = percentual;
  json["distancia"] = distancia;
  json["status"] = obterStatusNivel(percentual);
  json["bomba"] = bomba;
  json["esp32"] = wifiConectado ? "Online" : "Offline";
  json["wifi"]["rssi"] = rssi;
  json["wifi"]["qualidade"] = wifiConectado ? calcularQualidadeWiFi(rssi) : NIVEL_MINIMO;

  enviarJson(json);
}

void enviarDiagnostico() {
  JsonDocument json;
  bool wifiConectado = WiFi.status() == WL_CONNECTED;
  int rssi = wifiConectado ? WiFi.RSSI() : WIFI_RSSI_MINIMO;
  const char* statusESP32 = wifiConectado ? "Online" : "Offline";
  const char* statusSensor = leituraSensorValida ? "OK" : "Sem resposta";

  json["esp32"] = statusESP32;
  json["status"] = statusESP32;
  json["statusEsp32"] = statusESP32;
  json["ip"] = wifiConectado ? WiFi.localIP().toString() : "";
  json["ssid"] = wifiConectado ? WiFi.SSID() : wifiSSIDAtual;
  json["conectado"] = wifiConectado;
  json["rssi"] = rssi;
  json["qualidadeWifi"] = wifiConectado ? calcularQualidadeWiFi(rssi) : NIVEL_MINIMO;
  json["uptime"] = millis() / 1000;
  json["heapLivre"] = ESP.getFreeHeap();
  json["memoriaLivre"] = ESP.getFreeHeap();
  json["firmwareVersao"] = FIRMWARE_VERSION;
  json["versaoFirmware"] = FIRMWARE_VERSION;
  json["firmwareVersion"] = FIRMWARE_VERSION;
  json["build"] = BUILD_NUMBER;
  json["buildNumber"] = BUILD_NUMBER;
  json["wifiSource"] = wifiSourceAtual;
  json["mac"] = WiFi.macAddress();
  json["statusSensor"] = statusSensor;
  json["statusSensorUltrassonico"] = statusSensor;
  json["bomba"] = bomba;
  json["modoOperacao"] = MODO_OPERACAO;

  json["gateway"] = wifiConectado ? WiFi.gatewayIP().toString() : "";
  json["canalWifi"] = wifiConectado ? WiFi.channel() : 0;
  json["wifi"]["ssid"] = wifiConectado ? WiFi.SSID() : wifiSSIDAtual;
  json["wifi"]["conectado"] = wifiConectado;
  json["wifi"]["ip"] = wifiConectado ? WiFi.localIP().toString() : "";
  json["wifi"]["rssi"] = rssi;
  json["wifi"]["qualidade"] = wifiConectado ? calcularQualidadeWiFi(rssi) : NIVEL_MINIMO;
  json["wifi"]["mac"] = WiFi.macAddress();
  json["wifi"]["source"] = wifiSourceAtual;
  json["flashDisponivel"] = ESP.getFreeSketchSpace();
  json["temperaturaInterna"] = nullptr;
  json["distanciaAtual"] = distancia;

  enviarJson(json);
}

void enviarWifi() {
  JsonDocument json;
  bool wifiConectado = WiFi.status() == WL_CONNECTED;
  int rssi = wifiConectado ? WiFi.RSSI() : WIFI_RSSI_MINIMO;

  json["ssid"] = wifiConectado ? WiFi.SSID() : wifiSSIDAtual;
  json["conectado"] = wifiConectado;
  json["ip"] = wifiConectado ? WiFi.localIP().toString() : "";
  json["rssi"] = rssi;
  json["qualidade"] = wifiConectado ? calcularQualidadeWiFi(rssi) : NIVEL_MINIMO;

  enviarJson(json);
}

void receberWifi() {
  String ssid = "";
  String senha = "";

  if (server.hasArg("plain") && server.arg("plain").length() > 0) {
    JsonDocument entrada;
    DeserializationError erro = deserializeJson(entrada, server.arg("plain"));

    if (!erro) {
      ssid = entrada["ssid"] | "";
      senha = entrada["senha"] | "";
    }
  }

  if (ssid.length() == 0 && server.hasArg("ssid")) {
    ssid = server.arg("ssid");
    senha = server.arg("senha");
  }

  ssid.trim();

  JsonDocument json;

  if (ssid.length() == 0) {
    json["ok"] = false;
    json["mensagem"] = "SSID obrigatorio";
    enviarJson(json, HTTP_BAD_REQUEST);
    return;
  }

  salvarCredenciaisWiFi(ssid, senha);

  json["ok"] = true;
  json["mensagem"] = "Credenciais salvas. Reinicie o ESP32 para aplicar.";
  json["ssid"] = ssid;

  enviarJson(json);
}

void testarWifi() {
  JsonDocument json;

  json["ok"] = false;
  json["mensagem"] = "Teste de conexao ainda nao implementado no firmware.";

  enviarJson(json);
}

void enviarCalibracao() {
  JsonDocument json;

  json["capacidadeReservatorio"] = CAPACIDADE_RESERVATORIO;
  json["distanciaCheio"] = DISTANCIA_CHEIO;
  json["distanciaVazio"] = DISTANCIA_VAZIO;

  enviarJson(json);
}

void receberCalibracao() {
  JsonDocument json;

  json["ok"] = true;
  json["mensagem"] = "Salvamento permanente ainda nao implementado";
  json["capacidadeReservatorio"] = CAPACIDADE_RESERVATORIO;
  json["distanciaCheio"] = DISTANCIA_CHEIO;
  json["distanciaVazio"] = DISTANCIA_VAZIO;

  enviarJson(json);
}

void enviarDistancia() {
  JsonDocument json;

  json["distanciaAtual"] = distancia;
  json["nivelCalculado"] = percentual;
  json["statusSensor"] = leituraSensorValida ? "OK" : "Sem resposta";

  enviarJson(json);
}

void enviarAtualizacaoNaoImplementada() {
  JsonDocument json;

  json["ok"] = false;
  json["mensagem"] = "OTA web ainda nao implementado";
  json["endpointFuturo"] = "POST /update";

  enviarJson(json, HTTP_NAO_IMPLEMENTADO);
}

void responderOptions() {
  adicionarCabecalhosPadrao();
  server.send(204);
}

void configurarRotas() {
  server.on("/dados", HTTP_GET, enviarDados);
  server.on("/diagnostico", HTTP_GET, enviarDiagnostico);
  server.on("/calibracao", HTTP_GET, enviarCalibracao);
  server.on("/calibracao", HTTP_POST, receberCalibracao);
  server.on("/distancia", HTTP_GET, enviarDistancia);
  server.on("/wifi", HTTP_GET, enviarWifi);
  server.on("/wifi", HTTP_POST, receberWifi);
  server.on("/wifi", HTTP_OPTIONS, responderOptions);
  server.on("/wifi/testar", HTTP_POST, testarWifi);
  server.on("/wifi/testar", HTTP_OPTIONS, responderOptions);

  // OTA real sera implementado futuramente com validacao e seguranca.
  server.on("/update", HTTP_POST, enviarAtualizacaoNaoImplementada);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      responderOptions();
      return;
    }

    JsonDocument json;
    json["ok"] = false;
    json["mensagem"] = "Endpoint nao encontrado";
    enviarJson(json, 404);
  });
}

void conectarWiFi() {
  // Fallback: tenta Preferences primeiro; se falhar, usa a rede padrao.
  carregarCredenciaisWiFi();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  bool conectou = tentarConectarWiFi(wifiSSIDAtual, wifiSenhaAtual, wifiSourceAtual.c_str());

  if (!conectou && wifiSourceAtual == "Preferences") {
    Serial.println("Falha com Wi-Fi salvo. Tentando credenciais padrao...");
    conectou = tentarConectarWiFi(WIFI_SSID, WIFI_PASSWORD, "Default");
  }

  if (!conectou) {
    Serial.println("Nao foi possivel conectar ao Wi-Fi. Sistema seguira operacional.");
    return;
  }

  Serial.println("Wi-Fi conectado!");
  Serial.print("Endereco IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  delay(ATRASO_INICIAL_MS);

  Serial.println();
  Serial.println("=================================");
  Serial.println(" INICIANDO HYDROMONITOR ");
  Serial.println("=================================");

  pinMode(PINO_TRIGGER, OUTPUT);
  pinMode(PINO_ECHO, INPUT);

  conectarWiFi();
  configurarRotas();
  server.begin();

  // Bluetooth reservado para modo de manutencao local futuro, como configuracao
  // de Wi-Fi e calibracao proxima ao equipamento. Mantido desativado por agora.

  Serial.println("Servidor iniciado!");
}

void loop() {
  server.handleClient();
  verificarWiFi();
  atualizarLeituraSensor();

  Serial.print("Nivel: ");
  Serial.print(percentual);
  Serial.print("%   ");

  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.println(" cm");

  delay(ATRASO_LEITURA_MS);
}
