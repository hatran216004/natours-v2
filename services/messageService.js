const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const AppError = require('../utils/appError');
const conversationService = require('./conversationService');

class MessageService {
  async markMessagesAsSeen(data) {
    const { messages, conversationId, senderId, recipientId } = data;
    try {
      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        conversationId ||
        senderId ||
        recipientId
      )
        throw new AppError('Invalid message data', 400);

      const messageIds = messages.map((msg) => msg._id);

      await Message.updateMany({ _id: { $in: messageIds } }, { isSeen: true });
      await conversationService.resetUnreadCount(conversationId);

      return {
        success: true,
        messageIds,
        conversationId,
        senderId,
        recipientId
      };
    } catch (error) {
      throw new AppError(`Mark messages as seen failed: ${error.message}`, 500);
    }
  }

  async createMessage(data) {
    const { recipientId, senderId, message } = data;
    if (recipientId || senderId || message)
      throw new AppError('Invalid message data', 400);

    let conversation = await Conversation.findOne({
      participants: { $all: [recipientId, senderId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [recipientId, senderId],
        lastMessage: {
          text: message,
          sender: senderId
        }
      });
    }

    const newMessage = await Message.create({
      conversationId: conversation.id,
      sender: senderId,
      text: message
    });

    conversation.lastMessage = {
      text: message,
      sender: senderId
    };
    await conversation.save();

    return { success: true, newMessage, conversationId: conversation.id };
  }

  async getUserMessages(conversationId) {
    if (!conversationId)
      throw new AppError(`Invalid conversation id: ${conversationId} `, 400);

    const messages = await Message.find({
      conversationId
    }).sort({ createdAt: 1 });

    return { success: true, messages };
  }
}
module.exports = new MessageService();
