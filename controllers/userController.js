const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { filterObj } = require('../utils/helpers');
const { BAD_REQUEST } = require('../utils/constants');
const {
  deleteOne,
  getOne,
  getAll,
  createOne,
  updateOne
} = require('./handlerFactory');
const { upload } = require('../middleware/fileUploadMiddleware');
const Role = require('../models/roleModel');
const imageService = require('../services/imageService');
const userService = require('../services/userService');

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const result = await imageService.resizeAndUploadUserPhoto(
    req.file.buffer,
    req.file.fieldname
  );

  req.file.fieldname = result.display_name;
  next();
});

exports.getAllUsers = getAll(User);
exports.getUser = getOne(User);
exports.createUser = createOne(User);
exports.updateUser = updateOne(User);
exports.deleteUser = deleteOne(User);

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
  if (!key) {
    res.status(200).json({
      status: 'success',
      data: {
        users: []
      }
    });
  }

  const users = await userService.search(key);

  res.status(200).json({
    status: 'success',
    data: {
      users
    }
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
  if (req.file) filteredBody.photo = req.file.fieldname;
  const user = await userService.updateCurrentUser(req.user.id, filteredBody);
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await userService.deleteCurrentUser(req.user.id);

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
