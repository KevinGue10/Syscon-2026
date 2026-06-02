const { User } = require('../models');
const { verifyToken } = require('../utils/jwt');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'User account is disabled.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

module.exports = authMiddleware;
