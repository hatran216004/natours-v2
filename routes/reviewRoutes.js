const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');
const Review = require('../models/reviewModel');

// merge params với router cha(tourRouter) trong nested route
const router = express.Router({ mergeParams: true });

router.use(authMiddleware.authenticateJWT);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authMiddleware.checkPermission('create_review'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authMiddleware.checkIsUser(Review),
    authMiddleware.checkPermission('update_review'),
    reviewController.updateReview
  )
  .delete(
    authMiddleware.checkPermission('delete_review'),
    reviewController.deleteReview
  );

module.exports = router;
