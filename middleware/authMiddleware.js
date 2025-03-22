const passport = require('passport');
const User = require('../models/userModel');
const Role = require('../models/roleModel');
require('../models/permissionModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { UNAUTHORIZED, FORBIDDEN } = require('../utils/constants');
const { verifyAccessToken } = require('../utils/jwt');

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role.name)) {
      return next(new AppError('Access denied', FORBIDDEN));
    }
    next();
  };
};

/*
  Duyệt qua danh sách quyền cần kiểm tra (permissions)
  So sánh với danh sách quyền của role
  Nếu role có ít nhất một quyền trong danh sách permissions, thì cho phép tiếp tục
*/
exports.checkPermission = (...permissions) => {
  return async (req, res, next) => {
    const role = await Role.findOne({ name: req.user.role.name }).populate(
      'permissions'
    );

    const permissionsList = role.permissions.map((per) => per.name);
    const hasPermission = permissions.some((perm) =>
      permissionsList.includes(perm)
    );

    if (!hasPermission) return next(new AppError('Access denied', FORBIDDEN));
    next();
  };
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in ! Please log in to access.',
        UNAUTHORIZED
      )
    );
  }

  // 2) Verification token (token payload has not been manipulated buy some malicious third party)
  const decoded = await verifyAccessToken(token);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist!',
        UNAUTHORIZED
      )
    );
  }

  // 4) Check if user changed password after the token was issued (payload.iat: thời gian phát hành token)
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently change password! Please log in again.',
        UNAUTHORIZED
      )
    );
  }
  req.user = currentUser;
  next();
});

exports.authenticateJWT = catchAsync(async (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return next(
        new AppError('Invalid token. Please log in again!', UNAUTHORIZED)
      );
    }
    req.user = user;
    next();
  })(req, res, next);
});

/*
  - Cuối dòng có (req, res, next), điều này giúp hàm passport.authenticate() nhận vào request hiện tại và thực thi ngay lập tức
  - Nếu token bị lỗi trong quá trình giải mã (jsonwebtoken.verify() thất bại), nó sẽ không vào callback function của passport.use(), mà sẽ trực tiếp gọi middleware (err, user, info) => {...} trong passport.authenticate()
*/
