// Generates human-readable, prefixed unique IDs used across the platform
// e.g. LOT-2026-00001, TXN-XXXXXXXX, GATE-2026-00001
const { v4: uuidv4 } = require('uuid');

function shortId(len = 8) {
  return uuidv4().replace(/-/g, '').slice(0, len).toUpperCase();
}

function lotId() {
  const year = new Date().getFullYear();
  return `LOT-${year}-${shortId(5)}`;
}

function gateEntryId() {
  const year = new Date().getFullYear();
  return `GATE-${year}-${shortId(5)}`;
}

function txnId() {
  return `TXN-${shortId(8)}`;
}

function invoiceId() {
  const year = new Date().getFullYear();
  return `INV-${year}-${shortId(5)}`;
}

function gatePassId() {
  const year = new Date().getFullYear();
  return `GP-${year}-${shortId(5)}`;
}

function trackingId() {
  const year = new Date().getFullYear();
  return `TRK-${year}-${shortId(6)}`;
}

function gatewayOrderId() {
  return `GTW-${shortId(10)}`;
}

module.exports = { shortId, lotId, gateEntryId, txnId, invoiceId, gatePassId, trackingId, gatewayOrderId };
