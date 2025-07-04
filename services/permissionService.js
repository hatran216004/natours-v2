const Permission = require('../models/permissionModel');
const AppError = require('../utils/appError');

class PermissionService {
  async getAll() {
    const permissions = await Permission.find();
    if (!permissions) throw new AppError('Permissions not found', 400);
    return permissions;
  }

  async deleteOne(id) {
    await Permission.findByIdAndDelete(id);
  }
}

module.exports = new PermissionService();
