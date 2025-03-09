const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next); // Sẽ chuyển lỗi vào next() để xử lý bởi Global Error Handling
};

module.exports = catchAsync;
