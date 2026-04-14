const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken, isDonor } = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validation');

router.use(verifyToken, isDonor);

router.get('/dashboard', donorController.getDonorDashboard);
router.get('/profile', donorController.getDonorProfile);
router.get('/history', donorController.getDonationHistory);
router.get('/stats', donorController.getDonorStats);
router.put('/availability', donorController.updateAvailability);
router.put('/medical-history', donorController.updateMedicalHistory);

module.exports = router;