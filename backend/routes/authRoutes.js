const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('phone').notEmpty(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['farmer', 'buyer', 'mandi_staff', 'quality_assessor', 'admin']),
  ],
  validate,
  register
);

router.post('/login', [body('email').isEmail(), body('password').notEmpty()], validate, login);
router.get('/me', protect, getMe);

router.put(
  '/profile',
  protect,
  [body('phone').optional().notEmpty(), body('name').optional().notEmpty()],
  validate,
  updateProfile
);

router.put(
  '/change-password',
  protect,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  changePassword
);

module.exports = router;
