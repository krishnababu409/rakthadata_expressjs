const { getState, publicUser, save } = require('../data/store');

// Get donor dashboard data
const getDonorDashboard = async (req, res) => {
  try {
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }

    const recentRequests = state.requests
      .filter((item) => item.blood_group === donor.blood_group && item.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    const upcomingAppointments = state.appointments
      .filter((item) => item.donor_id === donor.id && item.status === 'upcoming')
      .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`))
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        total_donations: donor.total_donations,
        is_available: donor.is_available,
        blood_group: donor.blood_group,
        last_donation_date: donor.last_donation_date,
        next_eligible_date: donor.next_eligible_date,
        pending_requests: recentRequests.length,
        upcoming_appointments: upcomingAppointments.length
      },
      recentRequests,
      upcomingAppointments
    });
  } catch (error) {
    console.error('Get donor dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
};

// Update donor availability
const updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }
    donor.is_available = Boolean(isAvailable);
    await save(state);

    res.json({ 
      success: true, 
      message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}` 
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

// Get donor donation history
const getDonationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }
    const allHistory = state.donationHistory
      .filter((item) => item.donor_id === donor.id)
      .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date));
    const start = (Number(page) - 1) * Number(limit);
    const history = allHistory.slice(start, start + Number(limit));

    res.json({
      success: true,
      history,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allHistory.length,
        pages: Math.ceil(allHistory.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get donation history error:', error);
    res.status(500).json({ error: 'Failed to load donation history' });
  }
};

// Get donor stats
const getDonorStats = async (req, res) => {
  try {
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    const history = donor ? state.donationHistory.filter((item) => item.donor_id === donor.id) : [];
    res.json({
      success: true,
      stats: donor
        ? {
            total_donations: donor.total_donations,
            lives_saved: donor.total_donations * 3,
            donation_count: history.length,
            total_units: history.reduce((sum, item) => sum + (item.units_donated || 0), 0)
          }
        : {}
    });
  } catch (error) {
    console.error('Get donor stats error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

// Get donor profile
const getDonorProfile = async (req, res) => {
  try {
    const state = await getState();
    const user = state.users.find((item) => item.id === req.user.id);
    if (!user || user.role !== 'donor') {
      return res.status(404).json({ error: 'Donor not found' });
    }

    res.json({ success: true, donor: publicUser(user, state) });
  } catch (error) {
    console.error('Get donor profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};

// Update donor medical history
const updateMedicalHistory = async (req, res) => {
  try {
    const { medicalHistory } = req.body;
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    donor.medical_history = medicalHistory || '';
    await save(state);

    res.json({ success: true, message: 'Medical history updated successfully' });
  } catch (error) {
    console.error('Update medical history error:', error);
    res.status(500).json({ error: 'Failed to update medical history' });
  }
};

module.exports = {
  getDonorDashboard,
  updateAvailability,
  getDonationHistory,
  getDonorStats,
  getDonorProfile,
  updateMedicalHistory
};
