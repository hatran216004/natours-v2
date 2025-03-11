const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// merge params với router cha(tourRouter) trong nested route
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authMiddleware.authenticateJWT,
    authMiddleware.restrictTo('user'),
    reviewController.createReview
  );

router.route('/:id').delete(reviewController.deleteReview);

module.exports = router;
