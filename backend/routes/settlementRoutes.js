const express = require('express');
const { getSettlementById, getSettlements } = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getSettlements);
router.get('/:id', protect, getSettlementById);

module.exports = router;
