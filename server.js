const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const mongoose = require('mongoose');
const { server } = require('./app');
require('./redisClient');

// Xử lý lỗi đồng bộ (trong ứng dụng chưa được xử lý)
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION 🥱, SHUTTING DOW...');
  process.exit(1);
});

const DB = `${process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)}`;
mongoose.connect(DB).then(() => console.log('Connected!'));

const httpServer = server.listen(process.env.PORT, () => {
  console.log(`server running on port ${process.env.PORT}`);
});

// Xử lý lỗi không đồng bộ (promise bị reject trong ứng dụng chưa được xử lý)
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION, SHUTTING DOW...');
  // Hoàn thành tất cả các request đang thực hiện và đang đợi xog mới exit
  httpServer.close(() => {
    process.exit(1); // 1: Ngoại lệ chưa được phát hiện
  });
});

// __dirname: cung cấp đường dẫn tuyệt đối đến thư mục chứa file JavaScript đang thực thi
// ngrok http http://localhost:3000
