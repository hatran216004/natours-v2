const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const Booking = require('../models/bookingModel');

const router = express.Router({ mergeParams: true });

router.post('/sepay-webhook', bookingController.sepayWebhook);

router.use(authMiddleware.authenticateJWT);

router.get('/me', bookingController.getUserBookings);

router.post('/checkout', bookingController.createCheckout);

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

router.get(
  '/status-ratio',
  authMiddleware.checkPermission('manage_bookings'),
  bookingController.getStatusRatio
);
router.get(
  '/top-booked',
  authMiddleware.checkPermission('manage_bookings'),
  bookingController.getTopBooked
);

router.get(
  '/monthly-revenue',
  authMiddleware.checkPermission('manage_bookings'),
  bookingController.getMonthlyRevenue
);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(
    authMiddleware.checkPermission('manage_bookings'),
    bookingController.deleteBooking
  );

module.exports = router;
