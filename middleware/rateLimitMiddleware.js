const rateLimit = require('express-rate-limit');

// Giới hạn tối đa 100 request từ mỗi IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  limit: 100,
  message: 'Too many requests from this IP, please try again in an hour'
});

module.exports = limiter;
