// Seeds the database with demo users, commodities, lots, an active auction and
// a completed end-to-end transaction so the app is immediately explorable.
// Run with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Commodity = require('../models/Commodity');
const Lot = require('../models/Lot');
const QualityReport = require('../models/QualityReport');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const Settlement = require('../models/Settlement');
const { lotId, gateEntryId, txnId, invoiceId } = require('./idGenerator');

const DEMO_PASSWORD = 'Demo@123';

async function seed() {
  await connectDB();
  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Commodity.deleteMany({}),
    Lot.deleteMany({}),
    QualityReport.deleteMany({}),
    Auction.deleteMany({}),
    Payment.deleteMany({}),
    Settlement.deleteMany({}),
  ]);

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Users ---
  const farmerNames = ['Ram Kumar', 'Suresh Patel', 'Geeta Devi', 'Mohan Singh', 'Lakshmi Reddy',
    'Vikram Yadav', 'Sunita Sharma', 'Anil Kumar', 'Radha Bai', 'Prakash Rao'];
  const farmers = await User.insertMany(
    farmerNames.map((name, i) => ({
      name, email: `farmer${i + 1}@krishisetu.demo`, phone: `90000000${String(i + 1).padStart(2, '0')}`,
      password: hash, role: 'farmer', status: 'active',
      address: { city: 'Nashik', state: 'Maharashtra', pincode: '422001' },
      farmDetails: { farmName: `${name.split(' ')[0]} Farms`, farmSize: '5 acres', primaryCrops: ['Rice', 'Wheat'] },
      bankDetails: { accountHolder: name, accountNumber: `1234567890${i}`, ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
    }))
  );

  const buyerNames = ['Agro Traders Co', 'Fresh Mart Wholesale', 'Golden Grain Exports', 'City Foods Ltd',
    'National Grain Traders', 'Sunrise Agro Pvt Ltd', 'Bharat Commodities', 'Green Valley Foods',
    'Metro Wholesale', 'Prime Agri Exports'];
  const buyers = await User.insertMany(
    buyerNames.map((name, i) => ({
      name, email: `buyer${i + 1}@krishisetu.demo`, phone: `91000000${String(i + 1).padStart(2, '0')}`,
      password: hash, role: 'buyer', status: 'active',
      address: { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      businessDetails: { businessName: name, licenseNumber: `LIC-${1000 + i}`, businessAddress: 'MIDC, Pune' },
    }))
  );

  const mandiStaff = await User.insertMany(
    ['Ravi Deshmukh', 'Anita Joshi', 'Sanjay More'].map((name, i) => ({
      name, email: `mandi${i + 1}@krishisetu.demo`, phone: `92000000${i + 1}`,
      password: hash, role: 'mandi_staff', status: 'active',
    }))
  );

  const assessors = await User.insertMany(
    ['Dr. Meena Kulkarni', 'Dr. Ashok Pawar', 'Dr. Kavita Bhosale'].map((name, i) => ({
      name, email: `assessor${i + 1}@krishisetu.demo`, phone: `93000000${i + 1}`,
      password: hash, role: 'quality_assessor', status: 'active',
    }))
  );

  const [admin] = await User.insertMany([
    { name: 'Platform Admin', email: 'admin@krishisetu.demo', phone: '9400000001', password: hash, role: 'admin', status: 'active' },
  ]);

  // --- Commodities ---
  const commodityDefs = [
    { name: 'Rice', category: 'Grain', unit: 'quintal', description: 'Staple cereal grain' },
    { name: 'Wheat', category: 'Grain', unit: 'quintal', description: 'Winter cereal crop' },
    { name: 'Potato', category: 'Vegetable', unit: 'quintal', description: 'Tuber vegetable' },
    { name: 'Onion', category: 'Vegetable', unit: 'quintal', description: 'Bulb vegetable' },
    { name: 'Maize', category: 'Grain', unit: 'quintal', description: 'Corn / feed grain' },
    { name: 'Mustard', category: 'Oilseed', unit: 'quintal', description: 'Oilseed crop' },
    { name: 'Tomato', category: 'Vegetable', unit: 'quintal', description: 'Fresh produce' },
    { name: 'Pulses', category: 'Pulses', unit: 'quintal', description: 'Lentils and gram' },
    { name: 'Cotton', category: 'Cash Crop', unit: 'bale', description: 'Fiber crop' },
  ];
  const commodities = await Commodity.insertMany(commodityDefs);

  const grades = ['A+', 'A', 'B+', 'B', 'C'];
  const mandis = ['Nashik Mandi', 'Pune APMC', 'Aurangabad Mandi'];

  // --- Lots + quality reports (a spread of statuses so every dashboard has data) ---
  const lots = [];
  for (let i = 0; i < 12; i++) {
    const farmer = farmers[i % farmers.length];
    const commodity = commodities[i % commodities.length];
    const basePrice = 1800 + i * 75;
    const lot = await Lot.create({
      lotId: lotId(),
      gateEntryId: gateEntryId(),
      farmer: farmer._id,
      commodity: commodity._id,
      variety: 'Standard',
      mandi: mandis[i % mandis.length],
      vehicleNumber: `MH-12-AB-${1000 + i}`,
      quantity: 50 + i * 5,
      weight: (50 + i * 5) * 100,
      basePrice,
      reservePrice: basePrice + 100,
      createdBy: mandiStaff[i % mandiStaff.length]._id,
      status: 'approved',
    });

    const report = await QualityReport.create({
      lot: lot._id,
      assessor: assessors[i % assessors.length]._id,
      moisture: 10 + (i % 5),
      foreignMatter: 1 + (i % 3),
      grainSize: 'Medium',
      damagedPercentage: i % 4,
      grade: grades[i % grades.length],
    });
    lot.qualityReport = report._id;
    await lot.save();
    lots.push(lot);
  }

  // --- One ACTIVE auction (for live bidding demo) ---
  const activeLot = lots[0];
  const activeAuction = await Auction.create({
    lot: activeLot._id,
    startTime: new Date(Date.now() - 5 * 60 * 1000),
    endTime: new Date(Date.now() + 30 * 60 * 1000),
    basePrice: activeLot.basePrice,
    reservePrice: activeLot.reservePrice,
    minimumIncrement: 25,
    currentHighestBid: activeLot.basePrice,
    status: 'active',
  });
  activeLot.status = 'in_auction';
  await activeLot.save();

  // A couple more scheduled auctions
  for (let i = 1; i <= 3; i++) {
    await Auction.create({
      lot: lots[i]._id,
      startTime: new Date(Date.now() + i * 60 * 60 * 1000),
      endTime: new Date(Date.now() + (i * 60 + 45) * 60 * 1000),
      basePrice: lots[i].basePrice,
      reservePrice: lots[i].reservePrice,
      minimumIncrement: 25,
      currentHighestBid: lots[i].basePrice,
      status: 'scheduled',
    });
    lots[i].status = 'auction_scheduled';
    await lots[i].save();
  }

  // --- One fully completed transaction (sold -> paid -> settled) for dashboard history ---
  const completedLot = lots[4];
  const winningBid = completedLot.basePrice + 250;
  const completedAuction = await Auction.create({
    lot: completedLot._id,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 60 * 60 * 1000),
    basePrice: completedLot.basePrice,
    reservePrice: completedLot.reservePrice,
    minimumIncrement: 25,
    currentHighestBid: winningBid,
    highestBidder: buyers[0]._id,
    bidCount: 6,
    status: 'closed_sold',
  });
  completedLot.status = 'sold';
  await completedLot.save();

  const commodityValue = winningBid * completedLot.quantity;
  const mandiFee = Math.round(commodityValue * 0.01);
  const platformFee = Math.round(commodityValue * 0.005);
  const totalAmount = commodityValue + mandiFee + platformFee;
  const payment = await Payment.create({
    auction: completedAuction._id,
    lot: completedLot._id,
    buyer: buyers[0]._id,
    seller: completedLot.farmer,
    commodityValue,
    mandiFee,
    platformFee,
    otherCharges: 0,
    totalAmount,
    transactionId: txnId(),
    paymentMethod: 'upi',
    status: 'paid',
    invoiceId: invoiceId(),
  });

  const commission = Math.round(commodityValue * 0.015);
  await Settlement.create({
    payment: payment._id,
    farmer: completedLot.farmer,
    grossAmount: commodityValue,
    mandiFee,
    platformFee,
    commission,
    farmerAmount: commodityValue - mandiFee - platformFee - commission,
    status: 'settled',
  });

  console.log('\nSeed complete!\n');
  console.log('Demo login credentials (password for all: ' + DEMO_PASSWORD + ')');
  console.log('  Admin:            admin@krishisetu.demo');
  console.log('  Farmer:           farmer1@krishisetu.demo');
  console.log('  Buyer:            buyer1@krishisetu.demo');
  console.log('  Mandi staff:      mandi1@krishisetu.demo');
  console.log('  Quality assessor: assessor1@krishisetu.demo');
  console.log(`\nActive auction ready for live bidding: ${activeAuction._id}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
