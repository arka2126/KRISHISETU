// Creates a notification in MongoDB and, if the recipient is connected via
// Socket.IO, pushes it to them in real time on the "notification" event.
// Also triggers an SMS/WhatsApp notification to the user's registered Indian mobile number.
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSMSOrWhatsApp } = require('./smsWhatsappService');

async function notify(io, { userId, title, message, type = 'system' }) {
  const notification = await Notification.create({ user: userId, title, message, type });
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  // Trigger SMS / WhatsApp alert to recipient's mobile number asynchronously
  (async () => {
    try {
      const recipient = await User.findById(userId).select('phone role name');
      if (recipient?.phone) {
        await sendSMSOrWhatsApp({
          phone: recipient.phone,
          title,
          message,
          type,
        });
      }
    } catch (err) {
      // Non-fatal: notification is already preserved in MongoDB and WebSockets
      console.warn('[Notification SMS Trigger Warning]', err.message);
    }
  })();

  return notification;
}

module.exports = { notify };
