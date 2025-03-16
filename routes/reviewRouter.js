const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// merge params với router cha(tourRouter) trong nested route
const router = express.Router({ mergeParams: true });

router.use(authMiddleware.authenticateJWT);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authMiddleware.restrictTo('user', 'admin'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authMiddleware.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authMiddleware.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
