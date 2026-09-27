// Digital gate pass issued once a lot is paid for, used to release goods from the mandi
const mongoose = require('mongoose');

const gatePassSchema = new mongoose.Schema(
  {
    gatePassId: { type: String, required: true, unique: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleNumber: String,
    destination: String,
    qrData: String, // string encoded into the QR code (verification reference)
    status: { type: String, enum: ['issued', 'used', 'cancelled'], default: 'issued' },
    issueDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GatePass', gatePassSchema);
