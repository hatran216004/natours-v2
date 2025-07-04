const Booking = require('../models/bookingModel');
const { getAll, deleteOne, getOne } = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const bookingService = require('../services/bookingService');

exports.getUserBookings = getAll(Booking);
exports.getAllBookings = getAll(Booking);
exports.deleteBooking = deleteOne(Booking);
exports.getBooking = getOne(Booking);

exports.createCheckout = catchAsync(async (req, res, next) => {
  const { sepayQRUrl, orderCode, amount } = await bookingService.createCheckout(
    req.body,
    req.user.id
  );

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        qr_code_url: sepayQRUrl,
        bank_account: process.env.SEPAY_BANK_ACCOUNT_NUMBER,
        bank_name: process.env.SEPAY_BANK_NAME,
        amount,
        order_code: orderCode
      }
    }
  });
});

// transferType: 'in' | 'out'
exports.sepayWebhook = catchAsync(async (req, res, next) => {
  const transaction = await bookingService.sepayWebhook(req.body);

  res.status(200).json({
    status: 'succes',
    data: {
      transaction
    }
  });
});

exports.updateBooking = catchAsync(async (req, res, next) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body);

  res.status(200).json({
    status: 'succes',
    data: {
      booking
    }
  });
});

exports.refundPayment = catchAsync(async (req, res, next) => {});

exports.getBookingStatus = catchAsync(async (req, res, next) => {
  const stats = await bookingService.getBookingStatus();

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyRevenue = catchAsync(async (req, res, next) => {
  const data = await bookingService.getMonthlyRevenue();
  res.status(200).json({
    status: 'success',
    data: { data }
  });
});

exports.getStatusRatio = catchAsync(async (req, res, next) => {
  const data = await bookingService.getStatusRatio();
  res.status(200).json({
    status: 'success',
    data: { data }
  });
});

exports.getTopBooked = catchAsync(async (req, res, next) => {
  const data = await bookingService.getTopBooked(+req.query.limit || 3);
  res.status(200).json({
    status: 'success',
    data: { data }
  });
});
