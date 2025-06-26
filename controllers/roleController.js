const Role = require('../models/roleModel');
const { createOne, deleteOne, getAll } = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const roleService = require('../services/roleService');

exports.getAllRoles = getAll(Role);
exports.createRole = createOne(Role);
exports.deleteRole = deleteOne(Role);

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
