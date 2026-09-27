const express = require('express');
const {
  createAuction,
  getAuctions,
  getAuctionById,
  placeBid,
  closeAuction,
} = require('../controllers/auctionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getAuctions); // public - marketplace/live auctions listing
router.get('/:id', getAuctionById);
router.post('/', protect, authorize('mandi_staff', 'admin'), createAuction);
router.post('/:id/bids', protect, authorize('buyer'), placeBid);
router.post('/:id/close', protect, authorize('mandi_staff', 'admin'), closeAuction);

module.exports = router;
