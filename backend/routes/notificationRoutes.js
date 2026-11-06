const express = require('express');
const { getMyNotifications, markRead, getSmsDispatches } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.get('/sms-log', protect, getSmsDispatches);
router.put('/:id/read', protect, markRead);

module.exports = router;
