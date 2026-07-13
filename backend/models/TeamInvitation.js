const mongoose = require('mongoose');

const TeamInvitationSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      ref: 'Team',
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      ref: 'Event',
      trim: true,
    },
    senderId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    receiverId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
      default: 'pending',
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TeamInvitation', TeamInvitationSchema);
