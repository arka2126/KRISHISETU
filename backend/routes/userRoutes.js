const express = require('express');
const { getUsers, getUserById, updateUserStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', authorize('admin', 'mandi_staff'), getUsers);
router.get('/:id', authorize('admin'), getUserById);
router.put('/:id/status', authorize('admin'), updateUserStatus);

module.exports = router;
