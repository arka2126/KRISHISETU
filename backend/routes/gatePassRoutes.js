const express = require('express');
const { createGatePass, getGatePassById } = require('../controllers/gatePassController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', protect, getGatePassById);
router.post('/', protect, authorize('mandi_staff', 'admin'), createGatePass);

module.exports = router;
