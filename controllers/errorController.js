const AppError = require('../utils/appError');
const {
  BAD_REQUEST,
  UNAUTHORIZED,
  SERVER_ERROR
} = require('../utils/constants');

// Gửi dữ liệu sai kiểu so với định nghĩa Schema(Truy vấn _id bằng một giá trị không phải ObjectId,...)
const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, BAD_REQUEST);
};

const handleDuplicateFieldsDB = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `Duplicate field ${field}, value: ${value}. Please enter another value`;
  return new AppError(message, BAD_REQUEST);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((ele) => ele.message);
  const message = `Invalid input value: ${errors.join('. ')}`;
  return new AppError(message, BAD_REQUEST);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', UNAUTHORIZED);

const handleJWTExpiredError = () =>
  new AppError(
    'Your token has been expired! Please log in again!',
    UNAUTHORIZED
  );

const sendErrorDev = (err, req, res) => {
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
  console.error('ERROR 💥: ', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (error, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error.message
      });
    }

    console.error('ERROR: ', error);
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
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || SERVER_ERROR;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name, message: err.message };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
