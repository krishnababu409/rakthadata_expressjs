const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validation');

router.use(verifyToken);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', validateIdParam, notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', validateIdParam, notificationController.deleteNotification);
router.delete('/read/all', notificationController.deleteReadNotifications);

module.exports = router;