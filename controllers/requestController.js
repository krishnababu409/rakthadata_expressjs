const {
  now,
  getState,
  nextId,
  generateCode,
  createNotification,
  save
} = require('../data/store');

// Create blood request
const createRequest = async (req, res) => {
  try {
    const {
      patientName,
      patientAge,
      bloodGroup,
      unitsNeeded,
      hospitalName,
      location,
      urgency = 'normal',
      reason
    } = req.body;

    const state = await getState();
    const receiver = state.receivers.find((item) => item.user_id === req.user.id);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver profile not found' });
    }

    const request = {
      id: nextId('requests', state),
      request_number: generateCode('REQ', 'requests', state),
      receiver_id: receiver.id,
      patient_name: patientName,
      patient_age: Number(patientAge),
      blood_group: bloodGroup,
      units_needed: Number(unitsNeeded),
      hospital_name: hospitalName,
      location,
      urgency,
      status: 'pending',
      reason,
      assigned_donor_id: null,
      assigned_at: null,
      fulfilled_at: null,
      created_at: now(),
      updated_at: now()
    };

    state.requests.push(request);

    for (const donor of state.donors.filter((item) => item.blood_group === bloodGroup && item.is_available)) {
      const user = state.users.find((item) => item.id === donor.user_id && item.is_active);
      if (user) {
        await createNotification({
          userId: user.id,
          title: 'New Blood Request',
          message: `Urgent blood request for ${bloodGroup} at ${hospitalName}. ${unitsNeeded} unit(s) needed.`,
          type: 'request',
          relatedId: request.id
        }, state);
      }
    }

    await save(state);

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      requestId: request.id,
      requestNumber: request.request_number
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create blood request' });
  }
};

// Get all requests (with filters)
const getAllRequests = async (req, res) => {
  try {
    const { bloodGroup, location, urgency, status, page = 1, limit = 20 } = req.query;
    const state = await getState();
    const filtered = state.requests
      .filter((item) => (status ? item.status === status : item.status === 'pending'))
      .filter((item) => !bloodGroup || item.blood_group === bloodGroup)
      .filter((item) => !location || item.location.toLowerCase().includes(location.toLowerCase()))
      .filter((item) => !urgency || item.urgency === urgency)
      .map((item) => {
        const receiver = state.receivers.find((entry) => entry.id === item.receiver_id);
        const user = receiver ? state.users.find((entry) => entry.id === receiver.user_id) : null;
        return {
          ...item,
          receiver_name: user?.name || null,
          receiver_phone: user?.phone || null
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (Number(page) - 1) * Number(limit);
    const requests = filtered.slice(start, start + Number(limit));

    res.json({
      success: true,
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Failed to load requests' });
  }
};

// Get request by ID
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await getState();
    const request = state.requests.find((item) => item.id === Number(id));
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const receiver = state.receivers.find((item) => item.id === request.receiver_id);
    const receiverUser = receiver ? state.users.find((item) => item.id === receiver.user_id) : null;
    const donor = state.donors.find((item) => item.id === request.assigned_donor_id);
    const donorUser = donor ? state.users.find((item) => item.id === donor.user_id) : null;

    res.json({
      success: true,
      request: {
        ...request,
        receiver_name: receiverUser?.name || null,
        receiver_phone: receiverUser?.phone || null,
        receiver_email: receiverUser?.email || null,
        donor_name: donorUser?.name || null,
        donor_phone: donorUser?.phone || null,
        donor_blood_group: donor?.blood_group || null
      }
    });
  } catch (error) {
    console.error('Get request by ID error:', error);
    res.status(500).json({ error: 'Failed to load request' });
  }
};

// Respond to request (donor)
const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await getState();
    const donor = state.donors.find((item) => item.user_id === req.user.id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }
    const request = state.requests.find((item) => item.id === Number(id) && item.status === 'pending');
    if (!request) {
      return res.status(404).json({ error: 'Request not found or already assigned' });
    }
    request.assigned_donor_id = donor.id;
    request.status = 'assigned';
    request.assigned_at = now();
    request.updated_at = now();
    const receiver = state.receivers.find((item) => item.id === request.receiver_id);
    if (receiver) {
      await createNotification({
        userId: receiver.user_id,
        title: 'Donor Responded',
        message: `A donor with blood group ${donor.blood_group} has responded to your blood request.`,
        type: 'response',
        relatedId: request.id
      }, state);
    }
    await save(state);

    res.json({
      success: true,
      message: 'Successfully responded to blood request'
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};

// Update request status
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const state = await getState();
    const request = state.requests.find((item) => item.id === Number(id));

    const validStatuses = ['pending', 'assigned', 'fulfilled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = status;
    request.updated_at = now();

    if (status === 'fulfilled') {
      request.fulfilled_at = now();
      const donor = state.donors.find((item) => item.id === request.assigned_donor_id);
      if (donor) {
        donor.total_donations += 1;
        donor.last_donation_date = new Date().toISOString().slice(0, 10);
        donor.next_eligible_date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        state.donationHistory.push({
          id: nextId('donationHistory', state),
          donor_id: donor.id,
          appointment_id: null,
          donation_date: new Date().toISOString().slice(0, 10),
          hospital_name: request.hospital_name,
          blood_group: request.blood_group,
          units_donated: request.units_needed,
          created_at: now()
        });
      }
    }

    await save(state);

    res.json({
      success: true,
      message: `Request status updated to ${status}`
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  getRequestById,
  respondToRequest,
  updateRequestStatus
};
