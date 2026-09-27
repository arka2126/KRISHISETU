// Records administrative/important actions for traceability (admin audit trail)
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. 'LOT_APPROVED', 'BID_PLACED'
    entity: String, // e.g. 'Lot', 'Auction'
    entityId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
