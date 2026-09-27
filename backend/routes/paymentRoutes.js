const express = require('express');
const {
  initiatePayment,
  verifyPayment,
  refundPayment,
  getPaymentById,
  getPayments,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getPayments);
router.get('/:id', protect, getPaymentById);

// Mock payment gateway flow: initiate -> (frontend "checkout") -> verify
router.post('/initiate', protect, authorize('buyer'), initiatePayment);
router.post('/:id/verify', protect, authorize('buyer', 'admin'), verifyPayment);

router.post('/:id/refund', protect, authorize('admin'), refundPayment);

module.exports = router;
