const mongoose = require('mongoose');
const Message = require('./messageModel');

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
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.pre('find', function (next) {
  this.populate('participants', 'name email photo status');
  next();
});

conversationSchema.pre('findOneAndDelete', async function (next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) await Message.deleteMany({ conversationId: doc._id });
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
