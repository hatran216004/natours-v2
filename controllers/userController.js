const multer = require('multer');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { filterObj } = require('../utils/helpers');
const { BAD_REQUEST } = require('../utils/constants');
const { deleteOne, updateOne, getOne, getAll } = require('./handlerFactory');

// File handler
const multerStorage = multer.diskStorage({
  // Xác định thư mục lưu trữ file upload
  destination: (req, file, cb) => {
    cb(null, 'public/img/users'); // báo cho multer biết nơi lưu file
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  }
});

// Check file upload có phải là image hay không
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(
      new AppError('Not an image! Please upload only images', BAD_REQUEST),
      false
    );
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.getAllUsers = getAll(User);
exports.getUser = getOne(User);
exports.updateUser = updateOne(User);
exports.deleteUser = deleteOne(User);

exports.getMe = catchAsync(async (req, res, next) =>
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  })
);

exports.updateMe = catchAsync(async (req, res, next) => {
  console.log({ file: req.file });

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

exports.checkBodyPassword = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-my-password',
        BAD_REQUEST
      )
    );
  }
  next();
});
