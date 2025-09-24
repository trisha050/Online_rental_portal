// server.js
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from your frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',          // your MySQL username
  password: 'yourpassword', // your MySQL password
  database: 'realestate'    // database name
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
  } else {
    console.log('Connected to MySQL!');
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Real Estate Portal API is running');
});

// Signup route
app.post('/signup', (req, res) => {
  const { firstname, surname, phone, email, idNumber, gender, role, password } = req.body;

  const query = `INSERT INTO users 
    (firstname, surname, phone, email, idNumber, gender, role, password) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [firstname, surname, phone, email, idNumber, gender, role, password], (err, result) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: 'Error creating user. Email may already exist.' });
    }
    res.json({ success: true });
  });
});

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: 'Database error' });
    }
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false, message: 'Invalid email or password' });
    }
  });
});

// Get tenants route
app.get('/api/tenants', (req, res) => {
  const query = `SELECT id, firstname, surname, email, phone, status FROM users WHERE role = 'tenant'`;
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
