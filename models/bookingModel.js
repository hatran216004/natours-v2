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
    price: {
      type: Number,
      required: [true, 'Booking must have a price']
    },
    participants: {
      type: Number,
      default: 1
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
      enum: ['momo', 'credit_card']
    },
    paymentId: String,
    transactionId: String,
    refundDate: Date,
    refundAmount: Number,
    refundReason: String,
    // Yêu cầu từ khách hàng (phòng riêng, ghế trẻ em...)
    specialRequirements: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Booking must have a start date']
    }
  },
  {
    timestamps: true // tự thêm createdAt và updatedAt
  }
);

bookingSchema.index({ tour: 1, user: 1 });
bookingSchema.index({ paymentId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.methods.updateTourParticipants = async function (
  participantsUpdated,
  tour,
  startDate,
  type
) {
  const dateSelected = tour.startDates.find(
    (d) => d.date.getTime() === startDate.getTime()
  );
  if (type === 'create') dateSelected.participants += participantsUpdated;
  else {
    dateSelected.participants -= participantsUpdated;
  }

  if (dateSelected.participants >= tour.maxGroupSize)
    dateSelected.soldOut = true;
  await tour.save();
};

bookingSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name email photo' }).populate({
    path: 'tour',
    select: 'name'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
