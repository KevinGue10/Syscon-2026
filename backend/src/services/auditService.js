const { AuditLog } = require('../models');

const createAuditLog = async ({ userId, action, entity, entityId, oldValue = null, newValue = null }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId: String(entityId),
      oldValue,
      newValue,
    });
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};

module.exports = {
  createAuditLog,
};
