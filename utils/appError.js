// class xử lý lỗi vận hành (operational errors)
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Lỗi vận hành, không phải lỗi lập trình

    Error.captureStackTrace(this, this.constructor); // Giúp log lỗi ngắn gọn và dễ đọc hơn (stack trace chỉ chứa nơi lỗi thực sự xảy ra)
  }
}

module.exports = AppError;
