const Role = require('../models/roleModel');
const { createOne, getAll, updateOne } = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const roleService = require('../services/roleService');

exports.getAllRoles = getAll(Role);
exports.createRole = createOne(Role);
exports.updateRole = updateOne(Role);

exports.deleteRole = catchAsync(async (req, res, next) => {
  await roleService.deleteRoleSafely(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.assignPermissionToRole = catchAsync(async (req, res, next) => {
  const { roleId, permissionId } = req.params;

  const role = await roleService.assignPermissionToRole(roleId, permissionId);

  res.status(200).json({
    status: 'success',
    data: {
      role
    }
  });
});

exports.removePermissionFromRole = catchAsync(async (req, res, next) => {
  const { roleId, permissionId } = req.params;

  const role = await roleService.removePermissionFromRole(roleId, permissionId);

  res.status(200).json({
    status: 'success',
    data: {
      role
    }
  });
});
