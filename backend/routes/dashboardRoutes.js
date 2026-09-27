const express = require('express');
const {
  farmerDashboard,
  buyerDashboard,
  mandiDashboard,
  adminDashboard,
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/farmer', protect, authorize('farmer'), farmerDashboard);
router.get('/buyer', protect, authorize('buyer'), buyerDashboard);
router.get('/mandi', protect, authorize('mandi_staff', 'admin'), mandiDashboard);
router.get('/admin', protect, authorize('admin'), adminDashboard);

module.exports = router;
