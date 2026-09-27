// Master list of tradeable agricultural commodities
const mongoose = require('mongoose');

const commoditySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: true }, // e.g. Grain, Vegetable, Pulses, Cash Crop
    unit: { type: String, default: 'quintal' },
    description: String,
    imageUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Commodity', commoditySchema);
