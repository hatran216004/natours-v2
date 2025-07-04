const logger = require('../utils/logger');
const AppError = require('../utils/appError');
const {
  BAD_REQUEST,
  UNAUTHORIZED,
  SERVER_ERROR
} = require('../utils/constants');

class ErrorService {
  // Gửi dữ liệu sai kiểu so với định nghĩa Schema(Truy vấn _id bằng một giá trị không phải ObjectId,...)
  handleCastErrorDB(error) {
    const message = `Invalid ${error.path}: ${error.value}`;
    return new AppError(message, BAD_REQUEST);
  }

  handleDuplicateFieldsDB(error) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    const message = `Duplicate field ${field}, value: ${value}. Please enter another value`;
    return new AppError(message, BAD_REQUEST);
  }

  handleValidationErrorDB(error) {
    const errors = Object.values(error.errors).map((ele) => ele.message);
    const message = `Invalid input value: ${errors.join('. ')}`;
    return new AppError(message, BAD_REQUEST);
  }

  handleJWTError() {
    return new AppError('Invalid token. Please log in again!', UNAUTHORIZED);
  }

  handleJWTExpiredError() {
    return new AppError(
      'Your token has been expired! Please log in again!',
      UNAUTHORIZED
    );
  }

  handleAxiosError(err) {
    let message = 'Request to external service failed';

    if (err.response && err.response.data) {
      message = `External API error: ${JSON.stringify(err.response.data)}`;
    } else if (err.message) {
      message = `Request failed: ${err.message}`;
    }

    return new AppError(message, SERVER_ERROR);
  }

  sendErrorDev(err, req, res) {
    // Api
    if (req.originalUrl.startsWith('/api')) {
      return res.status(err.statusCode).json({
        error: err,
        message: err.message,
        status: err.status,
        stack: err.stack
      });
    }
    // Render website (dành cho ssr)
    logger.error('Unhandled Error: ', {
      message: err.message,
      stack: err.stack
    });
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }

  sendErrorProd(error, req, res) {
    if (req.originalUrl.startsWith('/api')) {
      if (error.isOperational) {
        return res.status(error.statusCode).json({
          status: error.statusCode,
          message: error.message,
          statusCode: error?.statusCode || 500
        });
      }

      logger.error('Unhandled Error: ', {
        message: error.message,
        stack: error.stack
      });
      return res.status(500).json({
        status: 'error',
        msg: 'Something went very wrong (●/ω＼●)'
      });
    }

    // Render website (dành cho ssr)
    if (req.originalUrl) {
      return res.status(error.statusCode).render('error', {
        title: 'Something went wrong !',
        msg: error.message
      });
    }
    return res.status(error.statusCode).render('error', {
      title: 'Something went wrong',
      msg: 'Please try again later.'
    });
  }
}

module.exports = new ErrorService();
