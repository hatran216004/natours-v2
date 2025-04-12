const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { filterObj } = require('../utils/helpers');
const { BAD_REQUEST, NOT_FOUND } = require('../utils/constants');
const { deleteOne, getOne, getAll, createOne } = require('./handlerFactory');
const { upload } = require('../middleware/fileUploadMiddleware');
const Role = require('../models/roleModel');

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = getAll(User);
exports.getUser = getOne(User);
exports.createUser = createOne(User);
exports.deleteUser = deleteOne(User);

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  });

  if (!user) return next(new AppError('No user found with that ID', NOT_FOUND));

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.getAllGuides = catchAsync(async (req, res, next) => {
  const role = await Role.find({ name: { $in: ['guide', 'lead-guide'] } });

  if (!role) return next(new AppError('No doucuments found', 404));

  const roleIds = role.map((r) => r.id);

  const guides = await User.find({ role: { $in: roleIds } });

  if (!guides) return next(new AppError('No doucuments found', 404));

  res.status(200).json({
    status: 'success',
    result: guides.length,
    data: {
      guides
    }
  });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { key } = req.params;
  const { page = 1, limit = 6 } = req.query;

  // Điều kiện tìm kiếm
  const filter = {
    $or: [
      { name: { $regex: key, $options: 'i' } }, // $options: 'i': không phân biệt chữ hoa chữ thường
      { email: { $regex: key, $options: 'i' } }
    ]
  };
  const skip = (page - 1) * parseInt(limit, 10);

  const [users, totalDocuments] = await Promise.all([
    User.find(filter).skip(skip).limit(parseInt(limit, 10)),
    User.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalDocuments / limit);

  res.status(200).json({
    status: 'success',
    data: {
      users
    },
    pagination: { total: totalDocuments, totalPages }
  });
});

exports.getMe = catchAsync(async (req, res, next) =>
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  })
);

exports.updateMe = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

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
