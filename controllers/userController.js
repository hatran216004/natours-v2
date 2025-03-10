const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { filterObj } = require('../utils/helpers');
const { BAD_REQUEST } = require('../utils/constants');

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    result: users.length,
    data: {
      users
    }
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-my-password',
        BAD_REQUEST
      )
    );
  }

  const filteredBody = filterObj(req.body, 'name', 'email');
  const user = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'fail',
    message: 'The route not yet defined '
  });
};
exports.createUser = (req, res) => {
  const newUser = User.create(req.body);

  res.status(500).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'fail',
    message: 'The route not yet defined '
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'fail',
    message: 'The route not yet defined '
  });
};
