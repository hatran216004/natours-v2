const Role = require('../models/roleModel');
const { createOne, deleteOne, getAll } = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.getAllRoles = getAll(Role);
exports.createRole = createOne(Role);
exports.deleteRole = deleteOne(Role);

exports.assignPermissionToRole = catchAsync(async (req, res, next) => {
  const { roleId, permissionId } = req.params;

  const role = await Role.findByIdAndUpdate(
    roleId,
    { $addToSet: { permissions: permissionId } },
    {
      new: true
    }
  ).populate('permissions');

  res.status(200).json({
    status: 'success',
    data: {
      role
    }
  });
});

exports.removePermissionFromRole = catchAsync(async (req, res, next) => {
  const { roleId, permissionId } = req.params;

  const role = await Role.findByIdAndUpdate(
    roleId,
    { $pull: { permissions: permissionId } },
    { new: true }
  ).populate('permissions');

  res.status(200).json({
    status: 'success',
    data: {
      role
    }
  });
});
