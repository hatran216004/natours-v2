const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware.authenticateJWT);

router.get('/me', bookingController.getUserBookings);

router.post('/payment/:tourId', bookingController.checkoutSession);
router.post('/callback', bookingController.momoCallBack);
router.post('/transaction-status', bookingController.transactionStatus);
router.post('/refund/:id', bookingController.refundPayment);
router.post('/cancel/:id', bookingController.cancelBooking);

// Admin & user
router.use(authMiddleware.checkPermission('manage_bookings'));
router.get('/', bookingController.getAllBookings);
router
  .route('/:id')
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
