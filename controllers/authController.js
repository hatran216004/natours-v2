const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const client = require('../redisClient');
const { hashToken } = require('../utils/helpers');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require('../utils/jwt');
const {
  UNAUTHORIZED,
  BAD_REQUEST,
  NOT_FOUND,
  SERVER_ERROR,
  MAX_USER_REFRESH_TOKEN,
  FORBIDDEN,
  MAX_ATTEMPTS,
  LOCK_TIME
} = require('../utils/constants');

const setTokensToCookie = (res, { accessToken, refreshToken }) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: process.env.COOKIE_ACCESS_TOKEN_EXPIRES_IN * 60 * 60 * 1000 // convert sang miliseconds
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: process.env.COOKIE_REFRESH_TOKEN_EXPIRES_IN * 60 * 60 * 1000
  });
};

const createSendToken = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await client
    .multi()
    .sAdd(user.id, refreshToken)
    .expire(user.id, process.env.REDIS_REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60) // 30 days
    .exec();

  setTokensToCookie(res, { accessToken, refreshToken });

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

  const tokens = await client.sMembers(user.id);

  if (tokens.length > MAX_USER_REFRESH_TOKEN) {
    await client.sRem(user.id, tokens[0]);
  }

  user.failedAttempts = 0;
  user.lockUntil = null;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken, accessToken } = req.cookies;
  if (!refreshToken || !accessToken) {
    return next(new AppError('Invalid token!', BAD_REQUEST));
  }
  const decoded = await verifyRefreshToken(refreshToken);
  await client.sRem(decoded.id, refreshToken);

  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');

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

  // 4. Thu hồi tất cả refresh token (xóa hết trong Redis)
  await client.del(user.id);

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

  // 3. Cập nhật mật khẩu & passwordChangedAt(document middleware)
  user.password = newPassword;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 4. Thu hồi tất cả refresh token (xóa hết trong Redis)
  await client.del(user.id);

  // 5. Tạo mới acccess, refresh token và login
  createSendToken(user, 200, res);
});

// --- REFRESH TOKEN HANDLER ---
const handleTokenRefresh = async (oldRefreshToken) => {
  const { id: userId } = await verifyRefreshToken(oldRefreshToken);
  const newAccessToken = signAccessToken(userId);
  const newRefreshToken = signRefreshToken(userId);

  return { userId, newAccessToken, newRefreshToken };
};

const handleRedisOperations = async (
  userId,
  oldRefreshToken,
  newRefreshToken
) => {
  const [isValidRefreshToken] = await client
    .multi()
    .sIsMember(userId, oldRefreshToken) // check oldRefreshToken hợp lệ
    .sRem(userId, oldRefreshToken) // nếu hợp lệ thì xóa
    .sAdd(userId, newRefreshToken) // thêm token mới
    .expire(userId, process.env.REDIS_REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60)
    .exec();

  if (!isValidRefreshToken)
    throw new AppError('Invalid refresh token', UNAUTHORIZED);
};

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken: oldRefreshToken } = req.cookies;
  if (!oldRefreshToken) {
    return next(
      new AppError(
        'You are not logged in ! Please log in to access.',
        UNAUTHORIZED
      )
    );
  }

  const { userId, newAccessToken, newRefreshToken } =
    await handleTokenRefresh(oldRefreshToken);

  await handleRedisOperations(userId, oldRefreshToken, newRefreshToken);

  setTokensToCookie(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  });

  res.status(200).json({
    status: 'success',
    token: newAccessToken
  });
});
// ---- END REFRESH TOKEN ----

/*
  ---- Redis ----
  .exec(); // Chạy tất cả các lệnh trong transaction
*/
