const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const { queueRegistrationSync } = require('../services/sheetsService');

// @route   GET /api/events
// @desc    Get all active events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

// @route   POST /api/events/register-individual
// @desc    Register a user for an individual-allowed event
// @access  Private (Authenticated)
router.post('/register-individual', auth, async (req, res) => {
  const { eventId } = req.body;
  const registrationId = req.user.registrationId;

  try {
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required.' });
    }

    // 1. Verify event exists and is active
    const event = await Event.findOne({ eventId, isActive: true });
    if (!event) {
      return res.status(404).json({ message: 'Event not found or is currently inactive.' });
    }

    // 2. Verify that individual participation is allowed
    if (!event.individualAllowed) {
      return res.status(400).json({
        message: `Individual enrollment is not permitted for "${event.name}". To participate, you must create or join a team via the Team Events tab.`
      });
    }

    // 3. Verify user is not already registered for this event
    const existingRegistration = await Registration.findOne({
      registrationId,
      eventId
    });

    if (existingRegistration) {
      return res.status(400).json({
        message: `You are already registered for "${event.name}".`
      });
    }

    // 4. Create Event Registration record
    const registration = new Registration({
      registrationId,
      eventId,
      teamId: null,
      registrationType: 'INDIVIDUAL',
      status: 'CONFIRMED'
    });
    await registration.save();

    // 5. Sync Google Sheets (in background)
    queueRegistrationSync(registration, event).catch(err => console.error('[SHEETS BACKGROUND ERROR] Failed to sync registration:', err.message));

    res.json({
      success: true,
      message: `Successfully registered for "${event.name}"!`,
      registration
    });

  } catch (error) {
    console.error('Individual event registration error:', error.message);
    res.status(500).json({ message: 'Server error while registering for event.' });
  }
});

module.exports = router;
