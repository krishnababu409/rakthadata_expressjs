const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken } = require('../middleware/auth');
const { validateBloodRequest, validateIdParam } = require('../middleware/validation');

router.use(verifyToken);

router.post('/', validateBloodRequest, requestController.createRequest);
router.get('/', requestController.getAllRequests);
router.get('/:id', validateIdParam, requestController.getRequestById);
router.put('/:id/respond', validateIdParam, requestController.respondToRequest);
router.put('/:id/status', validateIdParam, requestController.updateRequestStatus);

module.exports = router;