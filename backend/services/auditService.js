// Small helper to log important actions into the AuditLog collection
const AuditLog = require('../models/AuditLog');

async function logAction({ userId, action, entity, entityId, metadata }) {
  try {
    await AuditLog.create({ user: userId, action, entity, entityId, metadata });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
