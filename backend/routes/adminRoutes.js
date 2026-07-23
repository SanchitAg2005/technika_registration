const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { processSingleTask, reconcileDatabaseToSheets } = require('../services/sheetsService');
const SheetsQueue = require('../models/SheetsQueue');

// Middleware to check admin secret / cron secret
const verifyAdminSecret = (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET || 'super_secret_admin_key_123';
  const cronSecret = process.env.CRON_SECRET;
  
  const authHeader = req.headers['x-admin-secret'] || req.headers['authorization'];
  
  let token = authHeader;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Also check query parameter "secret"
  const queryToken = req.query.secret;
  
  if (
    (token && (token === adminSecret || (cronSecret && token === cronSecret))) ||
    (queryToken && (queryToken === adminSecret || (cronSecret && queryToken === cronSecret)))
  ) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized access. Invalid admin secret.' });
};

// @route   GET /api/admin/keep-alive
// @desc    Pings Supabase Storage to prevent project pausing on inactivity
// @access  Public (so uptime monitors can ping it easily without headers)
router.get('/keep-alive', async (req, res) => {
  try {
    if (supabase) {
      await supabase.storage.listBuckets();
      console.log('[KEEP-ALIVE] Successfully pinged Supabase Storage client.');
    } else {
      console.log('[KEEP-ALIVE] Supabase client is not configured.');
    }
    res.json({ success: true, message: 'Supabase pinged successfully!' });
  } catch (err) {
    console.error('[KEEP-ALIVE] Supabase ping failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to run queue processing logic
const handleProcessQueue = async (req, res) => {
  try {
    const pendingTasks = await SheetsQueue.find({
      status: { $in: ['PENDING', 'FAILED'] },
      retryCount: { $lt: 5 }, // Maximum 5 retries
    }).limit(15); // Process 15 at a time

    const results = [];
    if (pendingTasks.length > 0) {
      console.log(`[ADMIN WORKER] Processing ${pendingTasks.length} pending sync tasks.`);
      for (const task of pendingTasks) {
        try {
          await processSingleTask(task);
          results.push({ id: task.registrationId, type: task.type, status: 'SUCCESS' });
        } catch (err) {
          results.push({ id: task.registrationId, type: task.type, status: 'FAILED', error: err.message });
        }
      }
    }
    res.json({ success: true, processedCount: pendingTasks.length, details: results });
  } catch (error) {
    console.error('[ADMIN WORKER] Queue processing failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @route   GET/POST /api/admin/process-queue
// @desc    Processes pending/failed sheets sync queue tasks (batch triggered by crons)
// @access  Private (Admin/Cron secret required)
router.get('/process-queue', verifyAdminSecret, handleProcessQueue);
router.post('/process-queue', verifyAdminSecret, handleProcessQueue);

// Helper to run manual database sync reconciliation
const handleReconcileSheets = async (req, res) => {
  try {
    const result = await reconcileDatabaseToSheets();
    res.json(result);
  } catch (error) {
    console.error('[ADMIN RECONCILE] Manual reconciliation failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @route   GET/POST /api/admin/reconcile-sheets
// @desc    Triggers manual full database sync reconciliation to SheetsQueue
// @access  Private (Admin/Cron secret required)
router.get('/reconcile-sheets', verifyAdminSecret, handleReconcileSheets);
router.post('/reconcile-sheets', verifyAdminSecret, handleReconcileSheets);

module.exports = router;
