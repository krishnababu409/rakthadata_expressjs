const jwt = require('jsonwebtoken');
const { getState } = require('../data/store');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const state = getState();
    const user = state.users.find((item) => item.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      is_active: user.is_active
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

// Check user role
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }
    next();
  };
};

// Check if user is donor
const isDonor = checkRole('donor');

// Check if user is receiver
const isReceiver = checkRole('receiver');

// Check if user is admin
const isAdmin = checkRole('admin');

// Optional: Check if user is donor or admin
const isDonorOrAdmin = checkRole('donor', 'admin');

// Optional: Check if user is receiver or admin
const isReceiverOrAdmin = checkRole('receiver', 'admin');

module.exports = {
  verifyToken,
  checkRole,
  isDonor,
  isReceiver,
  isAdmin,
  isDonorOrAdmin,
  isReceiverOrAdmin
};
