const express = require('express');
const router = express.Router();
const receiverController = require('../controllers/receiverController');
const { verifyToken, isReceiver } = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validation');

router.use(verifyToken, isReceiver);

router.get('/dashboard', receiverController.getReceiverDashboard);
router.get('/profile', receiverController.getReceiverProfile);
router.get('/donors/search', receiverController.searchDonors);
router.get('/requests', receiverController.getMyRequests);
router.get('/requests/:id', validateIdParam, receiverController.getRequestDetails);

module.exports = router;