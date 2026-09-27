// Quality certificate produced by a Quality Assessor for a specific lot
const mongoose = require('mongoose');

const qualityReportSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true },
    assessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    moisture: { type: Number, required: true }, // percentage
    foreignMatter: { type: Number, required: true }, // percentage
    grainSize: String,
    damagedPercentage: { type: Number, default: 0 },
    otherParameters: String,
    grade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C'], required: true },
    testDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'certified'], default: 'certified' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QualityReport', qualityReportSchema);
