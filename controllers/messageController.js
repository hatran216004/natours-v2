const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllMessages = catchAsync(async (req, res, next) => {
  const { otherUserId } = req.params;

  const conversation = await Conversation.findOne({
    participants: { $all: [otherUserId, req.user.id] }
  });

  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  const messages = await Message.find({
    conservationId: conversation.id
  }).sort({ createdAt: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      messages
    }
  });
});

exports.getUserConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user.id
  });

  conversations.forEach((conversation) => {
    conversation.participants = conversation.participants.filter(
      (participant) => participant._id.toString() !== req.user.id.toString()
    );
  });

  res.status(200).json({
    status: 'success',
    data: {
      conversations
    }
  });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { recipientId, message } = req.body;
  const senderId = req.user.id;

  let conversation = await Conversation.findOne({
    participants: { $all: [recipientId, senderId] }
  });

  if (!conversation) {
    conversation = new Conversation({
      participants: [recipientId, senderId],
      lastMessage: {
        text: message,
        sender: senderId
      }
    });
    await conversation.save();
  }

  const newMessage = new Message({
    conservationId: conversation.id,
    sender: senderId,
    text: message
  });

  await Promise.all([
    newMessage.save(),
    conversation.updateOne({
      lastMessage: {
        text: message,
        sender: senderId
      }
    })
  ]);

  res.status(201).json({
    status: 'success',
    data: {
      newMessage
    }
  });
});
