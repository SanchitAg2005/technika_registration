require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { startQueueWorker } = require('./services/sheetsService');

const app = express();

// Connect to MongoDB Database (with automatic in-memory seeding fallback)
connectDB();

// Initialize Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/register', require('./routes/registrationRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Fallback error handler for multer and system errors
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Screenshot file size exceeds the 5MB limit!' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    console.error('Unhandled Server Error:', err);
    return res.status(500).json({ message: err.message || 'An unexpected server error occurred.' });
  }
  next();
});

// Start Google Sheets Asynchronous Queue sync worker
startQueueWorker();

// Start Server Listening (only if not running on Vercel serverless context)
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;

