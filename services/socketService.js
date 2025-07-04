const messageService = require('./messageService');
const logger = require('../utils/logger');
const { handleSocketError } = require('../utils/helpers');
const conversationService = require('./conversationService');
const userService = require('./userService');

const userSocketMap = new Map();

const getUserSocketId = (userId) => userSocketMap.get(userId);

const isUserOnline = (userId) => userSocketMap.has(userId);

const getOnlineUsersCount = () => userSocketMap.size;

const broadcastOnlineUsers = (io) => {
  const onlineUsers = Array.from(userSocketMap.keys());
  io.emit('online_users', onlineUsers);
};

const handleUserConnection = async (socket, io) => {
  const userId = socket.user.id;
  if (userId) {
    userSocketMap.set(userId, socket.id);
    socket.join(userId);

    await userService.updateUserStatus(userId, 'online');
    broadcastOnlineUsers(io);

    logger.info(`User ${userId} connected with socket ${socket.id}`);
  }
};

const setupMessageEvents = (socket, io) => {
  socket.on('mark_messages_as_seen', async (data) => {
    try {
      const result = await messageService.markMessagesAsSeen(data);

      if (result.success) {
        // Thông báo cho người gửi để hiển thị đã xem
        const senderSocketId = getUserSocketId(result.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_seen_confirm', {
            messageIds: result.messageIds,
            conversationId: result.conversationId
          });
        }

        // Cập nhật unread count cho người nhận
        const recipientSocketId = getUserSocketId(result.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('unread_count_updated', {
            conversationId: result.conversationId,
            unreadCount: 0
          });
        }
      }
    } catch (error) {
      handleSocketError(socket, 'mark_messages_as_seen', error);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const senderId = socket.user.id;
      const result = await messageService.createMessage({ ...data, senderId });

      if (result.success) {
        io.to(result.recipientId).emit('new_message', result.newMessage);
        // Confirm cho người gửi
        socket.emit('message_sent', result.newMessage);
      }
    } catch (error) {
      handleSocketError(socket, 'send_message', error);
    }
  });
};

const setupConversationEvents = (socket, io) => {
  socket.on('update_unread_count', async (data) => {
    const { conversationId, recipientId } = data;
    try {
      const result =
        await conversationService.incrementUnreadCount(conversationId);

      if (result.success) {
        const recipientSocketId = getUserSocketId(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('unread_count_updated', {
            conversationId,
            unreadCount: result.unreadCount
          });
        }
      }
    } catch (error) {
      handleSocketError(socket, 'update_unread_count', error);
    }
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    logger.info(`User ${socket.user.id} joined conversation ${conversationId}`);
  });

  socket.on('left_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    logger.info(`User ${socket.user.id} left conversation ${conversationId}`);
  });
};

const setupTypingEvents = (socket, io) => {
  socket.on('user_start_typing', (data) => {
    const recipientSocketId = getUserSocketId(data.recipientId);
    if (recipientSocketId)
      io.to(recipientSocketId).emit('user_typing', {
        isTyping: true,
        userId: socket.user.id,
        conversationId: data.conversationId
      });
  });

  socket.on('user_stop_typing', (data) => {
    const recipientSocketId = getUserSocketId(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', {
        isTyping: false,
        userId: socket.user.id,
        conversationId: data.conversationId
      });
    }
  });
};

const handleUserDisconnection = (socket, io) => {
  socket.on('disconnect', async () => {
    const userId = socket.user.id;
    try {
      if (userId) {
        userSocketMap.delete(userId);
        await userService.updateUserStatus(userId, 'offline');

        broadcastOnlineUsers(io);

        logger.info(`User ${userId} disconnected`);
      }
    } catch (error) {
      handleSocketError(socket, 'update_user_status', error);
    }
  });
};

const setupSocketEvents = (io) => {
  io.on('connection', (socket) => {
    handleUserConnection(socket, io);
    setupMessageEvents(socket, io);
    setupConversationEvents(socket, io);
    setupTypingEvents(socket, io);
    handleUserDisconnection(socket, io);
  });
};

module.exports = {
  setupSocketEvents,
  getUserSocketId,
  isUserOnline,
  getOnlineUsersCount
};
