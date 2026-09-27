const express = require('express');
const { createLot, getLots, getLotById, updateLot } = require('../controllers/lotController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getLots); // marketplace/dashboards filter as needed
router.get('/:id', protect, getLotById);
router.post('/', protect, authorize('mandi_staff', 'admin'), createLot);
router.put('/:id', protect, authorize('mandi_staff', 'admin'), updateLot);

module.exports = router;
