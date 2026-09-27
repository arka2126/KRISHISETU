// Simulated logistics/delivery tracking for a sold lot.
//
// HONESTY NOTE: there is no real GPS/telematics hardware or courier API behind
// this. "Tracking" here means a simulated checkpoint route (pickup -> one or
// two transit hubs -> destination) that advances when `advance` is called
// (normally by mandi/admin staff, standing in for a driver's app or a real
// carrier webhook). Locations are place-name checkpoints, not fabricated GPS
// coordinates, so nothing here misrepresents itself as real telemetry.
const mongoose = require('mongoose');

const logisticsSchema = new mongoose.Schema(
  {
    lot: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot', required: true, unique: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // denormalized for buyer-facing "my shipments" queries
    trackingId: { type: String, required: true, unique: true }, // TRK-YYYY-XXXXXX
    carrier: { type: String, default: 'KrishiSetu Logistics Partner' },
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
    pickupLocation: String,
    destination: String,
    distanceKm: Number, // rough simulated estimate, not a routed distance
    expectedDelivery: Date,
    actualDelivery: Date,
    status: {
      type: String,
      enum: ['order_confirmed', 'vehicle_assigned', 'pickup', 'in_transit', 'arrived', 'delivered', 'cancelled'],
      default: 'order_confirmed',
    },
    // Simulated route checkpoints, e.g. [pickupLocation, "Regional Transit Hub", destination]
    waypoints: [String],
    currentCheckpointIndex: { type: Number, default: 0 },
    progressPercent: { type: Number, default: 0 },
    currentLocation: String,
    history: [
      {
        status: String,
        location: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Logistics', logisticsSchema);
