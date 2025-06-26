const { deleteOne } = require('./handlerFactory');
const Conversation = require('../models/conversationModel');
const conversationService = require('../services/conversationService');
const catchAsync = require('../utils/catchAsync');

exports.deleteConversation = deleteOne(Conversation);

exports.incrementUnreadCount = async () => {};

exports.resetUnreadCount = async () => {};

exports.getUserConversations = catchAsync(async (req, res, next) => {
  const { conversations } = await conversationService.getConversations(
    req.user.id
  );

  res.status(200).json({
    status: 'success',
    data: {
      conversations
    }
  });
});
