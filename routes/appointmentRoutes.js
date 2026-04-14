const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken } = require('../middleware/auth');
const { validateAppointment, validateIdParam } = require('../middleware/validation');

router.use(verifyToken);

router.post('/', validateAppointment, appointmentController.createAppointment);
router.get('/donor', appointmentController.getDonorAppointments);
router.get('/receiver', appointmentController.getReceiverAppointments);
router.put('/:id/cancel', validateIdParam, appointmentController.cancelAppointment);
router.put('/:id/reschedule', validateIdParam, appointmentController.rescheduleAppointment);
router.put('/:id/complete', validateIdParam, appointmentController.completeAppointment);

module.exports = router;