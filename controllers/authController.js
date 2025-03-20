const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const { hashToken } = require('../utils/helpers');
const {
  generateTokens,
  setTokenBlacklist,
  verifyRefreshToken
} = require('../utils/jwt');
const {
  UNAUTHORIZED,
  BAD_REQUEST,
  NOT_FOUND,
  SERVER_ERROR,
  FORBIDDEN,
  MAX_ATTEMPTS,
  LOCK_TIME
} = require('../utils/constants');

const setTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: process.env.COOKIE_REFRESH_TOKEN_EXPIRES_IN * 60 * 60 * 1000
  };
  res.cookie('token', refreshToken, cookieOptions);
};

const invalidateTokens = async (req, next) => {
  const { token: refreshToken } = req.cookies;
  const accessToken =
    req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!accessToken || !refreshToken)
    return next(new AppError('Invalid token!', UNAUTHORIZED));

  await Promise.all([
    setTokenBlacklist(refreshToken, 'refresh'),
    setTokenBlacklist(accessToken, 'access')
  ]);
};

const createSendToken = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user.id);

  setTokenCookie(res, refreshToken);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, name, passwordConfirm } = req.body;
  const newUser = await User.create({ email, name, password, passwordConfirm });

  // const url = `${req.protocol}://${req.get('host')}/`;
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('You are missing email or password', BAD_REQUEST));

  const user = await User.findOne({ email }).select('+password -__v');

  if (!user)
    return next(new AppError('Incorrect email or password', UNAUTHORIZED));

  if (user.isLocked()) {
    return next(
      new AppError(
        'Account temporarily locked, please try again later',
        FORBIDDEN
      )
    );
  }

  if (!(await user.correctPassword(password, user.password))) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = Date.now() + LOCK_TIME;
    }
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Incorrect email or password', UNAUTHORIZED));
  }

  user.failedAttempts = 0;
  user.lockUntil = null;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  await invalidateTokens(req, next);
  res.clearCookie('token');

  res.status(200).json({
    status: 'success',
    message: 'Logout success'
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  // 1. Get user dựa trên email
  const user = await User.findOne({ email });
  if (!user)
    return next(new AppError('There is no user with email address', NOT_FOUND));

  // 2. Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send token to email
  try {
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v2/users/forgot-password/${resetToken}`;
    await new Email(user, resetUrl).sendResetPassword();

    res.status(200).json({
      status: 'success',
      message: 'Token send to email'
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        SERVER_ERROR
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;
  // 1. Get user bằng token
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() }
  });

  if (!user)
    return next(new AppError('Token invalid or has expired', BAD_REQUEST));

  // 2. Nếu có user và token còn hạn, update new password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // 3. Update passwordChangeAt(document middleware)
  // luôn sử dụng save() những thứ liên quan đến password, user để tất cả các trình validate có thể chạy
  await user.save();

  // 5. Tạo mới acc, refresh token và login
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;

  // 1. Get user từ db
  const user = await User.findById(req.user.id).select('+password');

  // 2. Kiểm tra mật khẩu hiện tại
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', UNAUTHORIZED));
  }

  // 3. Add access, refresh token hiện tại vào blacklist
  await invalidateTokens(req, next);

  // 4. Cập nhật mật khẩu & passwordChangedAt(document middleware)
  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 5. Tạo mới acccess, refresh token và login
  createSendToken(user, 200, res);
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { token: oldRefreshToken } = req.cookies;
  if (!oldRefreshToken) {
    return next(
      new AppError(
        'You are not logged in ! Please log in to access.',
        UNAUTHORIZED
      )
    );
  }

  await setTokenBlacklist(oldRefreshToken, 'refresh');
  const decoded = await verifyRefreshToken(oldRefreshToken);

  const { accessToken, refreshToken } = generateTokens(decoded.id);

  setTokenCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    token: accessToken
  });
});
/*
  ---- Redis ----
  .exec(); // Chạy tất cả các lệnh trong transaction
*/
