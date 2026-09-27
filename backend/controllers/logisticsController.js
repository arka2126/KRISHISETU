// Simulated logistics/delivery status + checkpoint tracking (see Logistics
// model docstring for what "tracking" does and doesn't mean here).
const Logistics = require('../models/Logistics');
const Payment = require('../models/Payment');
const Lot = require('../models/Lot');
const { trackingId } = require('../utils/idGenerator');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

const CARRIERS = ['KrishiSetu Logistics Partner', 'AgriTrans Carriers', 'MandiLink Freight'];

const STATUS_AFTER_CHECKPOINT = ['vehicle_assigned', 'pickup', 'in_transit', 'arrived', 'delivered'];

function buildWaypoints(pickupLocation, destination) {
  const hubs = ['Regional Transit Hub', 'District Checkpoint'];
  return [pickupLocation || 'Pickup Point', ...hubs, destination || 'Destination Mandi'];
}

// POST /api/logistics  (create a tracking record for a sold+paid lot)
const createLogistics = asyncHandler(async (req, res) => {
  const { lot: lotId, vehicleNumber, driverName, driverPhone, pickupLocation, destination, expectedDelivery, carrier } = req.body;
  if (!lotId) return res.status(400).json({ success: false, message: 'lot is required' });

  const existing = await Logistics.findOne({ lot: lotId });
  if (existing) {
    return res.status(409).json({ success: false, message: 'A logistics record already exists for this lot', data: existing });
  }

  // Denormalize the buyer from the successful payment, so buyers can query "my shipments"
  const payment = await Payment.findOne({ lot: lotId, status: 'paid' });
  const waypoints = buildWaypoints(pickupLocation, destination);

  const logistics = await Logistics.create({
    lot: lotId,
    buyer: payment ? payment.buyer : undefined,
    trackingId: trackingId(),
    carrier: carrier || CARRIERS[Math.floor(Math.random() * CARRIERS.length)],
    vehicleNumber,
    driverName,
    driverPhone,
    pickupLocation,
    destination,
    distanceKm: 40 + Math.round(Math.random() * 360), // simulated estimate, not routed
    expectedDelivery,
    status: 'order_confirmed',
    waypoints,
    currentCheckpointIndex: 0,
    progressPercent: 0,
    currentLocation: waypoints[0],
    history: [{ status: 'order_confirmed', location: waypoints[0], note: 'Order confirmed after payment' }],
  });

  res.status(201).json({ success: true, data: logistics });
});

// POST /api/logistics/:id/advance  (move the simulated shipment to its next checkpoint)
const advanceTracking = asyncHandler(async (req, res) => {
  const { note } = req.body || {};
  const logistics = await Logistics.findById(req.params.id).populate({ path: 'lot', populate: 'farmer' });
  if (!logistics) return res.status(404).json({ success: false, message: 'Logistics record not found' });
  if (logistics.status === 'delivered' || logistics.status === 'cancelled') {
    return res.status(400).json({ success: false, message: `Shipment already ${logistics.status}` });
  }

  const nextIndex = Math.min(logistics.currentCheckpointIndex + 1, logistics.waypoints.length - 1);
  const isFinal = nextIndex === logistics.waypoints.length - 1;
  const nextStatus = STATUS_AFTER_CHECKPOINT[Math.min(logistics.currentCheckpointIndex, STATUS_AFTER_CHECKPOINT.length - 1)];

  logistics.currentCheckpointIndex = nextIndex;
  logistics.currentLocation = logistics.waypoints[nextIndex];
  logistics.progressPercent = Math.round((nextIndex / (logistics.waypoints.length - 1)) * 100);
  logistics.status = nextStatus;
  if (isFinal && nextStatus === 'delivered') {
    logistics.actualDelivery = new Date();
  }
  logistics.history.push({ status: nextStatus, location: logistics.currentLocation, note });
  await logistics.save();

  const io = req.app.get('io');
  await notify(io, {
    userId: logistics.lot.farmer._id || logistics.lot.farmer,
    title: 'Logistics update',
    message: `Shipment for lot ${logistics.lot.lotId || ''} reached ${logistics.currentLocation} (${logistics.status.replace('_', ' ')}).`,
    type: 'logistics',
  });
  if (logistics.buyer) {
    await notify(io, {
      userId: logistics.buyer,
      title: 'Shipment update',
      message: `Your shipment (${logistics.trackingId}) reached ${logistics.currentLocation}.`,
      type: 'logistics',
    });
  }

  res.json({ success: true, data: logistics });
});

// PUT /api/logistics/:id  (manual override of status, e.g. cancellation)
const updateLogisticsStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const logistics = await Logistics.findById(req.params.id).populate({ path: 'lot', populate: 'farmer' });
  if (!logistics) return res.status(404).json({ success: false, message: 'Logistics record not found' });

  logistics.status = status;
  logistics.history.push({ status, location: logistics.currentLocation, note });
  if (status === 'delivered') logistics.actualDelivery = new Date();
  await logistics.save();

  const io = req.app.get('io');
  await notify(io, {
    userId: logistics.lot.farmer._id || logistics.lot.farmer,
    title: 'Logistics update',
    message: `Shipment for lot ${logistics.lot.lotId || ''} is now: ${status.replace('_', ' ')}.`,
    type: 'logistics',
  });

  res.json({ success: true, data: logistics });
});

// GET /api/logistics/mine  (farmer: shipments for their lots; buyer: shipments they're receiving)
const getMyLogistics = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'buyer') {
    filter = { buyer: req.user._id };
  } else if (req.user.role === 'farmer') {
    const myLots = await Lot.find({ farmer: req.user._id }).select('_id');
    filter = { lot: { $in: myLots.map((l) => l._id) } };
  } else {
    filter = {};
  }
  const records = await Logistics.find(filter)
    .populate({ path: 'lot', populate: 'commodity' })
    .sort({ createdAt: -1 });
  res.json({ success: true, data: records });
});

// GET /api/logistics/:lotId  (lotId = Lot's Mongo _id)
const getLogisticsByLot = asyncHandler(async (req, res) => {
  const logistics = await Logistics.findOne({ lot: req.params.lotId }).populate({ path: 'lot', populate: 'commodity' });
  if (!logistics) return res.status(404).json({ success: false, message: 'No logistics record for this lot' });
  res.json({ success: true, data: logistics });
});

module.exports = { createLogistics, advanceTracking, updateLogisticsStatus, getMyLogistics, getLogisticsByLot };
