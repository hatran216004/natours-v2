const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/me',
  authMiddleware.authenticateJWT,
  bookingController.getUserBookings
);

router.post(
  '/payment/:tourId',
  authMiddleware.authenticateJWT,
  bookingController.checkoutSession
);
router.post('/callback', bookingController.momoCallBack);
router.post(
  '/transaction-status',
  authMiddleware.authenticateJWT,
  bookingController.transactionStatus
);

router
  .route('/:id')
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

// Admin
router
  .route('/')
  .get(
    authMiddleware.checkPermission('manage_bookings'),
    bookingController.getAllBookings
  );

module.exports = router;
