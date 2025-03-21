const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
      maxLength: [1000, 'A review must have less or equals than 40 charactors']
    },
    rating: {
      type: Number,
      required: [true, 'Rating can not be empty'],
      min: [1, 'A rating must be above 1.0'],
      max: [5, 'A rating must be below 5.0']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ rating: 1 });

reviewSchema.pre(/^find/, function (next) {
  // console.log('review query middleware');
  // this.populate('user', 'name photo').populate({
  //   path: 'tour',
  //   select: 'name'
  // });
  this.populate('user', 'name photo');
  next();
});

// statics method có sẵn trên model, this trỏ đến model
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: {
        tour: tourId
      }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0
    });
  }
};

// this bên trong callback function sẽ trỏ đến document
reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate/Delte là findOnedAndUpdate/Delte behind the scence
reviewSchema.post(/^findOneAnd/, async function (doc) {
  await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;

/*
  Trường tour, user trong Review hoạt động giống như khóa ngoại tham chiếu đến model Tour, User
*/
