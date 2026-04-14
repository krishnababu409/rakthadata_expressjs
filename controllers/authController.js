const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  now,
  getState,
  nextId,
  publicUser,
  save
} = require('../data/store');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// User registration
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, location, age, bloodGroup } = req.body;
    const state = getState();

    const existingUser = state.users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: nextId('users'),
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      location,
      age: Number(age),
      is_active: true,
      created_at: now(),
      updated_at: now()
    };

    state.users.push(user);

    if (role === 'donor') {
      if (!bloodGroup) {
        return res.status(400).json({ error: 'Blood group required for donor registration' });
      }
      state.donors.push({
        id: nextId('donors'),
        user_id: user.id,
        blood_group: bloodGroup,
        is_available: true,
        total_donations: 0,
        last_donation_date: null,
        next_eligible_date: null,
        medical_history: ''
      });
    } else if (role === 'receiver') {
      state.receivers.push({
        id: nextId('receivers'),
        user_id: user.id,
        medical_condition: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
    }

    save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// User login
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const state = getState();
    const user = state.users.find((item) => item.email === email && item.is_active);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ error: `Invalid credentials for ${role} account` });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const userData = publicUser(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const state = getState();
    const user = state.users.find((item) => item.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const state = getState();
    const user = state.users.find((item) => item.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.updated_at = now();
    save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, age, bloodGroup, emergencyContactName, emergencyContactPhone } = req.body;
    const state = getState();
    const user = state.users.find((item) => item.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (age) user.age = Number(age);
    user.updated_at = now();

    if (req.user.role === 'donor') {
      const donor = state.donors.find((item) => item.user_id === req.user.id);
      if (donor && bloodGroup) donor.blood_group = bloodGroup;
    }

    if (req.user.role === 'receiver') {
      const receiver = state.receivers.find((item) => item.user_id === req.user.id);
      if (receiver) {
        if (emergencyContactName !== undefined) receiver.emergency_contact_name = emergencyContactName;
        if (emergencyContactPhone !== undefined) receiver.emergency_contact_phone = emergencyContactPhone;
      }
    }

    save();

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Logout successful' });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateProfile
};
