const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const Transaction = require('../models/transactionModel');
const AppError = require('../utils/appError');
const { NOT_FOUND } = require('../utils/constants');
const { generateOrderCode, extractOrderCode } = require('../utils/helpers');
const transactionService = require('./transactionService');

class BookingService {
  async createCheckout(body, userId) {
    const { participants, specialRequirements, startDate, tourId } = body;
    const tour = await Tour.findById(tourId);
    if (!tour) throw new AppError('Tour not found', NOT_FOUND);

    const date = new Date(startDate);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const existStartDate = await Tour.findOne({
      startDates: {
        $elemMatch: {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      }
    });

    if (!existStartDate)
      throw new AppError('Start date not found in tour', 400);

    const amount = tour.price * (participants || 1);

    const { SEPAY_QR_URL, SEPAY_BANK_NAME, SEPAY_BANK_ACCOUNT_NUMBER } =
      process.env;

    const orderCode = generateOrderCode();
    const sepayQRUrl = `${SEPAY_QR_URL}?acc=${SEPAY_BANK_ACCOUNT_NUMBER}&bank=${SEPAY_BANK_NAME}&amount=${amount}&des=${orderCode}`;

    await Booking.create({
      tour: tourId,
      user: userId,
      amount,
      participants,
      specialRequirements,
      startDate,
      orderCode
    });

    return { sepayQRUrl, orderCode, amount };
  }

  async updateBookingPaid(booking) {
    const tour = await Tour.findById(booking.tour);

    if (!tour)
      throw new AppError(`Tour not found with id: ${booking.tour}`, 200);

    const dateSelected = tour.startDates.find(
      (d) => d.date.getTime() === booking.startDate.getTime()
    );

    dateSelected.participants += booking.participants;
    dateSelected.soldOut = dateSelected.participants >= tour.maxGroupSize;
    booking.paymentStatus = 'Paid';
    booking.paymentTime = Date.now();

    await Promise.all([tour.save(), booking.save()]);
  }

  async sepayWebhook(body) {
    const {
      gateway,
      transactionDate,
      accountNumber,
      code,
      content,
      transferAmount,
      accumulated,
      description
    } = body;

    // BƯỚC 1: Tạo transaction
    const transaction = await transactionService.create({
      accountNumber,
      gateway,
      transactionDate,
      amountIn: transferAmount,
      accumulated,
      orderCode: code,
      transactionContent: content || description
    });

    // BƯỚC 2: Tìm order_code trong nội dung chuyển khoản
    const orderCode = extractOrderCode(code || content);
    if (!orderCode) {
      throw new AppError(
        `Transaction saved but no order code found ${transaction.id}`,
        200
      );
    }

    // BƯỚC 3: Tìm booking theo order_code
    const booking = await Booking.findOne({ orderCode: code });
    if (!booking) {
      throw new AppError(
        `Transaction saved but booking not found ${transaction.id}`,
        200
      );
    }
    // BƯỚC 4: Kiểm tra booking đã được thanh toán chưa (tránh duplicate)
    if (booking.paymentStatus === 'Paid') {
      throw new AppError(
        `Transaction saved but booking already paid ${booking.id}`,
        200
      );
    }

    // BƯỚC 5: Kiểm tra số tiền có khớp không
    if (transferAmount !== booking.amount) {
      await Transaction.findByIdAndUpdate(transaction.id, {
        note: `Amount mismatch - Expected: ${booking.amount}, Received: ${transferAmount}`
      });
    }

    // BƯỚC 6: Cập nhật booking thành đã thanh toán
    await this.updateBookingPaid(booking);

    return transaction;
  }

  async updateBooking(bookingId, dataUpdated) {
    // 1. Find booking
    const oldBooking = await Booking.findById(bookingId);
    if (!oldBooking) throw new AppError('Booking not found', NOT_FOUND);

    // 2.Update booking
    const booking = await Booking.findByIdAndUpdate(bookingId, dataUpdated, {
      new: true,
      runValidators: true
    });

    // 3. Update tour participants
    const tour = await Tour.findById(booking.tour);
    const dateSelected = tour.startDates.find(
      (d) => d.date.getTime() === booking.startDate.getTime()
    );

    if (!dateSelected) {
      throw new AppError('Start date not found in tour', 400);
    }

    const diff = dataUpdated.participants - oldBooking.participants;
    dateSelected.participants += diff;

    dateSelected.soldOut = dateSelected.participants >= tour.maxGroupSize;

    // 4. Update booking price
    booking.price = booking.participants * tour.price;

    await Promise.all([booking.save(), tour.save()]);

    return booking;
  }

  async getBookingStatus() {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          nums: { $sum: 1 }
        }
      },
      {
        $addFields: {
          status: '$_id'
        }
      },
      {
        $project: {
          _id: 0
        }
      }
    ]);
    return stats;
  }

  async getMonthlyRevenue() {
    const revenue = await Booking.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$amount' },
          totalBooking: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalRevenue: 1,
          totalBooking: 1
        }
      }
    ]);
    return revenue;
  }

  async getStatusRatio() {
    const statusRatio = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          status: '$_id'
        }
      },
      {
        $project: {
          _id: 0,
          status: 1,
          count: 1
        }
      }
    ]);
    return statusRatio;
  }

  async getTopBooked(limit) {
    const data = await Booking.aggregate([
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'tour'
        }
      },
      {
        $unwind: '$tour'
      },
      {
        $group: {
          _id: '$tour._id',
          bookedCount: { $sum: 1 },
          name: { $first: '$tour.name' },
          price: { $first: '$tour.price' },
          revenue: { $sum: '$amount' },
          photo: { $first: '$tour.imageCover' }
        }
      },

      {
        $project: {
          _id: 0,
          tourId: '$_id',
          tourName: '$name',
          tourPrice: '$price',
          bookedCount: 1,
          revenue: 1,
          photo: 1
        }
      },
      {
        $limit: limit
      },
      {
        $sort: {
          bookedCount: -1
        }
      }
    ]);
    return data;
  }
}

module.exports = new BookingService();
