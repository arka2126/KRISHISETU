// Simulated payment for a won auction, routed through a mock payment gateway
// service (see services/paymentGatewayService.js). No real payment gateway
// credentials are used anywhere in this prototype.
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodityValue: { type: Number, required: true },
    mandiFee: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    otherCharges: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true }, // TXN-XXXXXXXX
    paymentMethod: { type: String, enum: ['upi', 'net_banking', 'bank_transfer'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    invoiceId: String,
    // Mock payment gateway bookkeeping — see services/paymentGatewayService.js
    gateway: {
      provider: String,
      orderId: String, // GTW-XXXXXXXXXX, returned by createOrder()
      transactionId: String, // GTXN-XXXXXXXXXX, returned on a successful callback
      failureReason: String,
      attempts: { type: Number, default: 0 },
      lastAttemptAt: Date,
    },
    refundReason: String,
    refundedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
