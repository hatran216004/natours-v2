const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { generateTokens, setTokenBlacklist } = require('../utils/jwt');
const { UNAUTHORIZED, BAD_REQUEST } = require('../utils/constants');
const authService = require('../services/authService');

const setTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: process.env.COOKIE_REFRESH_TOKEN_EXPIRES_IN * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
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
  user.failedAttempts = undefined;
  user.lockUntil = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const url = `${req.protocol}://${req.get('host')}/`;
  const newUser = await authService.signup(req.body, url);

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('You are missing email or password', BAD_REQUEST));

  const user = await authService.login(email, password);
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
  await authService.forgotPassword(email);

  res.status(200).json({
    status: 'success',
    message: 'Token send to email'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  const user = await authService.resetPassword(
    token,
    password,
    passwordConfirm
  );

  // Tạo mới acc, refresh token và login
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;

  const user = await authService.updatePassword(
    req.user.id,
    currentPassword,
    newPassword,
    passwordConfirm
  );
  // 4.Add access, refresh token hiện tại vào blacklist
  await invalidateTokens(req, next);

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

  const { accessToken, refreshToken } =
    await authService.refreshToken(oldRefreshToken);
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
