exports.PAGE_LIMIT = 10;
exports.BAD_REQUEST = 400;
exports.UNAUTHORIZED = 401; // Người dùng chưa đăng nhập, Token bị thiếu, hết hạn hoặc không hợp lệ
exports.FORBIDDEN = 403; //  Người dùng đã xác thực nhưng không có quyền truy cập
exports.NOT_FOUND = 404;
exports.SERVER_ERROR = 500;

exports.MAX_ATTEMPTS = 3; // Số lần nhập sai tối đa
exports.LOCK_TIME = 10 * 60 * 1000; // 10 phút
