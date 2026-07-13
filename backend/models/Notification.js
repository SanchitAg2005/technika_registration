const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['TEAM_INVITE', 'INVITE_ACCEPTED', 'INVITE_DECLINED'],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamInvitation',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
