const User = require('../models/userModel');
const AppError = require('../utils/appError');

class UserService {
  async updateUserStatus(userId, status) {
    try {
      await User.findByIdAndUpdate(userId, { status });
    } catch (error) {
      throw new AppError(`Update user status error ${error}`, 500);
    }
  }
}

module.exports = new UserService();
