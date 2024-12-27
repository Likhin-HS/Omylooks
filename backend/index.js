/*
Copyright 2024 Likhin H S

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
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

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Serve static files from the public directory
app.use(express.static('public'));

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

// Ensure photos table exists
const createPhotosTableQuery = `
  CREATE TABLE IF NOT EXISTS photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    country VARCHAR(255),
    height INT,
    build VARCHAR(255),
    profession VARCHAR(255),
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )
`;

db.query(createPhotosTableQuery, (err, results) => {
  if (err) {
    console.error("Error creating photos table:", err);
  } else {
    console.log("Photos table ensured.");
  }
});

// Ensure rating table exists
const createRatingTableQuery = `
  CREATE TABLE IF NOT EXISTS rating (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photo_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(photo_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )
`;

db.query(createRatingTableQuery, (err, results) => {
  if (err) {
    console.error("Error creating rating table:", err);
  } else {
    console.log("Rating table ensured.");
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

// Include reportProblem route
const reportProblemRoute = require('./routes/reportProblem');
app.use('/api', reportProblemRoute);

// Include helpImprove route
const helpImproveRoute = require('./routes/helpImprove');
app.use('/api', helpImproveRoute);

// Route: Root URL
app.get("/", (req, res) => {
  res.send("Welcome to Omylooks API");
});

// Route: Check Username
app.get("/check-username", (req, res) => {
  console.log("Route /check-username hit");
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
  console.log("Route /check-email hit");
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
      if (results[0].is_verified === 1) {
        // Email is registered and verified
        return res.status(409).json({ error: "Email is already taken" });
      } else {
        // Email exists but is not verified
        return res.status(200).json({ message: "Email is available" });
      }
    } else {
      // Email is not registered
      return res.status(200).json({ message: "Email is available" });
    }
  });
});

// Route: Register Username
app.post("/register-username", (req, res) => {
  console.log("Route /register-username hit");
  let { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  username = username.toLowerCase(); // Convert username to lowercase

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
  console.log("Route /register-email hit");
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
  console.log("Route /register-password hit");
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
  console.log("Route /send-otp hit");
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
  console.log("Route /verify-otp hit");
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
  console.log("Route /upload-profile-picture hit");
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

// Route: Remove Profile Picture
app.delete('/remove-profile-picture', (req, res) => {
  console.log("Route /remove-profile-picture hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

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

    // Remove profile picture from profile table
    const removeProfilePictureQuery = "UPDATE profile SET profile_picture = NULL WHERE user_id = ?";
    db.query(removeProfilePictureQuery, [userId], (err, updateResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(200).json({ message: "Profile picture removed successfully" });
    });
  });
});

// Route: Upload Photo
app.post('/upload-photo', (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error("File upload error:", err);
      return res.status(500).json({ error: "File upload error" });
    }

    console.log("Route /upload-photo hit");
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

    let { country, height, build, profession } = req.body;
    const photoUrl = req.file.path;

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

      // Insert photo details into photos table
      const insertPhotoQuery = `
        INSERT INTO photos (user_id, country, height, build, profession, photo_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(insertPhotoQuery, [userId, country, height, build, profession, photoUrl], (err, insertResults) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const photoId = insertResults.insertId;
        res.status(200).json({ message: "Photo uploaded successfully", photoId: photoId });
      });
    });
  });
});

// Route: Get User Profile
app.get('/user-profile', (req, res) => {
  console.log("Route /user-profile hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

  const query = "SELECT profile_picture, username FROM profile JOIN users ON profile.user_id = users.user_id WHERE users.email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profilePictureUrl = results[0].profile_picture ? `https://omylooks.onrender.com/${results[0].profile_picture}` : null;
    const username = results[0].username;
    res.status(200).json({ profilePictureUrl, username });
  });
});

// Route: Get User Profile by ID
app.get('/user-profile/:userId', (req, res) => {
  console.log("Route /user-profile/:userId hit");
  const userId = req.params.userId;

  const query = "SELECT profile_picture, username FROM profile JOIN users ON profile.user_id = users.user_id WHERE users.user_id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profilePictureUrl = results[0].profile_picture ? `https://omylooks.onrender.com/${results[0].profile_picture}` : null;
    const username = results[0].username;
    res.status(200).json({ profilePictureUrl, username });
  });
});

// Route: Get User Photos
app.get('/profile', (req, res) => {
  console.log("Route /profile hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

  const query = `
    SELECT p.*, 
           IFNULL(AVG(r.rating), 0) AS averageRating, 
           COUNT(r.rating) AS totalRatings
    FROM photos p
    LEFT JOIN rating r ON p.photo_id = r.photo_id
    WHERE p.user_id = (SELECT user_id FROM users WHERE email = ?)
    GROUP BY p.photo_id
  `;

  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json(results);
  });
});

// Route: Get User Photos by ID
app.get('/profile/:userId', (req, res) => {
  console.log("Route /profile/:userId hit");
  const userId = req.params.userId;

  const query = `
    SELECT p.*, 
           IFNULL(AVG(r.rating), 0) AS averageRating, 
           COUNT(r.rating) AS totalRatings
    FROM photos p
    LEFT JOIN rating r ON p.photo_id = r.photo_id
    WHERE p.user_id = ?
    GROUP BY p.photo_id
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json(results);
  });
});

// Route: Login
app.post('/login', (req, res) => {
  console.log("Route /login hit");
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  const query = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_verified = 1';
  db.query(query, [identifier, identifier], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  });
});

// Route: Get Random Photo
app.get('/random-photo', (req, res) => {
  console.log("Route /random-photo hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const query = `
    SELECT p.photo_id, p.photo_url, p.country, p.height, p.build, p.profession, u.user_id, u.username, pr.profile_picture
    FROM photos p
    JOIN users u ON p.user_id = u.user_id
    LEFT JOIN profile pr ON u.user_id = pr.user_id
    ORDER BY RAND()
    LIMIT 1
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No photos found" });
    }

    const photo = results[0];
    res.status(200).json({
      photoId: photo.photo_id,
      photoUrl: `https://omylooks.onrender.com/${photo.photo_url}`,
      country: photo.country,
      height: photo.height,
      build: photo.build,
      profession: photo.profession,
      userId: photo.user_id, // Include user ID in the response
      username: photo.username,
      profilePictureUrl: photo.profile_picture ? `https://omylooks.onrender.com/${photo.profile_picture}` : null
    });
  });
});

// Route: Submit Rating
app.post('/rate-photo', (req, res) => {
  console.log("Route /rate-photo hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { photoId, rating } = req.body;
  const email = decoded.email;

  if (!photoId || !rating) {
    return res.status(400).json({ error: 'Photo ID and rating are required' });
  }

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

    const insertRatingQuery = `
      INSERT INTO rating (photo_id, user_id, rating)
      VALUES (?, ?, ?)
    `;

    db.query(insertRatingQuery, [photoId, userId, rating], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Calculate average rating and total ratings
      const calculateRatingQuery = `
        SELECT AVG(rating) AS averageRating, COUNT(rating) AS totalRatings
        FROM rating
        WHERE photo_id = ?
      `;

      db.query(calculateRatingQuery, [photoId], (err, ratingResults) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const averageRating = ratingResults[0].averageRating;
        const totalRatings = ratingResults[0].totalRatings;

        res.status(200).json({
          message: "Rating submitted successfully",
          yourRating: rating,
          averageRating: averageRating,
          totalRatings: totalRatings
        });
      });
    });
  });
});

// Route: Delete Photo
app.delete('/photos/:photoId', (req, res) => {
  console.log("Route /photos/:photoId hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const photoId = req.params.photoId;

  if (!photoId) {
    return res.status(400).json({ error: 'Photo ID is required' });
  }

  // Delete ratings associated with the photo
  const deleteRatingsQuery = "DELETE FROM rating WHERE photo_id = ?";
  db.query(deleteRatingsQuery, [photoId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Delete the photo
    const deletePhotoQuery = "DELETE FROM photos WHERE photo_id = ?";
    db.query(deletePhotoQuery, [photoId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(200).json({ message: "Photo and associated ratings deleted successfully" });
    });
  });
});

// Route: Reset Password
app.post("/reset-password", async (req, res) => {
  console.log("Route /reset-password hit");
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the password for the given email
    const query = "UPDATE users SET password = ? WHERE email = ?";
    db.query(query, [hashedPassword, email], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ message: "Password reset successfully", token: token });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error hashing password" });
  }
});

// Route: Change Username
app.post("/change-username", (req, res) => {
  console.log("Route /change-username hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;
  const { newUsername } = req.body;

  if (!newUsername) {
    return res.status(400).json({ error: "New username is required" });
  }

  const query = "UPDATE users SET username = ? WHERE email = ?";
  db.query(query, [newUsername, email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.status(200).json({ message: "Username changed successfully" });
  });
});

// Route: Delete Account
app.delete('/delete-account', (req, res) => {
  console.log("Route /delete-account hit");
  const token = req.headers.authorization.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const email = decoded.email;

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

    // Delete all related data from all tables
    const deleteProfileQuery = "DELETE FROM profile WHERE user_id = ?";
    const deletePhotosQuery = "DELETE FROM photos WHERE user_id = ?";
    const deleteRatingsQuery = "DELETE FROM rating WHERE user_id = ?";
    const deleteUserQuery = "DELETE FROM users WHERE user_id = ?";

    db.query(deleteProfileQuery, [userId], (err, profileResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      db.query(deletePhotosQuery, [userId], (err, photosResults) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        db.query(deleteRatingsQuery, [userId], (err, ratingsResults) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
          }

          db.query(deleteUserQuery, [userId], (err, userResults) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ error: "Database error" });
            }

            res.status(200).json({ message: "Account deleted successfully" });
          });
        });
      });
    });
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
  console.log(`Server running on ${port}`);
});
