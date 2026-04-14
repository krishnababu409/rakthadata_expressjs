const {
  now,
  getState,
  nextId,
  generateCode,
  createNotification,
  save
} = require('../data/store');

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const { hospitalName, location, appointmentDate, appointmentTime, notes, receiverId } = req.body;
    const state = getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }
    const appointment = {
      id: nextId('appointments'),
      appointment_number: generateCode('APT', 'appointments'),
      donor_id: donor.id,
      receiver_id: receiverId ? Number(receiverId) : null,
      hospital_name: hospitalName,
      location,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'upcoming',
      notes: notes || '',
      created_at: now(),
      updated_at: now()
    };
    state.appointments.push(appointment);
    createNotification({
      userId: req.user.id,
      title: 'Appointment Confirmed',
      message: `Your donation appointment at ${hospitalName} on ${appointmentDate} at ${appointmentTime} has been scheduled.`,
      type: 'appointment',
      relatedId: appointment.id
    });
    save();

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointment_number
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

// Get donor appointments
const getDonorAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const state = getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }
    const matching = state.appointments
      .filter((item) => item.donor_id === donor.id)
      .filter((item) => !status || item.status === status)
      .map((item) => {
        const receiver = state.receivers.find((entry) => entry.id === item.receiver_id);
        const user = receiver ? state.users.find((entry) => entry.id === receiver.user_id) : null;
        return {
          ...item,
          receiver_name: user?.name || null,
          receiver_phone: user?.phone || null
        };
      })
      .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));
    const start = (Number(page) - 1) * Number(limit);
    const appointments = matching.slice(start, start + Number(limit));

    res.json({
      success: true,
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: matching.length,
        pages: Math.ceil(matching.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get donor appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
};

// Get receiver appointments
const getReceiverAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const state = getState();
    const receiver = state.receivers.find((item) => item.user_id === req.user.id);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver profile not found' });
    }
    const matching = state.appointments
      .filter((item) => item.receiver_id === receiver.id)
      .filter((item) => !status || item.status === status)
      .map((item) => {
        const donor = state.donors.find((entry) => entry.id === item.donor_id);
        const user = donor ? state.users.find((entry) => entry.id === donor.user_id) : null;
        return {
          ...item,
          donor_name: user?.name || null,
          donor_phone: user?.phone || null,
          blood_group: donor?.blood_group || null
        };
      })
      .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));
    const start = (Number(page) - 1) * Number(limit);
    const appointments = matching.slice(start, start + Number(limit));

    res.json({
      success: true,
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: matching.length,
        pages: Math.ceil(matching.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get receiver appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const state = getState();
    const appointment = state.appointments.find((item) => item.id === Number(id) && item.status === 'upcoming');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or cannot be cancelled' });
    }
    appointment.status = 'cancelled';
    appointment.updated_at = now();
    save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;
    const state = getState();
    const appointment = state.appointments.find((item) => item.id === Number(id) && item.status === 'upcoming');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or cannot be rescheduled' });
    }
    appointment.appointment_date = appointmentDate;
    appointment.appointment_time = appointmentTime;
    appointment.updated_at = now();
    save();

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: 'Failed to reschedule appointment' });
  }
};

// Complete appointment (mark as completed)
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const state = getState();
    const appointment = state.appointments.find((item) => item.id === Number(id) && item.status === 'upcoming');
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or already completed' });
    }
    const donor = state.donors.find((item) => item.id === appointment.donor_id);
    appointment.status = 'completed';
    appointment.updated_at = now();
    if (donor) {
      donor.total_donations += 1;
      donor.last_donation_date = new Date().toISOString().slice(0, 10);
      donor.next_eligible_date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      state.donationHistory.push({
        id: nextId('donationHistory'),
        donor_id: donor.id,
        appointment_id: appointment.id,
        donation_date: new Date().toISOString().slice(0, 10),
        hospital_name: appointment.hospital_name,
        blood_group: donor.blood_group,
        units_donated: 1,
        created_at: now()
      });
    }
    save();

    res.json({
      success: true,
      message: 'Appointment marked as completed'
    });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
};

module.exports = {
  createAppointment,
  getDonorAppointments,
  getReceiverAppointments,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment
};
