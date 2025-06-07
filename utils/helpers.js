const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const AppError = require('./appError');
const { SERVER_ERROR } = require('./constants');

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

exports.createSignature = (rawSignature) =>
  crypto
    .createHmac('sha256', process.env.MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest('hex');

exports.uploadToCloudinary = async (byteArrayBuffer, folder) => {
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(byteArrayBuffer);
  }).catch((error) => {
    throw new AppError('Failed to upload image', SERVER_ERROR);
  });
};
