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

conversationSchema.pre('find', function (next) {
  this.populate('participants', 'name email photo');
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
