#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>

// ==========================
// WiFi Configuration
// ==========================

const char* ssid = "Zack";
const char* password = "lembuberuk";

// ==========================
// Backend API (Render)
// ==========================

const char* API_URL = "https://inovasi-api.onrender.com/api/sensor/log";
const char* DEVICE_ID = "ESP32_001";
const float HOLE_THRESHOLD_CM = 20.0;

// ==========================
// GPS + Fallback location
// ==========================

TinyGPSPlus gps;
HardwareSerial gpsSerial(1); // RX = GPIO34

const float FALLBACK_LAT = 2.981647;
const float FALLBACK_LNG = 101.612425;

float latitude = FALLBACK_LAT;
float longitude = FALLBACK_LNG;
bool gpsHasFix = false;

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

  // GPS UART: RX = GPIO34, TX unused
  gpsSerial.begin(9600, SERIAL_8N1, 34, -1);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(greenLed, OUTPUT);
  pinMode(redLed, OUTPUT);
  pinMode(buzzer, OUTPUT);

  digitalWrite(greenLed, HIGH);
  digitalWrite(redLed, LOW);
  digitalWrite(buzzer, LOW);

  connectWiFi();

  Serial.println("System Started");
  Serial.println("GPS: go outdoors / open sky for a real fix.");
  Serial.println("Indoor: will use FALLBACK location until GPS is ready.");
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
    Serial.println("ERROR: WiFi connection failed");
  }
}

// ==========================
// GPS Reading
// ==========================

void readGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsHasFix = true;

    Serial.print("GPS OK | Latitude: ");
    Serial.print(latitude, 6);
    Serial.print(" | Longitude: ");
    Serial.println(longitude, 6);
  } else {
    gpsHasFix = false;
    latitude = FALLBACK_LAT;
    longitude = FALLBACK_LNG;

    Serial.println("ERROR: Waiting GPS fix — open sky / outdoors needed");
    Serial.print("Using FALLBACK location: ");
    Serial.print(FALLBACK_LAT, 6);
    Serial.print(", ");
    Serial.println(FALLBACK_LNG, 6);
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
// Send Backend
// ==========================

void sendToBackend(float dist, const char* status, bool buzzerOn) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ERROR: WiFi not connected — skip API send");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);

  String payload = "{";
  payload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"distance\":" + String(dist, 1) + ",";
  payload += "\"status\":\"" + String(status) + "\",";
  payload += "\"buzzer\":" + String(buzzerOn ? "true" : "false") + ",";
  payload += "\"latitude\":" + String(latitude, 6) + ",";
  payload += "\"longitude\":" + String(longitude, 6);
  payload += "}";

  if (gpsHasFix) {
    Serial.println("Sending with LIVE GPS coordinates");
  } else {
    Serial.println("Sending with FALLBACK coordinates (GPS not ready)");
  }

  Serial.println(payload);

  int response = http.POST(payload);
  Serial.print("API Response: ");
  Serial.println(response);

  if (response < 0) {
    Serial.print("ERROR: API failed — ");
    Serial.println(http.errorToString(response));
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
  readGPS();

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
      Serial.println("HOLE DETECTED");
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
    Serial.println("ERROR: WiFi lost — reconnecting...");
    connectWiFi();
  }

  delay(1000);
}
