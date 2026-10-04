#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ==========================
// WiFi Configuration
// ==========================

const char* ssid = "Amirah Cantik";
const char* password = "amirahnajihah";

// ==========================
// Backend API
// ==========================

const char* API_URL = "https://inovasi-api.onrender.com/api/sensor/log";
const char* DEVICE_ID = "ESP32_001";

// Pothole threshold
const float HOLE_THRESHOLD_CM = 8.0;

// ==========================
// Fixed location
// ==========================

const double latitude = 3.08351;
const double longitude = 101.51533;

// ==========================
// Pin Configuration
// ==========================

const int trigPin = 32;
const int echoPin = 33;
const int greenLed = 26;
const int redLed = 25;
const int buzzer = 27;

// ==========================

long duration;
float distance;

// ==========================
// LEDs
// ==========================

void showSafe() {
  digitalWrite(greenLed, HIGH);
  digitalWrite(redLed, LOW);
  digitalWrite(buzzer, LOW);
}

void showHole() {
  digitalWrite(greenLed, LOW);
  digitalWrite(redLed, HIGH);
}

// ==========================
// Setup
// ==========================

void setup() {

  Serial.begin(115200);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(greenLed, OUTPUT);
  pinMode(redLed, OUTPUT);
  pinMode(buzzer, OUTPUT);

  showSafe();

  connectWiFi();

  Serial.println("==================================");
  Serial.println("System Started");
  Serial.println("==================================");
}

// ==========================
// WiFi
// ==========================

void connectWiFi() {

  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WiFi Connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("WiFi Failed");
  }
}

// ==========================
// Ultrasonic
// ==========================

float readDistance() {

  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);

  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return -1;
  }

  return duration * 0.0343 / 2;
}

// ==========================
// Backend
// ==========================

void sendToBackend(float dist, const char* status, bool buzzerOn) {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi NOT connected. Cannot send.");
    return;
  }

  Serial.println("========== SEND TO BACKEND ==========");

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  if (!http.begin(client, API_URL)) {

    Serial.println("Failed to begin HTTP.");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"distance\":" + String(dist, 1) + ",";
  payload += "\"status\":\"" + String(status) + "\",";
  payload += "\"buzzer\":" + String(buzzerOn ? "true" : "false") + ",";
  payload += "\"latitude\":" + String(latitude, 6) + ",";
  payload += "\"longitude\":" + String(longitude, 6);
  payload += "}";

  Serial.println("Payload:");
  Serial.println(payload);

  int response = http.POST(payload);

  Serial.print("HTTP Response Code: ");
  Serial.println(response);

  if (response > 0) {

    String body = http.getString();

    Serial.println("Response Body:");
    Serial.println(body);

  } else {

    Serial.print("POST Failed: ");
    Serial.println(http.errorToString(response));
  }

  http.end();

  Serial.println("=====================================");
}

// ==========================
// Alarm (red LED stays on, buzzer beeps)
// ==========================

void alarm() {

  showHole();

  for (int i = 0; i < 15; i++) {

    digitalWrite(buzzer, HIGH);
    delay(80);

    digitalWrite(buzzer, LOW);
    delay(20);
  }
}

// ==========================
// Loop
// ==========================

void loop() {

  distance = readDistance();

  if (distance == -1) {

    Serial.println("NO ECHO - Possible Hole");

    showHole();

    Serial.println("Calling sendToBackend...");
    sendToBackend(-1, "NO_ECHO", true);
    Serial.println("Returned from sendToBackend.");

    alarm();

  } else {

    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    if (distance > HOLE_THRESHOLD_CM) {

      Serial.println("========== POTHOLE DETECTED ==========");

      showHole();

      Serial.println("Calling sendToBackend...");
      sendToBackend(distance, "HOLE_DETECTED", true);
      Serial.println("Returned from sendToBackend.");

      alarm();

    } else {

      Serial.println("SAFE");

      showSafe();

      Serial.println("Calling sendToBackend...");
      sendToBackend(distance, "SAFE", false);
      Serial.println("Returned from sendToBackend.");
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(1000);
}
