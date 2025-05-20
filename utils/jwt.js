const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const client = require('../redisClient');
const { SERVER_ERROR } = require('./constants');
const AppError = require('./appError');

// sign(payload, secret, options)
exports.generateTokens = (id) => {
  const accessToken = jwt.sign(
    { id, jti: uuidv4() },
    process.env.JWT_ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN
    }
  );
  const refreshToken = jwt.sign(
    { id, jti: uuidv4() },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN
    }
  );
  return { accessToken, refreshToken };
};

exports.verifyAccessToken = async (token) =>
  await promisify(jwt.verify)(token, process.env.JWT_ACCESS_TOKEN_SECRET);

exports.verifyRefreshToken = async (token) =>
  await promisify(jwt.verify)(token, process.env.JWT_REFRESH_TOKEN_SECRET);

exports.setTokenBlacklist = async (token, type) => {
  try {
    const decoded = jwt.decode(token);
    const currentTimestamp = parseInt(Date.now() / 1000, 10);
    const ttl = decoded.exp - currentTimestamp; // time to live

    if (ttl > 0)
      await client.set(`bl_${type}_${decoded.id}_${decoded.jti}`, '1', {
        EX: ttl
      });
  } catch (error) {
    throw new AppError(error.message, SERVER_ERROR);
  }
};
