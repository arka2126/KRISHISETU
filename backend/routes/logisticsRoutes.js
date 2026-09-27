const express = require('express');
const {
  createLogistics,
  advanceTracking,
  updateLogisticsStatus,
  getMyLogistics,
  getLogisticsByLot,
} = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// NOTE: '/mine' must be registered before the generic '/:lotId' route below,
// or Express would treat "mine" as a lotId.
router.get('/mine', protect, authorize('farmer', 'buyer'), getMyLogistics);
router.get('/:lotId', protect, getLogisticsByLot);

router.post('/', protect, authorize('mandi_staff', 'admin'), createLogistics);
router.post('/:id/advance', protect, authorize('mandi_staff', 'admin'), advanceTracking);
router.put('/:id', protect, authorize('mandi_staff', 'admin'), updateLogisticsStatus);

module.exports = router;
