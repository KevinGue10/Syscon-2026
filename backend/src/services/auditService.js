const { AuditLog } = require('../models');

const createAuditLog = async ({ userId, action, entity, entityId, oldValue = null, newValue = null }, options = {}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId: String(entityId),
      oldValue,
      newValue,
    }, { transaction: options.transaction });
  } catch (error) {
    // A failed statement can invalidate a transaction; let its owner roll back.
    if (options.transaction) throw error;
    console.error('Audit log creation failed:', error.message);
  }
};

module.exports = {
  createAuditLog,
};
