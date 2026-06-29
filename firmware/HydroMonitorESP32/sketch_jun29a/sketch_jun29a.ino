#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "KAYROSLINK-6349";
const char* password = "34676230";

WebServer server(80);

// -------------------- SENSOR --------------------

const int TRIGGER = 5;
const int ECHO = 18;

const float DISTANCIA_VAZIO = 110.0;
const float DISTANCIA_CHEIO = 20.0;

// -------------------- VARIÁVEIS --------------------

float distancia = 0;
float percentual = 0;


const int CAPACIDADE_TOTAL = 30000;

int volume = 0;

String status = "";

bool bomba = false;

int rssi = 0;

int qualidadeWifi = 0;

// -------------------- SERVIDOR WEB --------------------

void enviarDados() {

  JsonDocument json;

  // Dados da caixa
  json["nivel"] = percentual;
  json["volume"] = (int)((percentual / 100.0) * CAPACIDADE_TOTAL);

  if (percentual >= 70)
    json["status"] = "NORMAL";
  else if (percentual >= 30)
    json["status"] = "ATENCAO";
  else
    json["status"] = "CRITICO";

  // Estado da bomba (por enquanto fixo)
  json["bomba"] = bomba;

  // Estado do ESP32
  json["esp32"] = "ONLINE";

  // Wi-Fi
  int rssi = WiFi.RSSI();

  json["wifi"]["rssi"] = rssi;

  int qualidade = map(rssi, -90, -40, 0, 100);
  qualidade = constrain(qualidade, 0, 100);

  json["wifi"]["qualidade"] = qualidade;

  String resposta;

  serializeJson(json, resposta);

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", resposta);

}

// -------------------- SETUP --------------------

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("=================================");
  Serial.println(" INICIANDO HYDROMONITOR ");
  Serial.println("=================================");

  pinMode(TRIGGER, OUTPUT);
  pinMode(ECHO, INPUT);

  Serial.print("Conectando ao Wi-Fi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi conectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());

  server.on("/dados", enviarDados);

  server.begin();

  Serial.println("Servidor iniciado!");
}

// -------------------- LOOP --------------------

void loop() {

  server.handleClient();

  digitalWrite(TRIGGER, LOW);
  delayMicroseconds(5);

  digitalWrite(TRIGGER, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIGGER, LOW);

  long tempo = pulseIn(ECHO, HIGH, 30000);

  distancia = tempo * 0.0343 / 2.0;

  if (distancia <= 0 || distancia > 300) {
    delay(500);
    return;
  }

  percentual = map(
      distancia * 10,
      DISTANCIA_VAZIO * 10,
      DISTANCIA_CHEIO * 10,
      0,
      100);

  percentual = constrain(percentual, 0, 100);

  Serial.print("Nivel: ");
  Serial.print(percentual);
  Serial.print("%   ");

  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.println(" cm");

  delay(500);
}