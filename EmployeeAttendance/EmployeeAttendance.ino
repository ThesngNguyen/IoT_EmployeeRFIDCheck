/*
 * --------------------------------------------------------------------------------------------------------------------
 * Example sketch/program showing how to read data from a PICC to serial.
 * --------------------------------------------------------------------------------------------------------------------
 * This is a MFRC522 library example; for further details and other examples see: https://github.com/miguelbalboa/rfid
 * 
 * Example sketch/program showing how to read data from a PICC (that is: a RFID Tag or Card) using a MFRC522 based RFID
 * Reader on the Arduino SPI interface.
 * 
 * When the Arduino and the MFRC522 module are connected (see the pin layout below), load this sketch into Arduino IDE
 * then verify/compile and upload it. To see the output: use Tools, Serial Monitor of the IDE (hit Ctrl+Shft+M). When
 * you present a PICC (that is: a RFID Tag or Card) at reading distance of the MFRC522 Reader/PCD, the serial output
 * will show the ID/UID, type and any data blocks it can read. Note: you may see "Timeout in communication" messages
 * when removing the PICC from reading distance too early.
 * 
 * If your reader supports it, this sketch/program will read all the PICCs presented (that is: multiple tag reading).
 * So if you stack two or more PICCs on top of each other and present them to the reader, it will first output all
 * details of the first and then the next PICC. Note that this may take some time as all data blocks are dumped, so
 * keep the PICCs at reading distance until complete.
 * 
 * @license Released into the public domain.
 * 
 * Typical pin layout used:
 * -----------------------------------------------------------------------------------------
 *             MFRC522      Arduino       Arduino   Arduino    Arduino          Arduino
 *             Reader/PCD   Uno/101       Mega      Nano v3    Leonardo/Micro   Pro Micro
 * Signal      Pin          Pin           Pin       Pin        Pin              Pin
 * -----------------------------------------------------------------------------------------
 * RST/Reset   RST          9             5         D9         RESET/ICSP-5     RST
 * SPI SS      SDA(SS)      10            53        D10        10               10
 * SPI MOSI    MOSI         11 / ICSP-4   51        D11        ICSP-4           16
 * SPI MISO    MISO         12 / ICSP-1   50        D12        ICSP-1           14
 * SPI SCK     SCK          13 / ICSP-3   52        D13        ICSP-3           15
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <ESP8266mDNS.h>
#include <ArduinoHttpClient.h>
#include <SoftwareSerial.h>
#include <TimeLib.h>
#include <ArduinoJson.h>

// RFID pins
#define RST_PIN         D3   // GPIO0
#define SS_PIN          D8   // GPIO15

// LCD pins
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2

// Servo pin
#define SERVO_PIN       D4   // GPIO4

// Wi-Fi credentials
const char* ssid = "HSU_Students";
const char* password = "dhhs12cnvch";

// Địa chỉ IP và cổng của máy chủ API
const char* serverIP = "10.106.21.192";
const int serverPort = 80;
const char* apiControl = "http://10.106.21.192:5000/display-text";

// API endpoint
const char* apiEndpoint = "http://10.106.21.192:4000/attendance";
ESP8266WebServer server(80);
// Define NTP Server
const char* ntpServerName = "pool.ntp.org";

// Define time zone
const long utcOffsetInSeconds = 7*3600; // UTC

WiFiClient client;
// Define NTP Client
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, ntpServerName, utcOffsetInSeconds);

// Create MFRC522 instance
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Create LCD instance
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// Define allowed UID tag
byte allowedUID[] = {0x93, 0x9A, 0x60, 0x16};

// Create Servo instance
Servo myServo;

HTTPClient http;

String RFID_Code = "";


void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Thesng's Company");
  lcd.setCursor(0, 1);
  lcd.print("Have a Good Day");

  // Attach servo to pin
  myServo.attach(SERVO_PIN);

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected!!!");
  server.on("/", HTTP_POST, handleOnConnect); // Handle POST requests
  server.enableCORS(true);
  server.begin();
}

void handleOnConnect() {
  server.send(200, "text/html", "ok");
}

void loop() {
  timeClient.update();
  if (mfrc522.PICC_IsNewCardPresent()) {
    if (mfrc522.PICC_ReadCardSerial()) {
      // Check if the read UID matches the allowed UID
      boolean accessAllowed = true;
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] != allowedUID[i]) {
          accessAllowed = false;
          break;
        }
      }
      String RFID_Code = "";
// Print UID on serial monitor
      Serial.print("UID tag :");
      for (byte i = 0; i < mfrc522.uid.size; i++) {
          Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
          String hexByte = String(mfrc522.uid.uidByte[i], HEX); // Tạo chuỗi HEX tạm thời
          RFID_Code += hexByte; // Nối chuỗi HEX vào RFID_Code
      }
      RFID_Code.toUpperCase(); // Chuyển đổi thành chữ cái in hoa
      Serial.print(RFID_Code); // In giá trị RFID_Code đã được chuyển đổi

      // Display access result on LCD
      lcd.setCursor(0, 1);
      if (accessAllowed) {
        lcd.print("Access granted!");
        // Open the door (rotate servo to 180 degrees)
        myServo.write(90);
        delay(5000); // Wait for 5 seconds
        // Close the door (rotate servo back to initial position)
        myServo.write(0);
        // Gọi hàm sendAttendanceToAPI để gửi dữ liệu đến API
        // Get current time
        
        // Lấy thời gian hiện tại dưới dạng chuỗi
        String currentTime = timeClient.getFormattedTime();
        
        // Tạo chuỗi ngày tháng năm hiện tại
        String currentDate = "2024-02-24";
        Serial.println();
        Serial.println("Current time: " + currentTime);
        Serial.println("Current date: " + currentDate);
        sendAttendanceToAPI(RFID_Code, currentDate, currentTime);
      } else {
        lcd.print("Access denied!");
      }

      delay(2000); // Delay to show the result on LCD

      // Clear the current message
      lcd.setCursor(0, 1);
      lcd.print("               "); // Print empty spaces to clear the line
      fetchDataFromApi();

      // Prompt for scanning RFID again
      lcd.setCursor(0, 1);
      lcd.print("Have a great day");
    }
  }
  
  
}

void sendAttendanceToAPI(String RFID_Code, String currentDate, String currentTime) {
  // Tạo document JSON
  http.begin(client, apiEndpoint);
  const int capacity = JSON_OBJECT_SIZE(2000);
  StaticJsonDocument<capacity> jsonDocument;
  jsonDocument["RFID_Code"] = RFID_Code;
  jsonDocument["Date"] = currentDate;
  jsonDocument["checkInTime"] = currentTime;
  char output[2048];
  // Chuyển đổi JSON thành chuỗi
  serializeJson(jsonDocument, output);

  // Gửi dữ liệu đến API
  Serial.println("Sending data to API:");
  
  // Gửi HTTP POST request đến API
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(output);

  if (httpResponseCode > 0) {
    Serial.printf("[HTTP] POST request sent, response code: %d\n", httpResponseCode);
  } else {
    Serial.printf("[HTTP] POST request failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  // Kết thúc kết nối
  http.end();
}

void fetchDataFromApi() {
  http.begin(client, apiControl);
  // Gửi yêu cầu GET tới API server
  int httpCode = http.GET();

  // Kiểm tra kết quả của yêu cầu GET
  if (httpCode > 0) { // Nếu nhận được phản hồi
    String payload = http.getString(); // Lấy nội dung của phản hồi

    // Phân tích dữ liệu JSON từ phản hồi
    StaticJsonDocument<2000> doc;
    DeserializationError error = deserializeJson(doc, payload.c_str());

    // Kiểm tra lỗi trong quá trình phân tích JSON
    if (error) {
      Serial.print("Error parsing JSON: ");
      Serial.println(error.c_str());
      return;
    }

    // Trích xuất dữ liệu text từ phản hồi JSON
    const char* lastReceivedText = doc["lastReceivedText"];
    Serial.print("Last received text: ");
    Serial.println(lastReceivedText);

    // Hiển thị text lên LCD
    lcd.setCursor(0, 1);
    lcd.print(lastReceivedText);
    delay(3000);
    lcd.setCursor(0, 1);
    lcd.print("Thesng's Company");
  } else {
    Serial.print("HTTP GET request failed, error code: ");
    Serial.println(httpCode);
  }

  // Đóng kết nối HTTP
  http.end();
}

