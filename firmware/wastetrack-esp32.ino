/*
 * WasteTrack AI — ESP32 IoT Firmware
 * Hardware: ESP32 + A9G GPS/GPRS + HC-SR04 Ultrasonic
 *
 * Sends real bin data to Supabase REST API every 15 seconds.
 * Uses Prefer: resolution=merge-duplicates for UPSERT by bin_id.
 *
 * Connections:
 *   A9G TX  → ESP32 RX2 (GPIO16)
 *   A9G RX  → ESP32 TX2 (GPIO17)
 *   A9G PWR → ESP32 GPIO4  (A9G power on/off)
 *   TRIG    → GPIO5
 *   ECHO    → GPIO18
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== CONFIGURE THESE =====
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* SUPABASE_URL    = "https://tvvbcocywdfqsuwpadpu.supabase.co";
const char* SUPABASE_ANON_KEY = "sb_publishable_wyv1DFI9S5fllrQ6gy7EAQ_IGZ95mj2";

const char* BIN_ID          = "BIN_001";
const char* BIN_NAME        = "ESP32 Smart Bin 1";

// How many cm above sensor is the bin empty (sensor to bottom)
const float BIN_DEPTH_CM    = 50.0;
// ===========================

// Pins
#define A9G_PWR     4
#define A9G_RX_PIN  16
#define A9G_TX_PIN  17
#define TRIG_PIN    5
#define ECHO_PIN    18

// GPS state
bool gpsHasFix = false;
float gpsLat = 0.0;
float gpsLng = 0.0;
int gpsSatellites = 0;

// Ultrasonic state
float lastDistanceCm = -1;
int lastFillPercent = -1;
unsigned long lastSensorRead = 0;

// Timing
unsigned long lastPost = 0;
const unsigned long POST_INTERVAL = 15000; // 15 seconds

HardwareSerial A9G(2); // UART2

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== WasteTrack AI ESP32 ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(A9G_PWR, OUTPUT);

  // Power on A9G
  digitalWrite(A9G_PWR, HIGH);
  delay(1000);
  digitalWrite(A9G_PWR, LOW);
  delay(2000);

  A9G.begin(115200, SERIAL_8N1, A9G_RX_PIN, A9G_TX_PIN);
  delay(500);

  // Init A9G GPS
  A9G.println("AT+CGPSPWR=1");    // GPS power on
  delay(500);
  A9G.println("AT+CGPSRST=1");    // GPS reset (cold start)
  delay(500);
  A9G.println("AT+CGPSINF=0");    // Enable NMEA output
  delay(500);

  connectWiFi();
}

void loop() {
  // 1. Read ultrasonic sensor
  readUltrasonic();

  // 2. Parse GPS from A9G
  readGPS();

  // 3. Post to Supabase every 15 seconds
  unsigned long now = millis();
  if (now - lastPost >= POST_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      postToSupabase();
    } else {
      Serial.println("[WARN] WiFi disconnected, reconnecting...");
      connectWiFi();
    }
    lastPost = now;
  }

  // Read A9G output continuously
  while (A9G.available()) {
    String line = A9G.readStringUntil('\n');
    parseNMEA(line);
  }
}

// ==================== ULTRASONIC ====================

void readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) {
    Serial.println("[ULTRASONIC] No echo (out of range)");
    return;
  }

  float distance = duration * 0.034 / 2;
  lastSensorRead = millis();

  if (distance < 2 || distance > BIN_DEPTH_CM) {
    // Out of valid range - keep previous reading
    return;
  }

  lastDistanceCm = distance;

  // Invert: empty bin = 0%, full bin = 100%
  int fillPct = constrain(
    map((int)(distance * 10), 0, (int)(BIN_DEPTH_CM * 10), 100, 0),
    0, 100
  );

  // Only update if changed by at least 2% to reduce noise
  if (lastFillPercent < 0 || abs(fillPct - lastFillPercent) >= 2) {
    lastFillPercent = fillPct;
    Serial.printf("[ULTRASONIC] Distance: %.1f cm, Fill: %d%%\n", distance, lastFillPercent);
  }
}

// ==================== GPS ====================

void readGPS() {
  // A9G continuously outputs NMEA sentences - parsed in main loop
}

void parseNMEA(String line) {
  line.trim();
  if (line.length() == 0) return;

  // $GPGGA — GPS fix data
  if (line.startsWith("$GPGGA")) {
    int comma1 = line.indexOf(',');
    int comma2 = line.indexOf(',', comma1 + 1);
    int comma3 = line.indexOf(',', comma2 + 1);
    int comma4 = line.indexOf(',', comma3 + 1);
    int comma5 = line.indexOf(',', comma4 + 1);
    int comma6 = line.indexOf(',', comma5 + 1);

    if (comma6 < 0) return;

    String fixStr = line.substring(comma5 + 1, comma6);
    int fixQuality = fixStr.toInt();
    gpsHasFix = (fixQuality > 0);

    // Parse fix quality
    // 0 = invalid, 1 = GPS fix, 2 = DGPS fix
    if (gpsHasFix) {
      String latStr = line.substring(comma1 + 1, comma2);
      String latDir = line.substring(comma2 + 1, comma3);
      String lngStr = line.substring(comma3 + 1, comma4);
      String lngDir = line.substring(comma4 + 1, comma5);

      gpsLat = convertNMEACoordinate(latStr, latDir);
      gpsLng = convertNMEACoordinate(lngStr, lngDir);

      // Parse satellites from $GPGGA (field after comma6)
      int comma7 = line.indexOf(',', comma6 + 1);
      if (comma7 > 0) {
        gpsSatellites = line.substring(comma6 + 1, comma7).toInt();
      }

      Serial.printf("[GPS] Fix acquired: %.6f, %.6f (%d sats)\n", gpsLat, gpsLng, gpsSatellites);
    }
  }

  // $GPGSA — active satellites
  if (line.startsWith("$GPGSA")) {
    // Check 3D fix
    int comma = line.indexOf(',');
    for (int i = 0; i < 2; i++) {
      comma = line.indexOf(',', comma + 1);
    }
    if (comma > 0) {
      char fixChar = line.charAt(comma + 1);
      if (fixChar == '3') {
        // 3D fix — already handled by GPGGA fix quality
      }
    }
  }
}

float convertNMEACoordinate(String coord, String dir) {
  if (coord.length() < 4) return 0.0;

  int dotPos = coord.indexOf('.');
  if (dotPos < 4) return 0.0;

  // NMEA format: DDMM.MMMM or DDDMM.MMMM
  int degLength = (dir == "N" || dir == "S") ? 2 : 3;

  float degrees = coord.substring(0, degLength).toFloat();
  float minutes = coord.substring(degLength).toFloat();
  float decimal = degrees + minutes / 60.0;

  if (dir == "S" || dir == "W") decimal = -decimal;
  return decimal;
}

// ==================== WiFi ====================

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] FAILED to connect!");
  }
}

// ==================== SUPABASE POST ====================

void postToSupabase() {
  // Build status string from fill level
  String statusStr;
  if (lastFillPercent < 0) {
    statusStr = "LOW";
  } else if (lastFillPercent < 30) {
    statusStr = "LOW";
  } else if (lastFillPercent < 80) {
    statusStr = "MEDIUM";
  } else {
    statusStr = "HIGH";
  }
  if (statusStr == "HIGH" && lastFillPercent >= 95) {
    statusStr = "FULL";
  }

  // Build ISO timestamp
  char isoTime[25];
  time_t now = time(nullptr);
  struct tm* t = localtime(&now);
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%SZ", t);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["bin_id"] = BIN_ID;
  doc["name"] = BIN_NAME;
  doc["latitude"] = gpsHasFix ? gpsLat : nullptr;
  doc["longitude"] = gpsHasFix ? gpsLng : nullptr;
  doc["fill_level"] = (lastFillPercent >= 0) ? lastFillPercent : nullptr;
  doc["status"] = statusStr;
  doc["last_updated"] = isoTime;

  String payload;
  serializeJson(doc, payload);

  Serial.printf("[SUPABASE] Posting: %s\n", payload.c_str());

  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/smart_bins";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "resolution=merge-duplicates");

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    if (httpCode == 200 || httpCode == 201) {
      Serial.printf("[SUPABASE] OK (%d): ", httpCode);
      if (gpsHasFix)
        Serial.printf("GPS: %.4f,%.4f | ", gpsLat, gpsLng);
      else
        Serial.printf("GPS: ACQUIRING... | ");
      if (lastFillPercent >= 0)
        Serial.printf("Fill: %d%% | Status: %s\n", lastFillPercent, statusStr.c_str());
      else
        Serial.printf("Fill: READING...\n");
    } else {
      Serial.printf("[SUPABASE] HTTP %d: %s\n", httpCode, response.c_str());
    }
  } else {
    Serial.printf("[SUPABASE] Request failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
