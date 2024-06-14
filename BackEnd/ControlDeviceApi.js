const express = require('express');
var cors = require('cors');
const bodyParser = require('body-parser');
// Import controller for sending data to Arduino
const sendDataToArduino = require('arduino-controller');
const { SerialPort } = require('serialport');
const app = express();
const port = 5000; // Port for the server to listen on

// Parse incoming request bodies in JSON format
app.use(bodyParser.json());
app.use(cors());

const serialport = new SerialPort({
    path: 'COM11',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
})

// Route for handling POST requests to send text to Arduino

let lastReceivedText = ""; // Biến để lưu trữ dữ liệu được gửi từ yêu cầu POST trước đó

// Route để xử lý yêu cầu POST và lưu trữ dữ liệu
app.post('/display-text', (req, res) => {
    // Extract text data from the request body
    const { text } = req.body;

    // Lưu trữ dữ liệu vào biến lastReceivedText
    lastReceivedText = text;
    sendDataToArduino(lastReceivedText);
    // Gửi phản hồi về cho máy khách
    res.json({ success: true });
});

// Route để xử lý yêu cầu GET và trả về dữ liệu đã nhận từ yêu cầu POST trước đó
app.get('/display-text', (req, res) => {
    // Trả về dữ liệu đã nhận từ yêu cầu POST trước đó
    res.json({ lastReceivedText });
});

function SendDataToArduino(lastReceivedText) {
    // Mở kết nối với cổng serial
    serialport.write(lastReceivedText, (err) => {
        if (err) {
            return console.error('Error writing to Arduino:', err);
        }
        console.log('Data sent to Arduino:', lastReceivedText);
    });
}

// Xử lý sự kiện mở cổng serial
serialport.on('open', () => {
    console.log('Serial port opened');
});

// Xử lý sự kiện lỗi
serialport.on('error', (err) => {
    console.error('Error opening serial port:', err);
});

// Xuất hàm sendDataToArduino để có thể sử dụng từ các module khác
module.exports = {
    sendDataToArduino: sendDataToArduino
};


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});