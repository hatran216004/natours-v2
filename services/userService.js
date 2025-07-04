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

  async search(key) {
    // Điều kiện tìm kiếm
    const filter = {
      $or: [
        { name: { $regex: key, $options: 'i' } }, // $options: 'i': không phân biệt chữ hoa chữ thường
        { email: { $regex: key, $options: 'i' } }
      ]
    };
    const users = await User.find(filter);

    return users;
  }

  async updateCurrentUser(userId, body) {
    const user = await User.findByIdAndUpdate(userId, body, {
      new: true,
      runValidators: true
    });

    return user;
  }

  async deleteCurrentUser(userId) {
    await User.findByIdAndUpdate(userId, { active: false });
  }
}

module.exports = new UserService();
