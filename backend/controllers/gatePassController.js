// Issues a digital gate pass (with QR payload) once a lot is paid for
const GatePass = require('../models/GatePass');
const Payment = require('../models/Payment');
const { gatePassId: generateGatePassId } = require('../utils/idGenerator');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /api/gate-passes  { paymentId, vehicleNumber, destination }
const createGatePass = asyncHandler(async (req, res) => {
  const { paymentId, vehicleNumber, destination } = req.body;
  const payment = await Payment.findById(paymentId).populate('lot');
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status !== 'paid') {
    return res.status(400).json({ success: false, message: 'Gate pass can only be issued after payment' });
  }

  const id = generateGatePassId();
  const gatePass = await GatePass.create({
    gatePassId: id,
    lot: payment.lot._id,
    buyer: payment.buyer,
    vehicleNumber,
    destination,
    qrData: `KRISHISETU-GATEPASS:${id}`,
  });

  res.status(201).json({ success: true, data: gatePass });
});

// GET /api/gate-passes/:id
const getGatePassById = asyncHandler(async (req, res) => {
  const gatePass = await GatePass.findById(req.params.id)
    .populate('buyer', 'name')
    .populate({ path: 'lot', populate: 'commodity' });
  if (!gatePass) return res.status(404).json({ success: false, message: 'Gate pass not found' });
  res.json({ success: true, data: gatePass });
});

module.exports = { createGatePass, getGatePassById };
