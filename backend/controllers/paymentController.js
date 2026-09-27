// Payment lifecycle: initiate (creates a gateway order) -> verify (simulated
// gateway callback) -> on success, auto-settlement; on failure, retry is
// allowed. No real payment gateway credentials are used anywhere here — see
// services/paymentGatewayService.js.
const Payment = require('../models/Payment');
const Settlement = require('../models/Settlement');
const Auction = require('../models/Auction');
const gateway = require('../services/paymentGatewayService');
const { txnId, invoiceId } = require('../utils/idGenerator');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

// Simple demo fee structure - clearly a prototype simplification, not real mandi tariffs
const MANDI_FEE_RATE = 0.01; // 1%
const PLATFORM_FEE_RATE = 0.005; // 0.5%
const COMMISSION_RATE = 0.015; // 1.5%

async function assertPayableAuction(auctionId, userId) {
  const auction = await Auction.findById(auctionId).populate({
    path: 'lot',
    populate: { path: 'farmer' },
  });
  if (!auction) {
    const err = new Error('Auction not found');
    err.statusCode = 404;
    throw err;
  }
  if (auction.status !== 'closed_sold') {
    const err = new Error('Auction is not in a payable (sold) state');
    err.statusCode = 400;
    throw err;
  }
  if (String(auction.highestBidder) !== String(userId)) {
    const err = new Error('Only the winning bidder can pay for this lot');
    err.statusCode = 403;
    throw err;
  }
  return auction;
}

function computeFees(auction) {
  const lot = auction.lot;
  const commodityValue = auction.currentHighestBid * lot.quantity;
  const mandiFee = Math.round(commodityValue * MANDI_FEE_RATE);
  const platformFee = Math.round(commodityValue * PLATFORM_FEE_RATE);
  const otherCharges = 0;
  const totalAmount = commodityValue + mandiFee + platformFee + otherCharges;
  return { commodityValue, mandiFee, platformFee, otherCharges, totalAmount };
}

// POST /api/payments/initiate  (buyer starts paying for a won auction)
// Creates (or reuses, if already pending/processing/failed) a Payment record and
// opens a mock gateway order against it. Returns everything the frontend needs
// to render a "redirecting to gateway" / checkout step.
const initiatePayment = asyncHandler(async (req, res) => {
  const { auctionId, paymentMethod } = req.body;
  if (!auctionId || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'auctionId and paymentMethod are required' });
  }

  const auction = await assertPayableAuction(auctionId, req.user._id);
  const lot = auction.lot;

  let payment = await Payment.findOne({ auction: auction._id, buyer: req.user._id });

  if (payment && payment.status === 'paid') {
    return res.status(409).json({ success: false, message: 'This lot has already been paid for', data: payment });
  }

  const fees = computeFees(auction);
  const order = gateway.createOrder({ amount: fees.totalAmount, paymentMethod });

  if (!payment) {
    payment = await Payment.create({
      auction: auction._id,
      lot: lot._id,
      buyer: req.user._id,
      seller: lot.farmer._id,
      ...fees,
      transactionId: txnId(),
      paymentMethod,
      status: 'processing',
      gateway: {
        provider: order.provider,
        orderId: order.gatewayOrderId,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
    });
  } else {
    // Re-attempt after a previous failure: fresh gateway order, same Payment record
    payment.paymentMethod = paymentMethod;
    payment.status = 'processing';
    payment.gateway.provider = order.provider;
    payment.gateway.orderId = order.gatewayOrderId;
    payment.gateway.failureReason = undefined;
    payment.gateway.attempts = (payment.gateway.attempts || 0) + 1;
    payment.gateway.lastAttemptAt = new Date();
    await payment.save();
  }

  res.status(201).json({
    success: true,
    data: {
      payment,
      gatewayOrder: order, // frontend "redirects" to order.checkoutUrl in this demo
    },
  });
});

// POST /api/payments/:id/verify  (simulated gateway callback / webhook)
// body: { outcome?: 'success' | 'fail' } — omit outcome to let the mock gateway
// decide randomly (governed by MOCK_GATEWAY_FAILURE_RATE); pass it explicitly
// to demo either path deterministically.
const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate({
    path: 'lot',
    populate: 'farmer',
  });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (String(payment.buyer) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to verify this payment' });
  }
  if (payment.status !== 'processing') {
    return res.status(400).json({ success: false, message: `Payment is not awaiting verification (status: ${payment.status})` });
  }

  const { outcome } = req.body || {};
  const result = gateway.verifyCallback({ gatewayOrderId: payment.gateway.orderId, forcedOutcome: outcome });
  const io = req.app.get('io');

  if (!result.success) {
    payment.status = 'failed';
    payment.gateway.failureReason = result.failureReason;
    await payment.save();

    await notify(io, {
      userId: payment.buyer,
      title: 'Payment failed',
      message: `Payment attempt failed: ${result.failureReason}. You can retry.`,
      type: 'payment',
    });

    return res.json({ success: true, data: { payment, outcome: 'failed', reason: result.failureReason } });
  }

  payment.status = 'paid';
  payment.gateway.transactionId = result.gatewayTransactionId;
  payment.invoiceId = invoiceId();
  await payment.save();

  const commission = Math.round(payment.commodityValue * COMMISSION_RATE);
  const farmerAmount = payment.commodityValue - payment.mandiFee - payment.platformFee - commission;
  const settlement = await Settlement.create({
    payment: payment._id,
    farmer: payment.lot.farmer._id,
    grossAmount: payment.commodityValue,
    mandiFee: payment.mandiFee,
    platformFee: payment.platformFee,
    commission,
    farmerAmount,
    status: 'settled',
  });

  await notify(io, {
    userId: payment.buyer,
    title: 'Payment successful',
    message: `Payment of ₹${payment.totalAmount} confirmed. Transaction ${payment.transactionId}.`,
    type: 'payment',
  });
  await notify(io, {
    userId: payment.lot.farmer._id,
    title: 'Payment received',
    message: `Buyer paid for lot ${payment.lot.lotId}. You will receive ₹${farmerAmount} after fees.`,
    type: 'payment',
  });

  res.json({ success: true, data: { payment, settlement, outcome: 'success' } });
});

// POST /api/payments/:id/refund  (admin only — reverses a paid payment + its settlement)
const refundPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const payment = await Payment.findById(req.params.id).populate({ path: 'lot', populate: 'farmer' });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status !== 'paid') {
    return res.status(400).json({ success: false, message: 'Only a paid payment can be refunded' });
  }

  payment.status = 'refunded';
  payment.refundReason = reason || 'Refunded by admin';
  payment.refundedAt = new Date();
  await payment.save();

  await Settlement.findOneAndUpdate({ payment: payment._id }, { status: 'reversed' });

  const io = req.app.get('io');
  await notify(io, {
    userId: payment.buyer,
    title: 'Payment refunded',
    message: `Your payment of ₹${payment.totalAmount} (Txn ${payment.transactionId}) has been refunded.`,
    type: 'payment',
  });
  await notify(io, {
    userId: payment.lot.farmer._id,
    title: 'Settlement reversed',
    message: `The settlement for lot ${payment.lot.lotId} was reversed due to a refund.`,
    type: 'payment',
  });

  res.json({ success: true, data: payment });
});

// GET /api/payments/:id
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('buyer', 'name email')
    .populate('seller', 'name email')
    .populate({ path: 'lot', populate: 'commodity' });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json({ success: true, data: payment });
});

// GET /api/payments  (filter by buyer/seller/status for dashboards)
const getPayments = asyncHandler(async (req, res) => {
  const { buyer, seller, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (buyer) filter.buyer = buyer;
  if (seller) filter.seller = seller;
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .populate('buyer', 'name')
    .populate('seller', 'name')
    .populate({ path: 'lot', populate: 'commodity' })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Payment.countDocuments(filter);

  res.json({ success: true, data: payments, total, page: Number(page), limit: Number(limit) });
});

module.exports = { initiatePayment, verifyPayment, refundPayment, getPaymentById, getPayments };
