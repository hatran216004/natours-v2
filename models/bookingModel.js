const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  price: {
    type: Number,
    required: [true, 'Booking must have a pirce']
  },
  participants: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paymentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Booking must have a payment method'],
    enum: ['momo', 'credit_card', 'bank_transfer', 'cash']
  },
  paymentId: String,
  transactionId: String,
  refundDate: Date
});

bookingSchema.index({ tour: 1, user: 1 });
bookingSchema.index({ paymentId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.methods.calculateTourMaxGroupSize = (
  currParticipants,
  newParticipants
) => newParticipants - currParticipants;

bookingSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name email photo' }).populate({
    path: 'tour',
    select: 'name'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
