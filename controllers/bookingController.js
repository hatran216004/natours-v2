const crypto = require('crypto');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const axios = require('../config/axios');
const { NOT_FOUND } = require('../utils/constants');
const catchAsync = require('../utils/catchAsync');

const createSignature = (rawSignature) =>
  crypto
    .createHmac('sha256', process.env.MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest('hex');

exports.checkoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('Tour not found', NOT_FOUND));

  const orderInfo = 'pay with MoMo';
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const redirectUrl = `${process.env.FRONTEND_URL}/api/v2/bookings/confirmation`;

  let ipnUrl = `${req.protocol}://${req.get('host')}/api/v2/bookings/callback`;
  if (process.env.NODE_ENV === 'development') {
    ipnUrl =
      'https://51e1-14-191-93-139.ngrok-free.app/api/v2/bookings/callback';
  }

  const requestType = 'payWithMethod';
  const price = tour.priceDiscount
    ? tour.price - tour.priceDiscount
    : tour.price;
  const amount = `${price * 100}`;
  const orderId = `${partnerCode}_${Date.now()}_${req.user.id}`;
  const requestId = orderId;

  const bookingData = {
    tour: tour.id,
    user: req.user.id
  };

  const extraData = Buffer.from(JSON.stringify(bookingData)).toString('base64');
  const orderExpireTime = 15;
  const autoCapture = true;
  const lang = 'vi';

  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  //puts raw signature

  const signature = createSignature(rawSignature);

  //json object send to MoMo endpoint
  const requestBody = JSON.stringify({
    partnerCode,
    partnerName: 'Tour Booking',
    storeId: 'TourBookingStore',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    orderGroupId: '',
    signature,
    orderExpireTime
  });
  const result = await axios.post('/api/create', requestBody, {
    headers: {
      'Content-Length': Buffer.byteLength(requestBody)
    }
  });

  await Booking.create({
    ...bookingData,
    price: amount,
    paymentMethod: 'momo',
    paymentId: orderId
  });

  res.status(200).json({
    status: 'success',
    data: { payUrl: result.data.payUrl, orderId, amount, orderInfo }
  });
});

exports.momoCallBack = catchAsync(async (req, res, next) => {
  const { orderId, transId, resultCode, message } = req.body;

  let booking;
  if (resultCode === 0) {
    booking = await Booking.findOne({
      paymentId: orderId,
      status: 'pending'
    });
    booking.transactionId = transId;
    booking.status = 'confirmed';
    booking.paymentDate = new Date();
    await booking.save();
  } else {
    booking = await Booking.findOneAndUpdate(
      { paymentId: orderId },
      { status: 'failed' },
      {
        new: true
      }
    );
  }

  // update order
  res.status(200).json({
    status: 'success',
    message,
    data: {
      booking
    }
  });
});

exports.transactionStatus = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;
  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
  const signature = createSignature(rawSignature);

  const requestBody = {
    partnerCode: 'MOMO',
    requestId: orderId,
    orderId,
    signature,
    lang: 'vi'
  };

  const result = await axios('/api/query', requestBody);
  res.status(200).json({
    status: 'success',
    data: {
      data: result.data
    }
  });
});

exports.getPaymentHistory = catchAsync(async (req, res, next) => {});
exports.retryPayment = catchAsync(async (req, res, next) => {});
exports.cancelBooking = catchAsync(async (req, res, next) => {});

// 0701234567
