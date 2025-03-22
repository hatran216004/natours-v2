const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  permissions: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Permission'
    }
  ],
  description: String
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
