const { createOne, getAll, updateOne } = require('./handlerFactory');
const Permission = require('../models/permissionModel');
const catchAsync = require('../utils/catchAsync');
const permissionService = require('../services/permissionService');

exports.getAllPermissions = getAll(Permission);
exports.createPermission = createOne(Permission);
exports.updatePermission = updateOne(Permission);

exports.getAllForRole = catchAsync(async (req, res, next) => {
  const permissions = await permissionService.getAll();

  res.status(200).json({
    status: 'success',
    data: {
      permissions
    }
  });
});

exports.deletePermission = catchAsync(async (req, res, next) => {
  await permissionService.deleteOne(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});
