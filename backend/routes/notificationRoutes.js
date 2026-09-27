const express = require('express');
const { getMyNotifications, markRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markRead);

module.exports = router;
