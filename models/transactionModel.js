const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      required: [true, 'A transaction must have a gateway']
    },
    transactionDate: {
      type: Date,
      required: [true, 'A transaction must have a transactionDate']
    },
    accountNumber: {
      type: String,
      required: [true, 'A transaction must have a accountNumber']
    },
    amountIn: {
      type: Number,
      default: 0
    },
    amountOut: {
      type: Number,
      default: 0
    },
    accumulated: {
      type: Number,
      required: [true, 'A transaction must have a accumulated'],
      default: 0
    },
    orderCode: {
      type: String,
      required: [true, 'A transaction must have a orderCode']
    },
    transactionContent: {
      type: String,
      required: [true, 'A transaction must have a transactionContent']
    },
    note: String
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
