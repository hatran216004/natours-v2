const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const Booking = require('../models/bookingModel');

const router = express.Router();

router.post('/callback', bookingController.momoCallBack);

router.use(authMiddleware.authenticateJWT);

router.get('/me', bookingController.getUserBookings);

router.post('/payment/:tourId', bookingController.checkoutSession);
router.post('/transaction-status', bookingController.transactionStatus);
router.post(
  '/refund/:id',
  authMiddleware.checkIsUser(Booking),
  bookingController.refundPayment
);

// Admin & lead-guide
router.get(
  '/',
  authMiddleware.checkPermission('manage_bookings'),
  bookingController.getAllBookings
);
router.get('/status', bookingController.getBookingStatus);
router
  .route('/:id')
  .patch(bookingController.updateBooking)
  .delete(
    authMiddleware.checkPermission('manage_bookings'),
    bookingController.deleteBooking
  );

module.exports = router;
