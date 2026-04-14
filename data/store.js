const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname);
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const baseState = {
  counters: {
    users: 1,
    donors: 1,
    receivers: 1,
    requests: 1,
    appointments: 1,
    notifications: 1,
    donationHistory: 1
  },
  users: [],
  donors: [],
  receivers: [],
  requests: [],
  appointments: [],
  notifications: [],
  donationHistory: []
};

let state = null;

const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();

const ensureDataFile = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(baseState, null, 2));
  }
};

const save = () => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
};

const nextId = (key) => {
  const id = state.counters[key];
  state.counters[key] += 1;
  return id;
};

const createNotification = ({ userId, title, message, type = 'system', relatedId = null }) => {
  const notification = {
    id: nextId('notifications'),
    user_id: userId,
    title,
    message,
    type,
    related_id: relatedId,
    is_read: false,
    created_at: now()
  };
  state.notifications.push(notification);
  save();
  return clone(notification);
};

const hydrateUser = (user) => {
  if (!user) return null;

  const donor = state.donors.find((item) => item.user_id === user.id);
  const receiver = state.receivers.find((item) => item.user_id === user.id);

  return {
    ...clone(user),
    blood_group: donor?.blood_group || null,
    is_available: donor?.is_available ?? null,
    total_donations: donor?.total_donations ?? 0,
    last_donation_date: donor?.last_donation_date || null,
    next_eligible_date: donor?.next_eligible_date || null,
    medical_history: donor?.medical_history || '',
    emergency_contact_name: receiver?.emergency_contact_name || '',
    emergency_contact_phone: receiver?.emergency_contact_phone || '',
    medical_condition: receiver?.medical_condition || ''
  };
};

const publicUser = (user) => {
  const hydrated = hydrateUser(user);
  if (!hydrated) return null;
  delete hydrated.password;
  return hydrated;
};

const generateCode = (prefix, key) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}${year}${month}${String(state.counters[key]).padStart(4, '0')}`;
};

const initializeStore = async () => {
  ensureDataFile();
  state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!state.users.some((user) => user.email === 'admin@rakthata.com')) {
    const admin = {
      id: nextId('users'),
      name: 'Administrator',
      email: 'admin@rakthata.com',
      password: await bcrypt.hash('admin123', 10),
      phone: '9999999999',
      role: 'admin',
      location: 'System',
      age: 30,
      is_active: true,
      created_at: now(),
      updated_at: now()
    };
    state.users.push(admin);
    save();
  }
};

const getState = () => {
  if (!state) {
    throw new Error('Store not initialized');
  }
  return state;
};

module.exports = {
  now,
  clone,
  initializeStore,
  getState,
  nextId,
  generateCode,
  hydrateUser,
  publicUser,
  createNotification,
  save
};
