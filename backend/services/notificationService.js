// Creates a notification in MongoDB and, if the recipient is connected via
// Socket.IO, pushes it to them in real time on the "notification" event.
const Notification = require('../models/Notification');

async function notify(io, { userId, title, message, type = 'system' }) {
  const notification = await Notification.create({ user: userId, title, message, type });
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
  return notification;
}

module.exports = { notify };
