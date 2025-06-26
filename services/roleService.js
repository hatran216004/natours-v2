const Role = require('../models/roleModel');

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
}

module.exports = new RoleService();
