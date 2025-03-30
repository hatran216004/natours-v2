const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { hashToken } = require('../utils/helpers');
const Role = require('./roleModel');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name']
  },
  email: {
    type: String,
    required: [true, 'Please enter tour email address'],
    unique: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please enter a valid email'
    }
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [8, 'Password need at least 8 characters'],
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please enter confirm password'],
    validate: {
      validator: function (val) {
        return val === this.password; // this chỉ chạy trên .save() và .create()
      },
      message: 'Password and confirm password does not match'
    }
  },
  role: {
    type: mongoose.Schema.ObjectId,
    ref: 'Role'
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true
  },
  failedAttempts: {
    // Số lần đăng nhập thất bại
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date, // Thời gian bị khóa tài khoản
    default: null,
    select: false
  }
});

// MIDDLEWARE
userSchema.pre('save', async function (next) {
  // Nếu password k thay đổi thì k cần hash (update email, name,...)
  if (!this.isModified('password')) return next();

  // bcrypt.hash: phiên bản bất đồng bộ để k chặn event loop
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  // Nếu password k thay đổi hoặc khi tạo mới doc
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; // -1s để tránh trường hợp jwt được phát hành trước khi passwordChangedAt đc lưu vào db
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.role) {
    const userRole = await Role.findOne({ name: 'user' });
    this.role = userRole.id;
  }
  next();
});

userSchema.pre(/^find/, function (next) {
  this.select('-__v').populate({ path: 'role', select: '-__v -permissions' });
  next();
});

// METHODS
// method có trên tất cả document trong collection (instance method)
userSchema.methods.correctPassword = async function (
  candidatePassword, // password nhận từ req.boy (original password)
  userPassword // hashedPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // JWTTimestamp: thời gian phát hành token (decoded.iat)
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    ); // convert sang giây vì JWTTimestamp tính bằng giây
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

// Tạo token để đặt lại password: reset token hoạt động như password
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // tạo reset token
  // băm reset token và lưu vào db
  this.passwordResetToken = hashToken(resetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

const User = mongoose.model('User', userSchema);
module.exports = User;

/**
 * role: {
    type: String,
    enum: {
      values: ['admin', 'user', 'guide', 'lead-guide'],
      message: 'Role is either: admin, user, guides, lead-guide'
    },
    default: 'user'
  }
 * 
 */
