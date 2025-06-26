const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking must belong a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong a user']
    },
    amount: {
      type: Number,
      required: [true, 'Booking must have a price']
    },
    participants: {
      type: Number,
      default: 1
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Cancelled', 'Refunded'],
      default: 'Unpaid'
    },
    paymentMethod: {
      type: String,
      required: [true, 'Booking must have a payment method'],
      enum: ['sepay'],
      default: 'sepay'
    },
    refundDate: Date,
    refundAmount: {
      type: Number,
      min: 0,
      validate: {
        validator: function (val) {
          return val <= this.total;
        },
        message: 'Refund amount cannot exceed total paid'
      }
    },
    refundReason: String,
    orderCode: {
      type: String,
      required: [true, 'A Booking must have a orderCode']
    },
    specialRequirements: {
      type: String,
      trim: true
    },
    paymentTime: Date,
    startDate: {
      type: Date,
      required: [true, 'Booking must have a start date']
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index({ tour: 1, user: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name email photo' }).populate({
    path: 'tour',
    select: 'name duration imageCover difficulty price'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
