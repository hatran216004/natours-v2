const mongoose = require('mongoose');
const Role = require('./roleModel');

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String, // VD: "create_post"
      required: true,
      unique: true
    },
    description: String
  },
  {
    timestamps: true
  }
);

permissionSchema.pre('findOneAndDelete', async function (next) {
  const permissionId = this.getQuery()._id;
  await Role.updateMany(
    { permissions: permissionId },
    { $pull: { permissions: permissionId } }
  );

  next();
});

const Permission = mongoose.model('Permission', permissionSchema);
module.exports = Permission;
