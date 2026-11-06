const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRecentDispatches } = require('../services/smsWhatsappService');

// GET /api/notifications  (current user's notifications)
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: notifications });
});

// GET /api/notifications/sms-log (recent SMS / WhatsApp alerts sent)
const getSmsDispatches = asyncHandler(async (req, res) => {
  const dispatches = getRecentDispatches();
  res.json({ success: true, data: dispatches });
});

// PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: notification });
});

module.exports = { getMyNotifications, markRead, getSmsDispatches };
