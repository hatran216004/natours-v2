const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conservationId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
