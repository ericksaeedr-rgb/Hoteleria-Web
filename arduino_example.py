# Arduino Uno / Nano + Ethernet Shield W5100 / ESP8266 / ESP32 + MFRC522
# Ejemplo de verificación de tarjeta NFC con el servidor Hotel Web NFC

"""
CONEXIÓN TÍPICA RC522:
- SDA (SS): Pin 10 (o D4 en ESP8266 / D5 en ESP32)
- SCK: Pin 13 (o D14 / D18)
- MOSI: Pin 11 (o D13 / D23)
- MISO: Pin 12 (o D12 / D19)
- RST: Pin 9
- 3.3V & GND

EJEMPLO EN PSEUDOCÓDIGO / ARDUINO C++:

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h> // Si usas ESP32 o Ethernet.h si usas Arduino Ethernet
#include <HTTPClient.h>

#define SS_PIN 5
#define RST_PIN 22
#define RELAY_PIN 2 // Pin conectado al relay de la cerradura electromagnética

MFRC522 rfid(SS_PIN, RST_PIN);
const char* serverUrl = "http://192.168.1.100:5000/api/nfc/verificar";

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Cerradura cerrada
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Leer UID o bloque NDEF con formato 'NFC-101-XXXXXXX'
  String codigoNFC = "NFC-101-7649231"; 

  // Consultar API
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"codigo\":\"" + codigoNFC + "\", \"dispositivo\":\"Arduino Puerta 101\"}";
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println("Acceso Concedido: Abriendo puerta");
    digitalWrite(RELAY_PIN, HIGH);
    delay(3000); // 3 segundos abierta
    digitalWrite(RELAY_PIN, LOW);
  } else {
    Serial.println("Acceso Denegado");
  }
  http.end();
  delay(1000);
}
"""
