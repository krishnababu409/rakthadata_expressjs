const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin, validateProfileUpdate } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.put('/change-password', verifyToken, authController.changePassword);
router.put('/profile', verifyToken, validateProfileUpdate, authController.updateProfile);

module.exports = router;