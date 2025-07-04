const User = require('../models/userModel');
const AppError = require('../utils/appError');
const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../utils/logger');

exports.socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token)
      throw new AppError(
        'You are not logged in ! Please log in to access.',
        401
      );

    const decoded = await verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error', error);
    return next(error);
  }
};
