const { getPool } = require('../config/db');

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

const clone = (value) => JSON.parse(JSON.stringify(value));
const asBoolean = (value) => Boolean(Number(value));
const pad = (value) => String(value).padStart(2, '0');

const toMysqlDateTime = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const toMysqlDate = (value) => {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return value;
  }

  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toMysqlTime = (value) => {
  if (!value) {
    return null;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(String(value))) {
    return value;
  }

  if (/^\d{2}:\d{2}$/.test(String(value))) {
    return `${value}:00`;
  }

  const date = new Date(`1970-01-01T${value}`);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const now = () => toMysqlDateTime();

const syncCounters = (targetState) => {
  const nextFrom = (items) => {
    const maxId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    return maxId + 1;
  };

  targetState.counters = {
    users: Math.max(targetState.counters.users || 1, nextFrom(targetState.users)),
    donors: Math.max(targetState.counters.donors || 1, nextFrom(targetState.donors)),
    receivers: Math.max(targetState.counters.receivers || 1, nextFrom(targetState.receivers)),
    requests: Math.max(targetState.counters.requests || 1, nextFrom(targetState.requests)),
    appointments: Math.max(targetState.counters.appointments || 1, nextFrom(targetState.appointments)),
    notifications: Math.max(targetState.counters.notifications || 1, nextFrom(targetState.notifications)),
    donationHistory: Math.max(targetState.counters.donationHistory || 1, nextFrom(targetState.donationHistory))
  };
};

const loadStateFromDatabase = async () => {
  const pool = await getPool();
  const [users] = await pool.query('SELECT * FROM users ORDER BY id');
  const [donors] = await pool.query('SELECT * FROM donors ORDER BY id');
  const [receivers] = await pool.query('SELECT * FROM receivers ORDER BY id');
  const [requests] = await pool.query('SELECT * FROM blood_requests ORDER BY id');
  const [appointments] = await pool.query('SELECT * FROM appointments ORDER BY id');
  const [notifications] = await pool.query('SELECT * FROM notifications ORDER BY id');
  const [donationHistory] = await pool.query('SELECT * FROM donation_history ORDER BY id');

  const loadedState = {
    counters: { ...baseState.counters },
    users: users.map((item) => ({ ...item, is_active: asBoolean(item.is_active) })),
    donors: donors.map((item) => ({ ...item, is_available: asBoolean(item.is_available) })),
    receivers,
    requests,
    appointments,
    notifications: notifications.map((item) => ({ ...item, is_read: asBoolean(item.is_read) })),
    donationHistory
  };

  syncCounters(loadedState);
  return loadedState;
};

const insertMany = async (connection, table, columns, rows) => {
  if (!rows.length) {
    return;
  }

  const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  const values = rows.flatMap((row) => columns.map((column) => row[column]));

  await connection.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`,
    values
  );
};

const save = async (currentState) => {
  syncCounters(currentState);

  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const tables = [
      'donation_history',
      'notifications',
      'appointments',
      'blood_requests',
      'receivers',
      'donors',
      'users'
    ];

    for (const table of tables) {
      await connection.query(`DELETE FROM ${table}`);
    }

    await insertMany(connection, 'users', [
      'id',
      'name',
      'email',
      'password',
      'phone',
      'role',
      'location',
      'age',
      'is_active',
      'last_login',
      'created_at',
      'updated_at'
    ], currentState.users.map((item) => ({
      ...item,
      is_active: item.is_active ? 1 : 0,
      last_login: item.last_login ? toMysqlDateTime(item.last_login) : null,
      created_at: toMysqlDateTime(item.created_at),
      updated_at: toMysqlDateTime(item.updated_at)
    })));

    await insertMany(connection, 'donors', [
      'id',
      'user_id',
      'blood_group',
      'is_available',
      'total_donations',
      'last_donation_date',
      'next_eligible_date',
      'medical_history'
    ], currentState.donors.map((item) => ({
      ...item,
      is_available: item.is_available ? 1 : 0,
      last_donation_date: toMysqlDate(item.last_donation_date),
      next_eligible_date: toMysqlDate(item.next_eligible_date)
    })));

    await insertMany(connection, 'receivers', [
      'id',
      'user_id',
      'medical_condition',
      'emergency_contact_name',
      'emergency_contact_phone'
    ], currentState.receivers);

    await insertMany(connection, 'blood_requests', [
      'id',
      'request_number',
      'receiver_id',
      'patient_name',
      'patient_age',
      'blood_group',
      'units_needed',
      'hospital_name',
      'location',
      'urgency',
      'status',
      'reason',
      'assigned_donor_id',
      'assigned_at',
      'fulfilled_at',
      'created_at',
      'updated_at'
    ], currentState.requests.map((item) => ({
      ...item,
      assigned_at: item.assigned_at ? toMysqlDateTime(item.assigned_at) : null,
      fulfilled_at: item.fulfilled_at ? toMysqlDateTime(item.fulfilled_at) : null,
      created_at: toMysqlDateTime(item.created_at),
      updated_at: toMysqlDateTime(item.updated_at)
    })));

    await insertMany(connection, 'appointments', [
      'id',
      'appointment_number',
      'donor_id',
      'receiver_id',
      'hospital_name',
      'location',
      'appointment_date',
      'appointment_time',
      'status',
      'notes',
      'created_at',
      'updated_at'
    ], currentState.appointments.map((item) => ({
      ...item,
      appointment_date: toMysqlDate(item.appointment_date),
      appointment_time: toMysqlTime(item.appointment_time),
      created_at: toMysqlDateTime(item.created_at),
      updated_at: toMysqlDateTime(item.updated_at)
    })));

    await insertMany(connection, 'notifications', [
      'id',
      'user_id',
      'title',
      'message',
      'type',
      'related_id',
      'is_read',
      'created_at'
    ], currentState.notifications.map((item) => ({
      ...item,
      is_read: item.is_read ? 1 : 0,
      created_at: toMysqlDateTime(item.created_at)
    })));

    await insertMany(connection, 'donation_history', [
      'id',
      'donor_id',
      'appointment_id',
      'donation_date',
      'hospital_name',
      'blood_group',
      'units_donated',
      'created_at'
    ], currentState.donationHistory.map((item) => ({
      ...item,
      donation_date: toMysqlDate(item.donation_date),
      created_at: toMysqlDateTime(item.created_at)
    })));

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const nextId = (key, currentState) => {
  const id = currentState.counters[key];
  currentState.counters[key] += 1;
  return id;
};

const hydrateUser = (user, currentState) => {
  if (!user) {
    return null;
  }

  const donor = currentState.donors.find((item) => item.user_id === user.id);
  const receiver = currentState.receivers.find((item) => item.user_id === user.id);

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

const publicUser = (user, currentState) => {
  const hydrated = hydrateUser(user, currentState);

  if (!hydrated) {
    return null;
  }

  delete hydrated.password;
  return hydrated;
};

const generateCode = (prefix, key, currentState) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}${year}${month}${String(currentState.counters[key]).padStart(4, '0')}`;
};

const createNotification = async ({ userId, title, message, type = 'system', relatedId = null }, currentState) => {
  const notification = {
    id: nextId('notifications', currentState),
    user_id: userId,
    title,
    message,
    type,
    related_id: relatedId,
    is_read: false,
    created_at: now()
  };

  currentState.notifications.push(notification);
  await save(currentState);

  return clone(notification);
};

const initializeStore = async () => {
  await loadStateFromDatabase();
};

const getState = async () => loadStateFromDatabase();

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
