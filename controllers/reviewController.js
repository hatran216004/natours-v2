const Review = require('../models/reviewModel');
const reviewService = require('../services/reviewService');
const catchAsync = require('../utils/catchAsync');
const {
  deleteOne,
  createOne,
  updateOne,
  getAll,
  getOne
} = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  req.body.user = req.user.id;
  next();
};

exports.getAllReviewsOnTour = catchAsync(async (req, res, next) => {
  const { docs, totalDocuments, modelName } =
    await reviewService.getAllReviewsOnTour(req.params.tourId, req.query);

  res.status(200).json({
    status: 'success',
    data: {
      [modelName]: docs
    },
    pagination: { totalDocuments }
  });
});

exports.getAllReviews = getAll(Review);
exports.getReview = getOne(Review);
exports.createReview = createOne(Review);
exports.updateReview = updateOne(Review, ['rating', 'review']);
exports.deleteReview = deleteOne(Review);
