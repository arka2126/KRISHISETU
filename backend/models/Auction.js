// A live/scheduled auction for one lot
const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true, unique: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    basePrice: { type: Number, required: true },
    reservePrice: { type: Number, required: true },
    minimumIncrement: { type: Number, default: 25 },
    currentHighestBid: { type: Number, default: 0 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bidCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'closed_sold', 'closed_unsold'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
