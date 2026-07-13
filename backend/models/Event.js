const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    individualAllowed: {
      type: Boolean,
      default: true,
    },
    teamAllowed: {
      type: Boolean,
      default: false,
    },
    minMembers: {
      type: Number,
      default: 1,
    },
    maxMembers: {
      type: Number,
      default: 1,
    },
    pointsFirst: {
      type: Number,
      default: 10,
    },
    pointsSecond: {
      type: Number,
      default: 7,
    },
    pointsThird: {
      type: Number,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', EventSchema);
