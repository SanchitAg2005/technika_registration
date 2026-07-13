const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    eventId: {
      type: String,
      required: true,
      ref: 'Event',
      trim: true,
    },
    teamId: {
      type: String,
      default: null,
      trim: true,
    },
    registrationType: {
      type: String,
      required: true,
      enum: ['INDIVIDUAL', 'TEAM'],
      default: 'INDIVIDUAL',
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent registering twice for the same event (individual or team)
RegistrationSchema.index({ registrationId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
