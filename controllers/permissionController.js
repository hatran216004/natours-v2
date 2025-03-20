const { createOne, deleteOne, getAll } = require('./handlerFactory');
const Permission = require('../models/permissionModel');

exports.getAllPermissions = getAll(Permission);
exports.createPermission = createOne(Permission);
exports.deletePermission = deleteOne(Permission);
