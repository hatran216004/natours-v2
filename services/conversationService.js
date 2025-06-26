const Conversation = require('../models/conversationModel');
const AppError = require('../utils/appError');

class ConversationService {
  async incrementUnreadCount(conversationId) {
    const conversationUpdated = await Conversation.findByIdAndUpdate(
      conversationId,
      { $inc: { unreadCount: 1 } },
      { new: true }
    );

    return { success: true, unreadCount: conversationUpdated.unreadCount };
  }

  async resetUnreadCount(consersationId) {
    try {
      await Conversation.findByIdAndUpdate(consersationId, { unreadCount: 0 });
    } catch (error) {
      throw new AppError(`Reset unread count failed: ${error.message}`, 500);
    }
  }

  async getConversations(userId) {
    const conversations = await Conversation.find({
      participants: userId
    });

    conversations.forEach((conversation) => {
      conversation.participants = conversation.participants.filter(
        (participant) => participant._id.toString() !== userId.toString()
      );
    });

    return { success: true, conversations };
  }
}

module.exports = new ConversationService();
