const catchAsync = require('../utils/catchAsync');
const messageService = require('../services/messageService');

exports.getAllMessages = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;

  const messages = await messageService.getUserMessages(conversationId);

  res.status(200).json({
    status: 'success',
    data: {
      messages
    }
  });
});
