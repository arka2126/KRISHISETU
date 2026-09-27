// KrishiSetu backend entry point: Express REST API + Socket.IO real-time auctions
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const initAuctionSocket = require('./sockets/auctionSocket');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const commodityRoutes = require('./routes/commodityRoutes');
const lotRoutes = require('./routes/lotRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const logisticsRoutes = require('./routes/logisticsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// --- Socket.IO setup ---
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});
initAuctionSocket(io);
app.set('io', io); // so controllers can emit events via req.app.get('io')

// --- Core middleware ---
app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
// Gzip every JSON response — on a slow/metered mobile connection this
// noticeably shrinks the marketplace/dashboard list payloads.
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// Basic rate limiting on the API surface
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api', apiLimiter);

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ success: true, message: 'KrishiSetu API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commodities', commodityRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/quality-reports', qualityRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/gate-passes', gatePassRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes); // proxies to the Python FastAPI AI/ML service (ai-service/)

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Central error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`KrishiSetu backend running on http://localhost:${PORT}`);
  });
});

module.exports = { app, server, io };
