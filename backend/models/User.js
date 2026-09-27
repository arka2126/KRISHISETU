// Core user account. All roles (farmer, buyer, mandi_staff, quality_assessor, admin)
// share this collection and are distinguished by the `role` field.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, select: false }, // bcrypt hash, hidden by default
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'mandi_staff', 'quality_assessor', 'admin'],
      required: true,
    },
    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },

    // Role-specific extra fields embedded directly for prototype simplicity
    farmDetails: {
      farmName: String,
      farmSize: String,
      primaryCrops: [String],
    },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    businessDetails: {
      businessName: String,
      licenseNumber: String,
      businessAddress: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
