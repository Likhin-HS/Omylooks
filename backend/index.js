const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt'); // Add bcrypt library
const nodemailer = require('nodemailer'); // Add nodemailer library
const jwt = require('jsonwebtoken'); // Add JWT library
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,        // Database host
  user: process.env.DB_USER,        // Database user
  password: process.env.DB_PASSWORD, // Database password
  database: process.env.DB_NAME     // Database name
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL database.");
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify that JWT_SECRET is defined
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in the environment variables");
}

// Route: Check Username
app.get("/check-username", (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const query = "SELECT is_verified FROM users WHERE username = ?";
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0 && results[0].is_verified) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    res.status(200).json({ message: "Username is available" });
  });
});

// Route: Check Email Availability
app.get("/check-email", (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const query = "SELECT is_verified FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length > 0) {
      if (results[0].is_verified === 0) {
        // Email is available if not verified
        return res.status(200).json({ message: "Email is available" });
      } else {
        // Email already exists and is verified
        return res.status(409).json({ error: "Email is already taken" });
      }
    } else {
      // Email is available
      return res.status(200).json({ message: "Email is available" });
    }
  });
});

// Route: Register Username
app.post("/register-username", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Save username with NULL values for email and password
  const query = "INSERT INTO users (username) VALUES (?) ON DUPLICATE KEY UPDATE username = VALUES(username)";
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(201).json({ message: "Username registered successfully" });
  });
});

// Route: Register Email
app.post("/register-email", (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: "Username and email are required" });
  }

  // Update the email for the given username
  const query = "UPDATE users SET email = ? WHERE username = ?";
  db.query(query, [email, username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json({ message: "Email updated successfully" });
  });
});

// Route: Save Password
app.post("/register-password", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the password for the given username
    const query = "UPDATE users SET password = ? WHERE username = ?";
    db.query(query, [hashedPassword, username], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(200).json({ message: "Password updated successfully" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error hashing password" });
  }
});

// Route: Send OTP
app.post("/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP

  // Save OTP to the database
  const query = "UPDATE users SET otp = ? WHERE email = ?";
  db.query(query, [otp, email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Verify that the OTP was stored correctly
    const verifyQuery = "SELECT otp FROM users WHERE email = ?";
    db.query(verifyQuery, [email], (verifyErr, verifyResults) => {
      if (verifyErr) {
        console.error("Database error:", verifyErr);
        return res.status(500).json({ error: "Database error" });
      }

      // Send OTP email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending OTP email:", error);
          return res.status(500).json({ error: "Error sending OTP email" });
        }
        res.status(200).json({ message: "OTP sent successfully" });
      });
    });
  });
});

// Route: Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    console.error("Email and OTP are required");
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const query = "SELECT otp FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      console.error("No user found with this email");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const storedOtp = results[0].otp;

    if (storedOtp !== otp) {
      console.error("Invalid OTP");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Update user as verified and generate token
    const updateQuery = "UPDATE users SET is_verified = 1 WHERE email = ?";
    db.query(updateQuery, [email], (err, updateResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ message: "Email verified successfully", token: token });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
