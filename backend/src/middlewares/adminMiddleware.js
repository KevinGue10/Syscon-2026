const { USER_ROLES } = require('../constants/enums');

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
};

module.exports = adminMiddleware;
