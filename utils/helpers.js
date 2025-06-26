const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const logger = require('./logger');

exports.hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

exports.filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

exports.uploadToCloudinary = async (byteArrayBuffer, filename, folder) => {
  const publicId = `${filename}-${Date.now()}`;
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id: publicId
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(byteArrayBuffer);
  });
};

exports.handleSocketError = (socket, eventName, error) => {
  logger.error(`Socket error in ${eventName}:`, {
    error: error.message,
    stack: error.stack,
    userId: socket.userId,
    socketId: socket.id
  });

  socket.emit('error', {
    event: eventName,
    message: error.message
  });
};

exports.extractOrderCode = (content) => {
  const match = content.match(/DH\w+/);
  return match ? match[0] : null;
};

exports.generateOrderCode = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DH${Date.now()}${rand}`;
};
