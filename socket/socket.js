const { Server } = require('socket.io');
const { socketAuth } = require('../middleware/socketAuth');
const logger = require('../utils/logger');
const { setupSocketEvents } = require('../services/socketService');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000, // Nếu client không phản hồi sau 60 giây, server sẽ ngắt kết nối
    pingInterval: 25000
  });

  io.use(socketAuth);
  setupSocketEvents(io);

  logger.info('Socket.IO server initialized');
  return io;
};

module.exports = { initSocket, io };
