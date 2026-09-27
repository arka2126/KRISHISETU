// Handles registration, login and "who am I" for all roles
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, address } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: hashedPassword,
    role,
    address,
  });

  const token = signToken(user);
  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Account is not active' });
  }

  const token = signToken(user);
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile  (edit own profile — not email, role or password)
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, farmDetails, bankDetails, businessDetails } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  // Only let a user edit the section relevant to their own role, so a buyer
  // can't quietly populate farmDetails, etc.
  if (req.user.role === 'farmer' && farmDetails !== undefined) updates.farmDetails = farmDetails;
  if (req.user.role === 'farmer' && bankDetails !== undefined) updates.bankDetails = bankDetails;
  if ((req.user.role === 'buyer' || req.user.role === 'mandi_staff') && businessDetails !== undefined) {
    updates.businessDetails = businessDetails;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+password');
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
