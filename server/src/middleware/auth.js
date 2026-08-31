const jwt = require('jsonwebtoken');
const db = require('../db');
const { ROLES, WARDEN_ROLE_TO_HOSTEL } = require('../constants');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, hostel_id: user.hostel_id, student_id: user.student_id },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

// For warden roles, returns the hostel_id they are scoped to; ADMIN gets null (no restriction).
function scopedHostelId(user) {
  if (user.role === ROLES.ADMIN) return null;
  if (WARDEN_ROLE_TO_HOSTEL[user.role]) return user.hostel_id;
  return undefined; // students / unexpected roles: caller decides
}

module.exports = { authenticate, authorize, signToken, scopedHostelId, JWT_SECRET };
