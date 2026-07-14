#include <WiFi.h>
#include <HTTPClient.h>

// ==========================
// WiFi Configuration
// ==========================

const char* ssid = "Zack";
const char* password = "lembuberuk";

// ==========================
// Backend API
// ==========================

const char* API_URL = "http://172.20.10.12:3001/api/sensor/log";
const char* DEVICE_ID = "ESP32_001";
const float HOLE_THRESHOLD_CM = 20.0;

// ==========================
// Sensor location (Google Maps)
// ==========================

const float DEVICE_LAT = 2.981647;
const float DEVICE_LNG = 101.612425;

// ==========================
// Pin Configuration
// ==========================

const int trigPin = 32;
const int echoPin = 33;
const int greenLed = 25;
const int redLed = 26;
const int buzzer = 27;

// ==========================
// Variables
// ==========================

long duration;
float distance;

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

  digitalWrite(greenLed, HIGH);
  digitalWrite(redLed, LOW);
  digitalWrite(buzzer, LOW);

  connectWiFi();
}

// ==========================
// Connect WiFi
// ==========================

void connectWiFi() {
  Serial.println();
  Serial.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed");
  }
}

// ==========================
// Read Ultrasonic
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
// Send to Backend API
// ==========================

void sendToBackend(float dist, const char* status, bool buzzerOn) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"distance\":" + String(dist, 1) + ",";
  payload += "\"status\":\"" + String(status) + "\",";
  payload += "\"buzzer\":" + String(buzzerOn ? "true" : "false") + ",";
  payload += "\"latitude\":" + String(DEVICE_LAT, 6) + ",";
  payload += "\"longitude\":" + String(DEVICE_LNG, 6);
  payload += "}";

  int code = http.POST(payload);
  Serial.print("API response: ");
  Serial.println(code);

  if (code < 0) {
    Serial.println(http.errorToString(code));
  }

  http.end();
}

// ==========================
// Alarm
// ==========================

void alarm() {
  digitalWrite(greenLed, LOW);

  for (int i = 0; i < 15; i++) {
    digitalWrite(redLed, HIGH);
    digitalWrite(buzzer, HIGH);
    delay(80);

    digitalWrite(redLed, LOW);
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
    alarm();
    sendToBackend(-1, "NO_ECHO", true);
  } else {
    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    if (distance > HOLE_THRESHOLD_CM) {
      Serial.println("!!! HOLE DETECTED !!!");
      alarm();
      sendToBackend(distance, "HOLE_DETECTED", true);
    } else {
      digitalWrite(greenLed, HIGH);
      digitalWrite(redLed, LOW);
      digitalWrite(buzzer, LOW);
      Serial.println("SAFE");
      sendToBackend(distance, "SAFE", false);
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(500);
}
