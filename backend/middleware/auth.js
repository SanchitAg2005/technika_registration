const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');

  // Check if no token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authentication token, access denied.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123456');
    req.user = decoded; // Contains registrationId, id, etc.
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is invalid or expired, access denied.' });
  }
};
