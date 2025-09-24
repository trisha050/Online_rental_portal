const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const session = require("express-session");
const { check, validationResult } = require("express-validator");

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ===== Session =====
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// ===== MySQL Connection =====
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "musonda@05", // your MySQL password
  database: "real_estate_portal",
});

db.connect((err) => {
  if (err) console.error("❌ MySQL connection error:", err);
  else console.log("✅ Connected to MySQL Database.");
});

// ===== Routes =====
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "public", "signup.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ===== Signup Route =====
app.post(
  "/signup",
  [
    check("firstname").notEmpty(),
    check("surname").notEmpty(),
    check("email").isEmail(),
    check("phone").notEmpty(),
    check("idnumber").notEmpty(),
    check("gender").notEmpty(),
    check("user_type").notEmpty(),
    check("password").isLength({ min: 6 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { firstname, surname, phone, email, idnumber, gender, user_type, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ? OR idnumber = ?", [email, idnumber], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: "Server error." });
      if (results.length > 0) return res.status(409).json({ success: false, message: "Email or ID already registered." });

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ success: false, message: "Error hashing password." });

        db.query(
          "INSERT INTO users (firstname, surname, phone, email, idnumber, gender, user_type, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [firstname, surname, phone, email, idnumber, gender, user_type, hashedPassword],
          (err) => {
            if (err) return res.status(500).json({ success: false, message: "Error creating user." });
            return res.json({ success: true, message: "Registration successful!" });
          }
        );
      });
    });
  }
);

// ===== Login Route =====
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Please enter both email and password." });

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Server error." });
    if (results.length === 0) return res.status(401).json({ success: false, message: "Invalid email or password." });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ success: false, message: "Error verifying password." });
      if (!match) return res.status(401).json({ success: false, message: "Invalid email or password." });

      req.session.user = { id: user.id, full_name: `${user.firstname} ${user.surname}`, user_type: user.user_type };

      let redirect = "/Tenant-dashboard.html";
      if (user.user_type === "landlord") redirect = "/Landlord-dashboard.html";
      if (user.user_type === "admin") redirect = "/Admin-dashboard.html";
      return res.json({ success: true, redirect });
    });
  });
});

// ===== Logout =====
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: "Error logging out." });
    res.json({ success: true, message: "Logged out successfully." });
  });
});

// ===== Start Server =====
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
