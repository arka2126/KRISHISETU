const express = require('express');
const { getCommodities, createCommodity } = require('../controllers/commodityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCommodities); // public - marketplace needs this
router.post('/', protect, authorize('admin'), createCommodity);

module.exports = router;
