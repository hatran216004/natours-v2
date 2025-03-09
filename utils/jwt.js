const jwt = require('jsonwebtoken');
const { promisify } = require('util');

// sign(payload, secret, options)
exports.signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN
  });

exports.signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN
  });

exports.verifyAccessToken = async (token) => {
  return await promisify(jwt.verify)(
    token,
    process.env.JWT_ACCESS_TOKEN_SECRET
  );
};

exports.verifyRefreshToken = async (token) => {
  return await promisify(jwt.verify)(
    token,
    process.env.JWT_REFRESH_TOKEN_SECRET
  );
};
