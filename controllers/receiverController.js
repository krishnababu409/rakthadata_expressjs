const { getState, publicUser } = require('../data/store');

// Get receiver dashboard data
const getReceiverDashboard = async (req, res) => {
  try {
    const state = await getState();
    const user = state.users.find((item) => item.id === req.user.id);
    const receiver = state.receivers.find((item) => item.user_id === req.user.id);
    if (!user || !receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    const activeRequests = state.requests
      .filter((item) => item.receiver_id === receiver.id && ['pending', 'assigned'].includes(item.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const allRequests = state.requests.filter((item) => item.receiver_id === receiver.id);

    res.json({
      success: true,
      receiver: publicUser(user, state),
      activeRequests,
      stats: {
        total_requests: allRequests.length,
        pending_requests: allRequests.filter((item) => item.status === 'pending').length,
        fulfilled_requests: allRequests.filter((item) => item.status === 'fulfilled').length
      }
    });
  } catch (error) {
    console.error('Get receiver dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
};

// Search donors
const searchDonors = async (req, res) => {
  try {
    const { bloodGroup, location, page = 1, limit = 20 } = req.query;
    const state = await getState();
    const matching = state.donors
      .filter((donor) => donor.is_available)
      .map((donor) => {
        const user = state.users.find((item) => item.id === donor.user_id && item.is_active);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          location: user.location,
          age: user.age,
          phone: user.phone,
          email: user.email,
          blood_group: donor.blood_group,
          is_available: donor.is_available,
          total_donations: donor.total_donations,
          last_donation_date: donor.last_donation_date
        };
      })
      .filter(Boolean)
      .filter((donor) => !bloodGroup || donor.blood_group === bloodGroup)
      .filter((donor) => !location || donor.location.toLowerCase().includes(location.toLowerCase()));
    const start = (Number(page) - 1) * Number(limit);
    const donors = matching.slice(start, start + Number(limit));

    res.json({
      success: true,
      donors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: matching.length,
        pages: Math.ceil(matching.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Search donors error:', error);
    res.status(500).json({ error: 'Failed to search donors' });
  }
};

// Get receiver's requests
const getMyRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const state = await getState();
    const receiver = state.receivers.find((item) => item.user_id === req.user.id);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    const matching = state.requests
      .filter((item) => item.receiver_id === receiver.id)
      .filter((item) => !status || item.status === status)
      .map((item) => {
        const donor = state.donors.find((entry) => entry.id === item.assigned_donor_id);
        const donorUser = donor ? state.users.find((entry) => entry.id === donor.user_id) : null;
        return {
          ...item,
          donor_name: donorUser?.name || null,
          donor_phone: donorUser?.phone || null,
          donor_blood_group: donor?.blood_group || null
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (Number(page) - 1) * Number(limit);
    const requests = matching.slice(start, start + Number(limit));

    res.json({
      success: true,
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: matching.length,
        pages: Math.ceil(matching.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Failed to load requests' });
  }
};

// Get request details
const getRequestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await getState();
    const receiver = state.receivers.find((item) => item.user_id === req.user.id);
    const request = state.requests.find((item) => item.id === Number(id) && receiver && item.receiver_id === receiver.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const donor = state.donors.find((item) => item.id === request.assigned_donor_id);
    const donorUser = donor ? state.users.find((item) => item.id === donor.user_id) : null;
    res.json({
      success: true,
      request: {
        ...request,
        donor_name: donorUser?.name || null,
        donor_phone: donorUser?.phone || null,
        donor_email: donorUser?.email || null,
        donor_blood_group: donor?.blood_group || null,
        donor_available: donor?.is_available ?? null
      }
    });
  } catch (error) {
    console.error('Get request details error:', error);
    res.status(500).json({ error: 'Failed to load request details' });
  }
};

// Get receiver profile
const getReceiverProfile = async (req, res) => {
  try {
    const state = await getState();
    const user = state.users.find((item) => item.id === req.user.id);
    if (!user || user.role !== 'receiver') {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    res.json({ success: true, receiver: publicUser(user, state) });
  } catch (error) {
    console.error('Get receiver profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};

module.exports = {
  getReceiverDashboard,
  searchDonors,
  getMyRequests,
  getRequestDetails,
  getReceiverProfile
};
