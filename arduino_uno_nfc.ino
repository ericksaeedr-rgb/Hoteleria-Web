/*
  =============================================================================
  HOTEL SMART NFC - Lector de Puerta para Arduino Uno + RC522 (RFID/NFC)
  =============================================================================
  
  Este sketch lee tarjetas NFC/RFID (etiquetas Mifare 1K / NTAG213 / llaveros)
  y envía el código leído a la aplicación Flask por el puerto Serial USB.
  
  Cuando Flask valida la tarjeta:
  - Si es VÁLIDA: Flask responde "OK:<numero_habitacion>"
    -> Arduino activa el relay (abre la cerradura) y enciende el LED Verde.
  - Si es INVÁLIDA: Flask responde "DENIED"
    -> Arduino enciende el LED Rojo y hace sonar el buzzer (denegado).

  CONEXIONES ARDUINO UNO <-> RC522:
  ---------------------------------
  RC522 Pin       Arduino Uno Pin
  SDA (SS)   ---> Pin 10
  SCK        ---> Pin 13
  MOSI       ---> Pin 11
  MISO       ---> Pin 12
  IRQ        ---> No conectado
  GND        ---> GND
  RST        ---> Pin 9
  3.3V       ---> 3.3V  (¡¡IMPORTANTE: NUNCA CONECTAR A 5V!!)

  INDICADORES & ACTUADORES:
  -------------------------
  LED Verde / Relay Puerta ---> Pin 7 (HIGH = Abre cerradura)
  LED Rojo (Acceso Denegado) -> Pin 6 (HIGH = Enciende LED)
  Buzzer Zumbador (Opcional) -> Pin 5
*/

#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9

#define RELAY_PIN 7      // Relay cerradura y/o LED verde
#define LED_DENIED_PIN 6 // LED rojo denegado
#define BUZZER_PIN 5     // Buzzer sonoro

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Clave por defecto para leer bloques Mifare Classic (si se grabó código en texto)
MFRC522::MIFARE_Key key;

// Buffer de UID previo para evitar re-lecturas continuas si se deja la tarjeta pegada
byte lastUID[10];
byte lastUIDSize = 0;
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(9600); // Mismo baudrate que en serial_reader.py
  while (!Serial);

  SPI.begin();
  mfrc522.PCD_Init();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_DENIED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_DENIED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  for (byte i = 0; i < 6; i++) {
    key.keyByte[i] = 0xFF;
  }

  Serial.println("ARDUINO_READY");
}

void loop() {
  // 1. Escuchar respuestas que envía Flask por el puerto Serial
  if (Serial.available() > 0) {
    String response = Serial.readStringUntil('\n');
    response.trim();

    if (response.startsWith("OK")) {
      // ACCESO AUTORIZADO
      digitalWrite(RELAY_PIN, HIGH);
      tone(BUZZER_PIN, 2000, 150); // Beep agudo corto
      delay(3000);                 // Puerta abierta por 3 segundos
      digitalWrite(RELAY_PIN, LOW);
    } 
    else if (response == "DENIED") {
      // ACCESO DENEGADO
      digitalWrite(LED_DENIED_PIN, HIGH);
      tone(BUZZER_PIN, 500, 400);  // Beep grave largo
      delay(1500);
      digitalWrite(LED_DENIED_PIN, LOW);
    }
  }

  // 2. Verificar si hay una tarjeta presente
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Evitar re-lecturas inmediatas de la misma tarjeta en menos de 2 segundos
  if (millis() - lastReadTime < 2000 && isSameUID(mfrc522.uid.uidByte, mfrc522.uid.size)) {
    mfrc522.PICC_HaltA();
    return;
  }

  // Guardar UID para filtro anti-rebote
  saveLastUID(mfrc522.uid.uidByte, mfrc522.uid.size);
  lastReadTime = millis();

  // Intentar leer el texto escrito en el Bloque 4 (donde se graba NFC-101-XXXXXXX)
  String codigoNFC = leerBloqueTexto(4);

  // Si no hay texto grabado en el bloque, mapear el UID físico de la tarjeta
  if (codigoNFC == "") {
    codigoNFC = "NFC-UID-" + obtenerUIDHex();
  }

  // Enviar el código a Flask a través del Serial USB
  Serial.println(codigoNFC);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

// -------------------------------------------------------------
// Función para leer un bloque de datos Mifare Classic como texto
// -------------------------------------------------------------
String leerBloqueTexto(byte blockAddr) {
  byte status;
  byte buffer[18];
  byte size = sizeof(buffer);

  // Autenticación con llave A por defecto
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockAddr, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) {
    return "";
  }

  // Leer bloque
  status = mfrc522.MIFARE_Read(blockAddr, buffer, &size);
  if (status != MFRC522::STATUS_OK) {
    return "";
  }

  String resultado = "";
  for (uint8_t i = 0; i < 16; i++) {
    // Si encontramos caracteres imprimibles los concatenamos
    if (buffer[i] >= 32 && buffer[i] <= 126) {
      resultado += (char)buffer[i];
    }
  }
  resultado.trim();

  if (resultado.startsWith("NFC-")) {
    return resultado;
  }
  return "";
}

// Convierte el UID a cadena Hexadecimal
String obtenerUIDHex() {
  String uidStr = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();
  return uidStr;
}

bool isSameUID(byte *uid, byte size) {
  if (size != lastUIDSize) return false;
  for (byte i = 0; i < size; i++) {
    if (uid[i] != lastUID[i]) return false;
  }
  return true;
}

void saveLastUID(byte *uid, byte size) {
  lastUIDSize = size;
  for (byte i = 0; i < size; i++) {
    lastUID[i] = uid[i];
  }
}
