const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      ref: 'Event',
      trim: true,
    },
    leaderId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['forming', 'ready', 'registered', 'cancelled'],
      default: 'forming',
    },
    memberCount: {
      type: Number,
      default: 1, // Starts with the leader
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Team', TeamSchema);
