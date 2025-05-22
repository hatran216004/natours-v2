const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  },
  {
    timestamps: true
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
