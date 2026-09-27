// Socket.IO namespace/logic for live auction rooms.
// Buyers join an auction room to receive instant bid updates; bids sent over
// the socket are validated with the exact same processBid() logic as the REST API.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { processBid } = require('../controllers/auctionController');

function initAuctionSocket(io) {
  // Authenticate every socket connection using the JWT issued at login
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room so we can push notifications to this exact user
    socket.join(`user:${socket.user._id}`);

    socket.on('joinAuction', (auctionId) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('leaveAuction', (auctionId) => {
      socket.leave(`auction:${auctionId}`);
    });

    // Real-time bid placement. Client sends { auctionId, amount }.
    socket.on('placeBid', async ({ auctionId, amount }, callback) => {
      try {
        const result = await processBid({ auctionId, buyerId: socket.user._id, amount, io });
        if (typeof callback === 'function') callback(result);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error while placing bid' });
        }
      }
    });

    socket.on('disconnect', () => {
      // no-op for prototype; rooms are cleaned up automatically by Socket.IO
    });
  });
}

module.exports = initAuctionSocket;
