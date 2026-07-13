const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      required: true,
      ref: 'Team',
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
      trim: true,
      uppercase: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['Leader', 'Member'],
      default: 'Member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique member index: User can belong to a team only once
TeamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
