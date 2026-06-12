/*
 * WasteTrack AI — ESP32 IoT Firmware (FIXED)
 * Hardware: ESP32 + A9G GPS + HC-SR04 Ultrasonic
 *
 * FIXED: SSL handshake issue (HTTP -5 / -1 errors)
 * Now uses WiFiClientSecure with setInsecure() for reliable HTTPS
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <time.h>

HardwareSerial A9G(2);

// =====================
// PINS
// =====================
#define PWR_PIN  4
#define TRIG_PIN 12
#define ECHO_PIN 13

// =====================
// WIFI
// =====================
#define WIFI_SSID     "Galaxy S20 7404"
#define WIFI_PASSWORD "Drdeji24$.."

// =====================
// SUPABASE
// =====================
#define BIN_ID        "BIN_001"
#define SUPABASE_URL  "https://tvvbcocywdfqsuwpadpu.supabase.co/rest/v1/smart_bins"
#define ANON_KEY      "sb_publishable_wyv1DFI9S5fllrQ6gy7EAQ_IGZ95mj2"

// =====================
// BIN CALIBRATION
// =====================
#define BIN_EMPTY_CM  90.0
#define BIN_FULL_CM    2.0

// GPS state
float lastLat = 0.0;
float lastLng = 0.0;
bool gpsFixed = false;
unsigned long lastPostTime = 0;

// SSL client (persistent to avoid re-allocation)
WiFiClientSecure *client = nullptr;

// =====================
// ULTRASONIC
// =====================
float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.034 / 2;
}

float getFillLevel(float distance) {
  if (distance <= BIN_FULL_CM)  return 100.0;
  if (distance >= BIN_EMPTY_CM) return 0.0;
  return (BIN_EMPTY_CM - distance) / (BIN_EMPTY_CM - BIN_FULL_CM) * 100.0;
}

String getStatus(float percent) {
  if (percent <= 20)      return "LOW";
  else if (percent <= 70) return "MEDIUM";
  else if (percent <= 90) return "HIGH";
  else                    return "FULL";
}

// =====================
// A9G AT COMMANDS
// =====================
String sendAT(String cmd, int timeout = 2000) {
  A9G.println(cmd);
  String resp = "";
  long start = millis();
  while (millis() - start < timeout) {
    while (A9G.available()) {
      char c = A9G.read();
      resp += c;
    }
    delay(5);
  }
  return resp;
}

void powerOnA9G() {
  pinMode(PWR_PIN, OUTPUT);
  digitalWrite(PWR_PIN, LOW);
  delay(3000);
  digitalWrite(PWR_PIN, HIGH);
  Serial.println("A9G powering on...");
  delay(15000);
}

// =====================
// GPS
// =====================
bool getGPS(float &lat, float &lng) {
  A9G.println("AT+LOCATION=2");
  delay(1000);
  String resp = "";
  while (A9G.available()) {
    char c = A9G.read();
    resp += c;
  }

  int comma = resp.indexOf(',');
  if (comma > 5 && resp.indexOf("NOT FIX") < 0 && resp.indexOf("0.000000") < 0) {
    String latStr = resp.substring(0, comma);
    String lngStr = resp.substring(comma + 1);
    latStr.trim();
    lngStr.trim();

    // Remove non-numeric chars at end
    while (lngStr.length() > 0 && !isdigit(lngStr.charAt(lngStr.length() - 1)) && lngStr.charAt(lngStr.length() - 1) != '.') {
      lngStr.remove(lngStr.length() - 1);
    }

    float newLat = latStr.toFloat();
    float newLng = lngStr.toFloat();

    if (newLat != 0.0 && newLng != 0.0) {
      lastLat = newLat;
      lastLng = newLng;
      gpsFixed = true;
      lat = lastLat;
      lng = lastLng;
      Serial.println("📍 GPS: " + String(lat, 6) + ", " + String(lng, 6));
      return true;
    }
  }

  if (gpsFixed) {
    lat = lastLat;
    lng = lastLng;
    Serial.println("📍 Last GPS: " + String(lat, 6) + ", " + String(lng, 6));
    return true;
  }

  Serial.println("⏳ No GPS yet");
  return false;
}

// =====================
// TIMESTAMP
// =====================
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "";
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// =====================
// WIFI
// =====================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected! IP: " + WiFi.localIP().toString());
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    delay(2000);
  } else {
    Serial.println("\n❌ WiFi failed");
  }
}

// =====================
// SEND TO SUPABASE (FIXED SSL)
// =====================
bool sendToSupabase(float lat, float lng, float fillLevel, String status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost — reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  String timestamp = getTimestamp();
  if (timestamp == "") timestamp = "2026-06-12T12:00:00Z";

  String jsonBody = "{";
  jsonBody += "\"bin_id\":\"" + String(BIN_ID) + "\",";
  jsonBody += "\"latitude\":" + String(lat, 6) + ",";
  jsonBody += "\"longitude\":" + String(lng, 6) + ",";
  jsonBody += "\"fill_level\":" + String((int)fillLevel) + ",";
  jsonBody += "\"status\":\"" + status + "\",";
  jsonBody += "\"last_updated\":\"" + timestamp + "\"";
  jsonBody += "}";

  Serial.println("📤 Sending: " + jsonBody);

  // Use persistent SSL client with insecure mode (fixes -5 error)
  if (client == nullptr) {
    client = new WiFiClientSecure();
    client->setInsecure();
  }

  HTTPClient http;
  http.begin(*client, SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + ANON_KEY);
  http.addHeader("Prefer", "resolution=merge-duplicates");

  int httpCode = http.POST(jsonBody);
  String response = http.getString();
  Serial.println("📥 HTTP Code: " + String(httpCode));

  if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
    Serial.println("✅ PUSHED TO DASHBOARD!");
    http.end();
    return true;
  }

  // If SSL fails, try re-creating the client
  if (httpCode < 0) {
    Serial.println("❌ SSL/Connection error — re-creating secure client...");
    delete client;
    client = new WiFiClientSecure();
    client->setInsecure();
  }

  Serial.println("❌ Failed: " + response);
  http.end();
  return false;
}

// =====================
// SETUP
// =====================
void setup() {
  Serial.begin(115200);
  A9G.begin(115200, SERIAL_8N1, 16, 17);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("\n=== WasteTrack AI Smart Bin (FIXED) ===");

  connectWiFi();
  powerOnA9G();

  String res = sendAT("AT", 3000);
  if (res.indexOf("OK") >= 0) {
    Serial.println("✅ A9G alive!");
  } else {
    Serial.println("❌ A9G not responding — check wiring");
  }

  sendAT("AT+GPS=1", 3000);
  Serial.println("🛰️ GPS started");
}

// =====================
// LOOP
// =====================
void loop() {
  Serial.println("\n=== New Reading ===");

  // STEP 1 — Ultrasonic
  float distance = readDistance();
  float fillLevel = 0.0;
  String status = "LOW";

  if (distance > 0) {
    fillLevel = getFillLevel(distance);
    status = getStatus(fillLevel);
    Serial.println("📦 " + String(distance, 1) + "cm | " + String((int)fillLevel) + "% | " + status);
  } else {
    Serial.println("⚠️ Ultrasonic error — check sensor wiring");
  }

  // STEP 2 — GPS
  float lat = 0.0;
  float lng = 0.0;
  bool gotGPS = getGPS(lat, lng);

  // STEP 3 — Send to Supabase (only if we have GPS)
  if (gotGPS) {
    sendToSupabase(lat, lng, fillLevel, status);
  } else {
    Serial.println("⏳ Waiting for GPS fix");
  }

  Serial.println("💤 Sleeping 3 seconds...");
  delay(3000);
}
