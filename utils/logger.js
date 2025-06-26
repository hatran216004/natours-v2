const winstion = require('winston');

const logger = winstion.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winstion.format.combine(
    winstion.format.timestamp(),
    winstion.format.errors({ stack: true }),
    winstion.format.json()
  ),
  transports: [
    new winstion.transports.File({
      filename: 'logs/error.log',
      level: 'eror'
    }),
    new winstion.transports.File({ filename: 'logs/combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winstion.transports.Console({ format: winstion.format.simple() })
  );
}

module.exports = logger;
