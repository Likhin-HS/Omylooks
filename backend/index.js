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

// Route: Upload Photo
app.post('/upload-photo', upload.single('photo'), (req, res) => {
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

  const query = "SELECT profile_picture, username FROM profile JOIN users ON profile.user_id = users.user_id WHERE users.email = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profilePictureUrl = results[0].profile_picture ? `http://localhost:3000/${results[0].profile_picture}` : null;
    const username = results[0].username;
    res.status(200).json({ profilePictureUrl, username });
  });
});

// Route: Get User Profile by ID
app.get('/user-profile/:userId', (req, res) => {
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

    const profilePictureUrl = results[0].profile_picture ? `http://localhost:3000/${results[0].profile_picture}` : null;
    const username = results[0].username;
    res.status(200).json({ profilePictureUrl, username });
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
      photoUrl: `http://localhost:3000/${photo.photo_url}`,
      country: photo.country,
      height: photo.height,
      build: photo.build,
      profession: photo.profession,
      userId: photo.user_id, // Include user ID in the response
      username: photo.username,
      profilePictureUrl: photo.profile_picture ? `http://localhost:3000/${photo.profile_picture}` : null
    });
  });
});

// Route: Submit Rating
app.post('/rate-photo', (req, res) => {
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
