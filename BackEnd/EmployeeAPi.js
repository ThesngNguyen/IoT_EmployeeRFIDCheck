var express = require('express');
var mysql = require('mysql');
var bodyParser = require("body-parser");
var cors = require('cors'); //npm install mysql
var app = express();

app.use(bodyParser.json());
app.use(cors());

// Kết nối đến cơ sở dữ liệu
//MYSQL
var connection = mysql.createConnection({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "admin",
    insecureAuth: true,
    database: "manage_employee",
});

connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected!!!");
    var sql = "SELECT * FROM attendance";
    connection.query(sql, function(err, results) {
        if (err) throw err;
        console.log(results);
    });
});


// Định nghĩa route để lấy thông tin nhân viên dựa trên mã RFID
app.get('/employee/:RFID_Code', (req, res) => {
    const RFID_Code = req.params.RFID_Code;

    // Truy vấn cơ sở dữ liệu để lấy thông tin nhân viên dựa trên mã RFID
    connection.query('SELECT * FROM Employee WHERE RFID_Code = ?', [RFID_Code], (error, results, fields) => {
        if (error) {
            console.error('Error querying database: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Kiểm tra xem có dữ liệu nhân viên được trả về không
        if (results.length === 0) {
            res.status(404).json({ error: 'Employee not found' });
        } else {
            // Trả về thông tin nhân viên nếu tìm thấy
            res.json(results[0]);
        }
    });
});

app.get('/attendance/:employeeID', (req, res) => {
    const employeeID = req.params.employeeID;
    const query = `SELECT * FROM AttendanceSummary WHERE EmployeeID = ?`;
    connection.query(query, [employeeID], (error, results, fields) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(results);
    });
});

app.get('/employees', (req, res) => {
    // Truy vấn cơ sở dữ liệu để lấy thông tin của tất cả nhân viên
    connection.query('SELECT * FROM Employees', (error, results, fields) => {
        if (error) {
            console.error('Error querying database: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Kiểm tra xem có dữ liệu nhân viên được trả về không
        if (results.length === 0) {
            res.status(404).json({ error: 'No employees found' });
        } else {
            // Trả về danh sách các nhân viên nếu tìm thấy
            res.json(results);
        }
    });
});

app.post('/employees/add', (req, res) => {
    const { Name, PhoneNumber, Address, RFID_Code } = req.body;
    // Thực hiện truy vấn SQL để thêm nhân viên vào cơ sở dữ liệu
    connection.query('INSERT INTO Employees (Name, PhoneNumber, Address, RFID_Code) VALUES (?, ?, ?, ?)', [Name, PhoneNumber, Address, RFID_Code], (error, results, fields) => {
        if (error) {
            console.error('Error inserting employee: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.status(201).json({ message: 'Employee added successfully', employeeId: results.insertId });
    });
});

app.put('/employees/:EmployeeID', (req, res) => {
    const EmployeeID = req.params.EmployeeID;
    const { Name, PhoneNumber, Address, RFID_Code } = req.body;
    // Thực hiện truy vấn SQL để cập nhật thông tin của nhân viên trong cơ sở dữ liệu
    connection.query('UPDATE Employees SET Name = ?, PhoneNumber = ?, Address = ?, RFID_Code = ? WHERE EmployeeID = ?', [Name, PhoneNumber, Address, RFID_Code, EmployeeID], (error, results, fields) => {
        if (error) {
            console.error('Error updating employee: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ message: 'Employee updated successfully' });
    });
});

app.delete('/employees/delete/:EmployeeID', (req, res) => {
    const EmployeeID = req.params.EmployeeID;
    // Thực hiện truy vấn SQL để xóa nhân viên khỏi cơ sở dữ liệu
    connection.query('DELETE FROM Employees WHERE EmployeeID = ?', [EmployeeID], (error, results, fields) => {
        if (error) {
            console.error('Error deleting employee: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json({ message: 'Employee deleted successfully' });
    });
});




// Route để nhận dữ liệu từ Arduino và lưu vào cơ sở dữ liệu
// Route để nhận dữ liệu từ Arduino và lưu vào cơ sở dữ liệu
app.post('/attendance', (req, res) => {
    const { RFID_Code, Date, checkInTime } = req.body;

    // Truy vấn cơ sở dữ liệu để lấy thông tin nhân viên từ mã RFID
    const employeeQuery = 'SELECT EmployeeID FROM Employees WHERE RFID_Code = ?';
    connection.query(employeeQuery, [RFID_Code], (error, results, fields) => {
        if (error) {
            console.error('Error querying database:', error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Kiểm tra xem có dữ liệu nhân viên được trả về không
        if (results.length === 0) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }

        // Lấy EmployeeID từ kết quả truy vấn
        const employeeId = results[0].EmployeeID;

        // Thực hiện truy vấn để lưu dữ liệu vào bảng Attendance
        const attendanceQuery = 'INSERT INTO Attendance (EmployeeID, Date, CheckInTime) VALUES (?, ?, ?)';
        connection.query(attendanceQuery, [employeeId, Date, checkInTime], (err, result) => {
            if (err) {
                console.error('Error saving attendance:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            console.log('Attendance saved successfully');
            res.json({ message: 'Attendance saved successfully' });
        });
    });
});


app.get('/devices', (req, res) => {
    // Truy vấn cơ sở dữ liệu để lấy thông tin của tất cả nhân viên
    connection.query('SELECT * FROM devices', (error, results, fields) => {
        if (error) {
            console.error('Error querying database: ' + error);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Kiểm tra xem có dữ liệu nhân viên được trả về không
        if (results.length === 0) {
            res.status(404).json({ error: 'No devices found' });
        } else {
            // Trả về danh sách các nhân viên nếu tìm thấy
            res.json(results);
        }
    });
})

// Route xử lý yêu cầu PUT để cập nhật thiết lập giờ
app.put('/device-setting/:deviceID', (req, res) => {
    // Lấy deviceID từ đường dẫn của yêu cầu PUT
    const deviceID = req.params.deviceID;

    // Lấy dữ liệu từ body của yêu cầu
    const { deviceOn, deviceOff } = req.body;

    // Thực hiện truy vấn cập nhật
    const sql = `UPDATE devices SET deviceOn = ?, deviceOff = ? WHERE deviceID = ?`;
    const values = [deviceOn, deviceOff, deviceID]; // Sử dụng deviceID lấy từ đường dẫn

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating device settings: ' + err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        console.log('Device settings updated successfully');
        res.status(200).json({ message: 'Device setting updated successfully' });
    });
});



// Khởi chạy server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});