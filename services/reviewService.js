const Review = require('../models/reviewModel');
const ApiFeatures = require('../utils/apiFeatures');

class ReviewService {
  async getAllReviewsOnTour(tourId, query) {
    const features = new ApiFeatures(Review.find({ tour: tourId }), query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Excute
    const [docs, totalDocuments] = await Promise.all([
      features.query,
      Review.countDocuments()
    ]);

    const modelName = Review.modelName.toLowerCase();

    return { docs, totalDocuments, modelName };
  }
}

module.exports = new ReviewService();
