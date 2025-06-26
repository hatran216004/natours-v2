// file app thường khai báo và sử dụng các middleware
const http = require('http');
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const hpp = require('hpp');
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('passport');

require('./config/passport-jwt');

const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const roleRouter = require('./routes/roleRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const permissionRouter = require('./routes/permissionRoutes');
const messageRouter = require('./routes/messageRoutes');
const conversationRouter = require('./routes/conversationRoutes');
const notificationRouter = require('./routes/notificationRoutes');

const globalErrorHandler = require('./controllers/errorController');
// const limiter = require('./middleware/rateLimitMiddleware');

const { initSocket } = require('./socket/socket');

const app = express();
const server = http.createServer(app);

app.set('view engine', 'ejs');

//  GLOBAL MIDDLEWARE
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Giới hạn tối đa số lượng request từ mỗi IP
// app.use('/api', limiter);

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
); // middleware để phục vụ các static files từ folder public
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xss()); // Data sanitization against XSS
app.use(
  hpp({
    whitelist: [
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'duration',
      'rating',
      'price'
    ]
  })
); // HTTP Parameter Pollution

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);

app.options('*', cors());

app.use(passport.initialize());

const io = initSocket(server);

/*
Test    
app.use((req, res, next) => {
  console.log('I"m Middleware 😊');
  next();
});
*/

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // thêm requestTime vào obj req
  next();
});

// ROUTES: Middleware chỉ áp dụng cho các url nhất định
// Mounting router: gắn router tourRouter vào route '/api/v2/tours'
app.use('/api/v2/tours', tourRouter); //  tourRouter middleware chỉ chạy trên route '/api/v2/tours'
app.use('/api/v2/users', userRouter);
app.use('/api/v2/bookings', bookingRouter);
app.use('/api/v2/reviews', reviewRouter);
app.use('/api/v2/roles', roleRouter);
app.use('/api/v2/permissions', permissionRouter);
app.use('/api/v2/messages', messageRouter);
app.use('/api/v2/conversations', conversationRouter);
app.use('/api/v2/notifications', notificationRouter);

// Hanlde error unhanlded routes
app.all('*', (req, res, next) => {
  next(
    new AppError(`Can't find ${req.originalUrl} on this server (●'◡'●)`, 404)
  );
});

// Middleware error hanlder
app.use(globalErrorHandler);

module.exports = { app, server, io };
