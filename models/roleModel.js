const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String, // VD: "admin"
    required: true,
    unique: true
  },
  permissions: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Permission'
    }
  ]
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
