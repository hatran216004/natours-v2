const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

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

module.exports = router;
