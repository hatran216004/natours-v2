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
  io.emit('onlineUsers', onlineUsers);
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
  socket.on('markMessagesAsSeen', async (data) => {
    try {
      const result = await messageService.markMessagesAsSeen(data);

      if (result.success) {
        // Thông báo cho người gửi để hiển thị đã xem
        const senderSocketId = getUserSocketId(result.senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messagesSeenConfirm', {
            messageIds: result.messageIds,
            conversationId: result.conversationId
          });
        }

        // Cập nhật unread count cho người nhận
        const recipientSocketId = getUserSocketId(result.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('unreadCountUpdated', {
            conversationId: result.conversationId,
            unreadCount: 0
          });
        }
      }
    } catch (error) {
      handleSocketError(socket, 'markMessagesAsSeen', error);
    }
  });

  socket.on('sendMessage', async (data) => {
    try {
      const senderId = socket.userId;
      const result = await messageService.createMessage({ ...data, senderId });

      if (result.success) {
        io.to(`conversation_${result.conversationId}`).emit(
          'newMessage',
          result.newMessage
        );

        // Confirm cho người gửi
        socket.emit('messageSent', result.newMessage);
      }
    } catch (error) {
      handleSocketError(socket, 'sendMessage', error);
    }
  });
};

const setupConversationEvents = (socket, io) => {
  socket.on('updateUnreadCount', async (data) => {
    const { conversationId, recipientId } = data;
    try {
      const result =
        await conversationService.incrementUnreadCount(conversationId);

      if (result.success) {
        const recipientSocketId = getUserSocketId(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('unreadCountUpdated', {
            conversationId,
            unreadCount: result.unreadCount
          });
        }
      }
    } catch (error) {
      handleSocketError(socket, 'updateUnreadCount', error);
    }
  });

  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    logger.info(`User ${socket.userId} left conversation ${conversationId}`);
  });
};

const setupTypingEvents = (socket, io) => {
  socket.on('startTyping', (data) => {
    const recipientSocketId = getUserSocketId(data.recipientId);
    if (recipientSocketId)
      io.to(recipientSocketId).emit('userTyping', {
        isTyping: true,
        userId: socket.userId,
        conversationId: data.conversationId
      });
  });

  socket.on('stopTyping', (data) => {
    const recipientSocketId = getUserSocketId(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', {
        isTyping: false,
        userId: socket.userId,
        conversationId: data.conversationId
      });
    }
  });
};

const handleUserDisconnection = (socket, io) => {
  socket.on('disconnect', async () => {
    const userId = socket.userId;
    try {
      if (userId) {
        userSocketMap.delete(userId);
        await userService.updateUserStatus(userId, 'offline');

        broadcastOnlineUsers(io);

        logger.info(`User ${userId} disconnected`);
      }
    } catch (error) {
      handleSocketError(socket, 'updateUserStatus', error);
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
