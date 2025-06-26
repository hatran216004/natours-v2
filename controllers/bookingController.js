const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const { getAll, deleteOne, getOne } = require('./handlerFactory');
const { NOT_FOUND } = require('../utils/constants');
const catchAsync = require('../utils/catchAsync');
const Transaction = require('../models/transactionModel');

// const SEPAY_CONFIG = {
//   QR_URL: process.env.SEPAY_QR_URL,
//   BASE_URL: process.env.SEPAY_BASE_URL,
//   TOKEN: process.env.SEPAY_TOKEN,
//   BANK_CODE: process.env.SEPAY_BANK_NAME,
//   ACCOUNT_NUMBER: process.env.SEPAY_BANK_ACCOUNT_NUMBER
// };

const extractOrderCode = (content) => {
  const match = content.match(/DH\w+/);
  return match ? match[0] : null;
};

const generateOrderCode = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DH${Date.now()}${rand}`;
};

exports.createCheckout = catchAsync(async (req, res, next) => {
  const { participants, specialRequirements, startDate, tourId } = req.body;
  const tour = await Tour.findById(tourId);
  if (!tour) return next(new AppError('Tour not found', NOT_FOUND));

  const amount = tour.price * participants || 1;

  const { SEPAY_QR_URL, SEPAY_BANK_NAME, SEPAY_BANK_ACCOUNT_NUMBER } =
    process.env;

  const orderCode = generateOrderCode();
  const sepayQRUrl = `${SEPAY_QR_URL}?acc=${SEPAY_BANK_ACCOUNT_NUMBER}&bank=${SEPAY_BANK_NAME}&amount=${amount}&des=${orderCode}`;

  await Booking.create({
    tour: tourId,
    user: req.user.id,
    amount,
    participants,
    specialRequirements,
    startDate,
    orderCode
  });

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        qr_code_url: sepayQRUrl,
        bank_account: SEPAY_BANK_ACCOUNT_NUMBER,
        bank_name: SEPAY_BANK_NAME,
        amount,
        order_code: orderCode
      }
    }
  });
});

const updateBookingPaid = async (booking) => {
  const tour = await Tour.findById(booking.tour);

  if (!tour) throw new AppError(`Tour not found with id: ${booking.tour}`, 200);

  const dateSelected = tour.startDates.find(
    (d) => d.date.getTime() === booking.startDate.getTime()
  );
  dateSelected.participants += booking.participants;
  dateSelected.soldOut = dateSelected.participants >= tour.maxGroupSize;
  booking.paymentStatus = 'Paid';
  booking.paymentTime = Date.now();

  await Promise.all([tour.save(), booking.save()]);
};

// transferType: 'in' | 'out'
exports.sepayWebhook = catchAsync(async (req, res, next) => {
  const {
    gateway,
    transactionDate,
    accountNumber,
    code,
    content,
    transferAmount,
    accumulated,
    description
  } = req.body;

  try {
    // BƯỚC 1: Tạo transaction
    const transaction = await Transaction.create({
      accountNumber,
      gateway,
      transactionDate,
      amountIn: transferAmount,
      accumulated,
      orderCode: code,
      transactionContent: content || description
    });

    // BƯỚC 2: Tìm order_code trong nội dung chuyển khoản
    const orderCode = extractOrderCode(code || content);
    if (!orderCode) {
      return next(
        new AppError(
          `Transaction saved but no order code found ${transaction.id}`,
          200
        )
      );
    }

    // BƯỚC 3: Tìm booking theo order_code
    const booking = await Booking.findOne({ orderCode: code });
    if (!booking) {
      return next(
        new AppError(
          `Transaction saved but booking not found ${transaction.id}`,
          200
        )
      );
    }
    // BƯỚC 4: Kiểm tra booking đã được thanh toán chưa (tránh duplicate)
    if (booking.paymentStatus === 'Paid') {
      return next(
        new AppError(
          `Transaction saved but booking already paid ${booking.id}`,
          200
        )
      );
    }

    // BƯỚC 5: Kiểm tra số tiền có khớp không
    if (transferAmount !== booking.amount) {
      await Transaction.findByIdAndUpdate(transaction.id, {
        note: `Amount mismatch - Expected: ${booking.amount}, Received: ${transferAmount}`
      });
    }

    // BƯỚC 6: Cập nhật booking thành đã thanh toán
    await updateBookingPaid(booking);

    res.status(200).json({
      status: 'succes',
      data: {
        transaction
      }
    });
  } catch (error) {
    return next(error);
  }
});

exports.updateBooking = catchAsync(async (req, res, next) => {
  // 1. Find booking
  const oldBooking = await Booking.findById(req.params.id);
  if (!oldBooking) return next(new AppError('Booking not found', NOT_FOUND));

  // 2.Update booking
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // 3. Update tour participants
  const tour = await Tour.findById(booking.tour);
  const dateSelected = tour.startDates.find(
    (d) => d.date.getTime() === booking.startDate.getTime()
  );
  const diff = req.body.participants - oldBooking.participants;
  dateSelected.participants += diff;

  dateSelected.soldOut = dateSelected.participants >= tour.maxGroupSize;

  // 4. Update booking price
  booking.price = booking.participants * tour.price;
  await booking.save();
  await tour.save();

  res.status(200).json({
    status: 'succes',
    data: {
      booking
    }
  });
});

exports.refundPayment = catchAsync(async (req, res, next) => {
  // const { refundAmount, refundReason } = req.body;
  // const { id } = req.params;
  // const booking = await Booking.findById(id);
  // if (!booking)
  //   return next(new AppError('No booking found for refund!', NOT_FOUND));
  // if (booking.status !== 'confirmed') {
  //   return next(
  //     new AppError('Only confirmed bookings can be refund', BAD_REQUEST)
  //   );
  // }
  // res.status(200).json({
  //   status: 'success',
  //   data: {
  //     data: {}
  //   }
  // });
});

exports.getBookingStatus = catchAsync(async (req, res, next) => {
  const stats = await Booking.aggregate([
    {
      $group: {
        _id: '$status',
        nums: { $sum: 1 }
      }
    },
    {
      $addFields: {
        status: '$_id'
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getUserBookings = getAll(Booking);
exports.getAllBookings = getAll(Booking);
exports.deleteBooking = deleteOne(Booking);
exports.getBooking = getOne(Booking);
