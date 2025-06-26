const errorService = require('../services/errorService');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    errorService.sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name, message: err.message };

    if (error.name === 'CastError')
      error = errorService.handleCastErrorDB(error);
    if (error.code === 11000)
      error = errorService.handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = errorService.handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError')
      error = errorService.handleJWTError();
    if (error.name === 'TokenExpiredError')
      error = errorService.handleJWTExpiredError();
    if (error.isAxiosError) error = errorService.handleAxiosError(error);

    errorService.sendErrorProd(error, req, res);
  }
};
