const Transaction = require('../models/transactionModel');

class TransactionService {
  async create(data) {
    return await Transaction.create(data);
  }
}

module.exports = new TransactionService();
