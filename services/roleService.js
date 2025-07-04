const Role = require('../models/roleModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

class RoleService {
  async assignPermissionToRole(roleId, permissionId) {
    return await Role.findByIdAndUpdate(
      roleId,
      { $addToSet: { permissions: permissionId } },
      {
        new: true
      }
    ).populate('permissions');
  }

  async removePermissionFromRole(roleId, permissionId) {
    return await Role.findByIdAndUpdate(
      roleId,
      { $pull: { permissions: permissionId } },
      { new: true }
    ).populate('permissions');
  }

  async deleteRoleSafely(roleId) {
    if (!roleId) throw new AppError('Role id not valid', 400);

    const userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      throw new AppError('Role user not found', 404);
    }
    await User.updateMany({ role: roleId }, { role: userRole.id });
    await Role.findByIdAndDelete(roleId);
  }
}

module.exports = new RoleService();
