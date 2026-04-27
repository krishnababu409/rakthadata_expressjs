const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// User registration validation
const validateRegister = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ max: 15 })
    .withMessage('Phone must be at most 15 characters'),
  body('role').isIn(['donor', 'receiver']).withMessage('Role must be donor or receiver'),
  body('location').notEmpty().withMessage('Location is required'),
  body('age').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

// Blood request validation
const validateBloodRequest = [
  body('patientName').notEmpty().withMessage('Patient name required'),
  body('patientAge').isInt({ min: 0, max: 120 }).withMessage('Valid age required'),
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  body('unitsNeeded').isInt({ min: 1, max: 10 }).withMessage('Units must be between 1 and 10'),
  body('hospitalName').notEmpty().withMessage('Hospital name required'),
  body('location').notEmpty().withMessage('Location required'),
  body('urgency').optional().isIn(['critical', 'urgent', 'normal']),
  handleValidationErrors
];

// Appointment validation
const validateAppointment = [
  body('hospitalName').notEmpty().withMessage('Hospital name required'),
  body('location').notEmpty().withMessage('Location required'),
  body('appointmentDate').isDate().withMessage('Valid date required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time required (HH:MM)'),
  handleValidationErrors
];

// Update profile validation
const validateProfileUpdate = [
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().isLength({ max: 15 }),
  body('location').optional().notEmpty(),
  body('age').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 120 }),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  handleValidationErrors
];

// ID param validation
const validateIdParam = [
  param('id').isInt().withMessage('Valid ID required'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateBloodRequest,
  validateAppointment,
  validateProfileUpdate,
  validateIdParam,
  validatePagination
};
