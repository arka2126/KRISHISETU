// A registered batch of produce brought to a mandi by a farmer, tracked end-to-end
const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema(
  {
    lotId: { type: String, required: true, unique: true }, // e.g. LOT-2026-A1B2C
    gateEntryId: String,
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    variety: String,
    mandi: { type: String, required: true }, // mandi/market name
    vehicleNumber: String,
    quantity: { type: Number, required: true }, // in units (e.g. quintals)
    weight: Number, // recorded weight in kg
    basePrice: { type: Number, required: true }, // per unit
    reservePrice: { type: Number, required: true }, // minimum acceptable per unit
    qualityReport: { type: mongoose.Schema.Types.ObjectId, ref: 'QualityReport' },
    status: {
      type: String,
      enum: [
        'gate_entry',
        'weighed',
        'quality_pending',
        'quality_done',
        'approved',
        'rejected',
        'auction_scheduled',
        'in_auction',
        'sold',
        'unsold',
      ],
      default: 'gate_entry',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // mandi staff who created it
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lot', lotSchema);
