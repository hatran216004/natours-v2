const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'A notification must have a user']
    },
    title: {
      type: String,
      required: [true, 'A notification must have a title']
    },
    content: {
      type: String,
      required: [true, 'A notification must have a content']
    },
    type: {
      type: String,
      required: [true, 'A notification must have a type'],
      enum: {
        values: ['refund', 'message'],
        message: 'Notification type is either: refund, message'
      }
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
