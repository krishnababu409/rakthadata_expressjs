const { getState, createNotification, save } = require('../data/store');

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const state = getState();
    res.json({
      success: true,
      stats: {
        total_donors: state.users.filter((item) => item.role === 'donor' && item.is_active).length,
        total_receivers: state.users.filter((item) => item.role === 'receiver' && item.is_active).length,
        total_requests: state.requests.length,
        pending_requests: state.requests.filter((item) => item.status === 'pending').length,
        fulfilled_requests: state.requests.filter((item) => item.status === 'fulfilled').length,
        upcoming_appointments: state.appointments.filter((item) => item.status === 'upcoming').length,
        completed_appointments: state.appointments.filter((item) => item.status === 'completed').length,
        total_units_donated: state.donationHistory.reduce((sum, item) => sum + (item.units_donated || 0), 0),
        total_donations: state.donationHistory.length
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Failed to load system statistics' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const state = getState();
    const usersList = state.users
      .filter((item) => item.role !== 'admin')
      .filter((item) => !role || item.role === role)
      .filter((item) => {
        if (status === 'active') return item.is_active;
        if (status === 'inactive') return !item.is_active;
        return true;
      })
      .map((item) => {
        const donor = state.donors.find((entry) => entry.user_id === item.id);
        const receiver = state.receivers.find((entry) => entry.user_id === item.id);
        return {
          ...item,
          blood_group: donor?.blood_group || null,
          total_donations: donor?.total_donations || 0,
          last_donation_date: donor?.last_donation_date || null,
          emergency_contact_name: receiver?.emergency_contact_name || ''
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (Number(page) - 1) * Number(limit);
    const users = usersList.slice(start, start + Number(limit));

    res.json({
      success: true,
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: usersList.length,
        pages: Math.ceil(usersList.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const state = getState();
    const user = state.users.find((item) => item.id === Number(id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot deactivate admin user' });
    }
    user.is_active = Boolean(isActive);
    save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

// Get all blood requests (admin view)
const getAllBloodRequests = async (req, res) => {
  try {
    const { status, urgency, page = 1, limit = 20 } = req.query;
    const state = getState();
    const all = state.requests
      .filter((item) => !status || item.status === status)
      .filter((item) => !urgency || item.urgency === urgency)
      .map((item) => {
        const receiver = state.receivers.find((entry) => entry.id === item.receiver_id);
        const receiverUser = receiver ? state.users.find((entry) => entry.id === receiver.user_id) : null;
        const donor = state.donors.find((entry) => entry.id === item.assigned_donor_id);
        const donorUser = donor ? state.users.find((entry) => entry.id === donor.user_id) : null;
        return {
          ...item,
          receiver_name: receiverUser?.name || null,
          receiver_phone: receiverUser?.phone || null,
          donor_name: donorUser?.name || null
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (Number(page) - 1) * Number(limit);
    const requests = all.slice(start, start + Number(limit));

    res.json({
      success: true,
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: all.length,
        pages: Math.ceil(all.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all blood requests error:', error);
    res.status(500).json({ error: 'Failed to load blood requests' });
  }
};

// Get all appointments (admin view)
const getAllAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const state = getState();
    const all = state.appointments
      .filter((item) => !status || item.status === status)
      .map((item) => {
        const donor = state.donors.find((entry) => entry.id === item.donor_id);
        const donorUser = donor ? state.users.find((entry) => entry.id === donor.user_id) : null;
        const receiver = state.receivers.find((entry) => entry.id === item.receiver_id);
        const receiverUser = receiver ? state.users.find((entry) => entry.id === receiver.user_id) : null;
        return {
          ...item,
          donor_name: donorUser?.name || null,
          donor_phone: donorUser?.phone || null,
          receiver_name: receiverUser?.name || null
        };
      })
      .sort((a, b) => new Date(`${b.appointment_date}T${b.appointment_time}`) - new Date(`${a.appointment_date}T${a.appointment_time}`));
    const start = (Number(page) - 1) * Number(limit);
    const appointments = all.slice(start, start + Number(limit));

    res.json({
      success: true,
      appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: all.length,
        pages: Math.ceil(all.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
};

// Get donation reports
const getDonationReports = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const state = getState();
    let filtered = [...state.donationHistory];
    if (startDate && endDate) {
      filtered = filtered.filter((item) => item.donation_date >= startDate && item.donation_date <= endDate);
    } else if (period === 'month') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((item) => new Date(item.donation_date).getTime() >= cutoff);
    } else if (period === 'year') {
      const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((item) => new Date(item.donation_date).getTime() >= cutoff);
    }

    const byBloodGroup = Object.values(
      filtered.reduce((acc, item) => {
        acc[item.blood_group] ||= { blood_group: item.blood_group, count: 0, total_units: 0 };
        acc[item.blood_group].count += 1;
        acc[item.blood_group].total_units += item.units_donated || 0;
        return acc;
      }, {})
    );

    const byLocation = Object.values(
      filtered.reduce((acc, item) => {
        acc[item.hospital_name] ||= { hospital_name: item.hospital_name, count: 0 };
        acc[item.hospital_name].count += 1;
        return acc;
      }, {})
    ).slice(0, 10);

    const monthlyTrend = Object.values(
      state.donationHistory.reduce((acc, item) => {
        const month = item.donation_date.slice(0, 7);
        acc[month] ||= { month, count: 0, total_units: 0 };
        acc[month].count += 1;
        acc[month].total_units += item.units_donated || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.month.localeCompare(a.month));

    res.json({
      success: true,
      reports: {
        byBloodGroup,
        byLocation,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Get donation reports error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
};

// Send broadcast notification
const sendBroadcast = async (req, res) => {
  try {
    const { title, message, userRole } = req.body;
    const state = getState();
    const users = state.users.filter((item) => item.is_active && (!userRole || userRole === 'all' || item.role === userRole));
    users.forEach((user) => {
      createNotification({
        userId: user.id,
        title,
        message,
        type: 'system'
      });
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} users`
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  updateUserStatus,
  getAllBloodRequests,
  getAllAppointments,
  getDonationReports,
  sendBroadcast
};
