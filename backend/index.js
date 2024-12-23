const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require('bcrypt'); // Add bcrypt library
const nodemailer = require('nodemailer'); // Add nodemailer library
const jwt = require('jsonwebtoken'); // Add JWT library
const multer = require('multer'); // Add multer for file uploads
const fs = require('fs'); // Add fs for file system operations
const http = require('http'); // Add http for WebSocket server
const WebSocket = require('ws'); // Add WebSocket library
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Increase limit for base64 image data

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

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

// Ensure profile table exists
const createProfileTableQuery = `
  CREATE TABLE IF NOT EXISTS profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    profile_picture VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )
`;

db.query(createProfileTableQuery, (err, results) => {
  if (err) {
    console.error("Error creating profile table:", err);
  } else {
    console.log("Profile table ensured.");
  }
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

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
  const otpExpiry = new Date(Date.now() + 5 * 60000); // Set OTP expiry time to 5 minutes from now

  // Save OTP and expiry time to the database
  const query = "UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?";
  db.query(query, [otp, otpExpiry, email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
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

// Route: Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    console.error("Email and OTP are required");
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  const query = "SELECT otp, otp_expiry FROM users WHERE email = ?";
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
    const otpExpiry = new Date(results[0].otp_expiry);

    if (storedOtp !== otp) {
      console.error("Invalid OTP");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (otpExpiry < new Date()) {
      console.error("OTP has expired");
      return res.status(400).json({ error: "OTP has expired" });
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

// Route: Upload Profile Picture
app.post('/upload-profile-picture', upload.single('image'), (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const profilePicturePath = req.file.path;

  // Get user_id from users table
  const getUserQuery = "SELECT user_id FROM users WHERE email = ?";
  db.query(getUserQuery, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const userId = results[0].user_id;

    // Check if profile exists for the user
    const checkProfileQuery = "SELECT * FROM profile WHERE user_id = ?";
    db.query(checkProfileQuery, [userId], (err, profileResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (profileResults.length === 0) {
        // Insert new profile if it doesn't exist
        const insertProfileQuery = "INSERT INTO profile (user_id, profile_picture) VALUES (?, ?)";
        db.query(insertProfileQuery, [userId, profilePicturePath], (err, insertResults) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          res.status(200).json({ message: "Profile picture uploaded successfully" });
        });
      } else {
        // Update profile picture if profile exists
        const updateProfileQuery = "UPDATE profile SET profile_picture = ? WHERE user_id = ?";
        db.query(updateProfileQuery, [profilePicturePath, userId], (err, updateResults) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          res.status(200).json({ message: "Profile picture uploaded successfully" });
        });
      }
    });
  });
});

// Route: Get User Profile
app.get('/user-profile', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

  const query = "SELECT profile_picture FROM profile JOIN users ON profile.user_id = users.user_id WHERE users.email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profilePictureUrl = results[0].profile_picture ? `http://localhost:3000/${results[0].profile_picture}` : null;
    res.status(200).json({ profilePictureUrl });
  });
});

// Route: Get User Photos
app.get('/profile', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

  const query = "SELECT * FROM photos WHERE user_id = (SELECT user_id FROM users WHERE email = ?)";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json(results);
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket connection opened');

  ws.on('message', (message) => {
    console.log('WebSocket message received:', message);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
