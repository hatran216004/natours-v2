const User = require('../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const client = require('../redisClient');

const { hashToken } = require('../utils/helpers');
const {
  verifyRefreshToken,
  setTokenBlacklist,
  generateTokens
} = require('../utils/jwt');

const {
  UNAUTHORIZED,
  FORBIDDEN,
  MAX_ATTEMPTS,
  LOCK_TIME,
  NOT_FOUND,
  SERVER_ERROR,
  BAD_REQUEST
} = require('../utils/constants');

class AuthService {
  async signup(data, url) {
    const { email, password, name, passwordConfirm } = data;
    let newUser = await User.create({ email, name, password, passwordConfirm });
    newUser = await newUser.populate({ path: 'role', select: 'name' });

    await new Email(newUser, url).sendWelcome();

    return newUser;
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select(
      '+password -__v +failedAttempts +lockUntil'
    );

    if (!user) throw new AppError('Incorrect email or password', UNAUTHORIZED);

    if (user.isLocked()) {
      throw new AppError(
        'Account temporarily locked, please try again later',
        FORBIDDEN
      );
    }

    if (!(await user.correctPassword(password, user.password))) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_TIME;
      }
      await user.save({ validateBeforeSave: false });
      throw new AppError('Incorrect email or password', UNAUTHORIZED);
    }

    user.failedAttempts = 0;
    user.lockUntil = null;
    await user.save({ validateBeforeSave: false });

    return user;
  }

  async forgotPassword(email) {
    // 1. Get user dựa trên email
    const user = await User.findOne({ email });
    if (!user)
      throw new AppError('There is no user with email address', NOT_FOUND);

    // 2. Generate random reset token
    const resetToken = user.createPasswordResetToken();

    // const resetUrl = `${req.protocol}://${req.get('host')}/api/v2/users/forgot-password/${resetToken}`;
    const resetUrl = `${process.env.CLIENT_URL}/forgot-password/${resetToken}`;
    await user.save({ validateBeforeSave: false });

    try {
      await new Email(user, resetUrl).sendResetPassword();
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new AppError(
        'There was an error sending the email. Try again later!',
        SERVER_ERROR
      );
    }
  }

  async resetPassword(token, password, passwordConfirm) {
    // 1. Get user bằng token
    const hashedToken = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gte: Date.now() }
    });

    if (!user) throw new AppError('Token invalid or has expired', BAD_REQUEST);

    // 2. Nếu có user và token còn hạn, update new password
    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedAttempts = 0;
    user.lockUntil = null;
    // 3. Update passwordChangeAt(document middleware)
    // luôn sử dụng save() những thứ liên quan đến password, user để tất cả các trình validate có thể chạy
    await user.save();

    return user;
  }

  async updatePassword(userId, currentPassword, newPassword, passwordConfirm) {
    // 1. Get user từ db
    const user = await User.findById(userId).select('+password');

    // 2. Kiểm tra mật khẩu hiện tại
    if (!(await user.correctPassword(currentPassword, user.password))) {
      throw new AppError('Your current password is wrong', UNAUTHORIZED);
    }

    // 3. Cập nhật mật khẩu & passwordChangedAt(document middleware)
    user.password = newPassword;
    user.passwordConfirm = passwordConfirm;
    await user.save();

    return user;
  }

  async refreshToken(oldRefreshToken) {
    const decoded = await verifyRefreshToken(oldRefreshToken);
    const isBlacklisted = await client.get(
      `bl_refresh_${decoded.id}_${decoded.jti}`
    );
    if (isBlacklisted) {
      throw new AppError('Token revoked', UNAUTHORIZED);
    }

    await setTokenBlacklist(oldRefreshToken, 'refresh');
    const { accessToken, refreshToken } = generateTokens(decoded.id);

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
