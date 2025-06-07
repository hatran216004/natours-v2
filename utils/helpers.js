const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');

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

exports.uploadToCloudinary = async (byteArrayBuffer, filename, folder) => {
  const publicId = `${filename.replace('.jpg', '')}-${Date.now()}`;
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
