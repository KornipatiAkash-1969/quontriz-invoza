const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quontriz-invoza-jwt-fallback-key-2026';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'quontriz-invoza-jwt-fallback-key-2026')) {
  console.warn('[SECURITY ALERT] Running in production with default/missing JWT_SECRET! Configure JWT_SECRET in environment variables immediately.');
}

/**
 * Calculates the next upcoming 12:00 AM (midnight) timestamp.
 * Every day at night 12:00 AM, the session expires for both Owner and Staff.
 */
function getNextMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0); // 12:00:00 AM tomorrow
  return nextMidnight;
}

function generateToken(user) {
  const role = (user.role === 'employee' ? 'staff' : user.role).toLowerCase();
  const nextMidnight = getNextMidnight();
  // Exact 12:00:00 AM midnight timestamp in Unix epoch seconds
  const midnightUnixSeconds = Math.floor(nextMidnight.getTime() / 1000);

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      expiresAt: nextMidnight.getTime(),
      midnightExp: nextMidnight.toISOString(),
      exp: midnightUnixSeconds,
    },
    JWT_SECRET
  );
}

function verifyToken(req, res, next) {
  let token = null;

  // 1. Check cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.role === 'employee') decoded.role = 'staff';
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: isExpired
        ? 'Daily session expired at midnight (12:00 AM). Please log in again to generate a new active session.'
        : 'Session expired or invalid token. Please log in again.',
      code: isExpired ? 'SESSION_EXPIRED_MIDNIGHT' : 'INVALID_TOKEN',
    });
  }
}

function optionalToken(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.role === 'employee') decoded.role = 'staff';
      req.user = decoded;
    } catch (_) {}
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Please sign in.' });
    }
    const userRole = (req.user.role === 'employee' ? 'staff' : req.user.role).toLowerCase();
    const normalizedRoles = roles.map(r => (r === 'employee' ? 'staff' : r).toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires ${roles.join(' or ')} permission.`,
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  getNextMidnight,
  generateToken,
  verifyToken,
  optionalToken,
  requireRole,
};
