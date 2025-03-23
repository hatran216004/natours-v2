const multer = require('multer');
const { BAD_REQUEST } = require('../utils/constants');
const AppError = require('../utils/appError');

// File handler
// const multerStorage = multer.diskStorage({
//   // Xác định thư mục lưu trữ file upload
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users'); // Lưu file vào thư mục cụ thể trên ổ đĩa
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage();

// Check file upload có phải là image hay không
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(
      new AppError('Not an image! Please upload only images', BAD_REQUEST),
      false
    );
};

exports.upload = multer({ storage: multerStorage, fileFilter: multerFilter });
