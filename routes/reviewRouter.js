const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('user'),
    reviewController.createReview
  );

module.exports = router;
