// Final payout calculation for the farmer after all fees/commission are deducted
const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    grossAmount: { type: Number, required: true },
    mandiFee: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    commission: { type: Number, required: true },
    farmerAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'settled', 'reversed'], default: 'settled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);
