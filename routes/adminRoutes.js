const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.use(verifyToken, isAdmin);

router.get('/stats', adminController.getSystemStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/blood-requests', adminController.getAllBloodRequests);
router.get('/appointments', adminController.getAllAppointments);
router.get('/reports/donations', adminController.getDonationReports);
router.post('/broadcast', adminController.sendBroadcast);

module.exports = router;