// file app thường khai báo và sử dụng các middleware
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
const tourRouter = require('./routes/tourRouter');
const userRouter = require('./routes/userRouter');
const reviewRouter = require('./routes/reviewRouter');
const roleRouter = require('./routes/roleRouter');
const bookingRouter = require('./routes/bookingRouter');
const permissionRouter = require('./routes/permissionRouter');
const globalErrorHandler = require('./controllers/errorController');
// const limiter = require('./middleware/rateLimitMiddleware');

const app = express();

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
    origin: 'http://localhost:5173',
    credentials: true
  })
);

app.options('*', cors());

app.use(passport.initialize());

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

// Hanlde error unhanlded routes
app.all('*', (req, res, next) => {
  next(
    new AppError(`Can't find ${req.originalUrl} on this server (●'◡'●)`, 404)
  );
});

// Middleware error hanlder
app.use(globalErrorHandler);

module.exports = app;
