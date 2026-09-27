// Renders a Logistics record: progress bar across simulated waypoints, current
// status, and a timestamped history feed. Read-only display — advancing the
// shipment (mandi/admin only) is handled by the parent via onAdvance/onCreate.
//
// HONESTY NOTE (inherited from the backend model): waypoints are simulated
// checkpoints, not real GPS coordinates or a live courier feed.
import React from 'react';

const STATUS_LABELS = {
  order_confirmed: 'Order Confirmed',
  vehicle_assigned: 'Vehicle Assigned',
  pickup: 'Picked Up',
  in_transit: 'In Transit',
  arrived: 'Arrived at Destination',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function fmt(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ShipmentTracker({ logistics, onAdvance, onCancel, canManage, compact }) {
  if (!logistics) return null;

  const isTerminal = logistics.status === 'delivered' || logistics.status === 'cancelled';

  return (
    <div className={compact ? '' : 'card'} style={compact ? {} : { marginTop: 20 }}>
      <div className="flex-between">
        <div>
          <h3 style={{ margin: 0 }}>Shipment {logistics.trackingId}</h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {logistics.carrier} {logistics.vehicleNumber ? `· ${logistics.vehicleNumber}` : ''}
          </p>
        </div>
        <span className={`badge ${logistics.status === 'delivered' ? 'badge-green' : logistics.status === 'cancelled' ? 'badge-red' : 'badge-orange'}`}>
          {STATUS_LABELS[logistics.status] || logistics.status}
        </span>
      </div>

      <div className="tracker-progress">
        <div className="tracker-progress-fill" style={{ width: `${logistics.progressPercent || 0}%` }} />
      </div>
      <div className="tracker-waypoints">
        {(logistics.waypoints || []).map((wp, i) => (
          <span key={wp + i} className={i <= logistics.currentCheckpointIndex ? 'reached' : ''}>
            {wp}
          </span>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 16, fontSize: 13 }}>
        <div><span className="muted">Current Location</span><br /><strong>{logistics.currentLocation || '—'}</strong></div>
        <div><span className="muted">Expected Delivery</span><br /><strong>{logistics.expectedDelivery ? fmt(logistics.expectedDelivery) : '—'}</strong></div>
        {logistics.driverName && (
          <div><span className="muted">Driver</span><br /><strong>{logistics.driverName} {logistics.driverPhone ? `(${logistics.driverPhone})` : ''}</strong></div>
        )}
        {logistics.actualDelivery && (
          <div><span className="muted">Delivered On</span><br /><strong>{fmt(logistics.actualDelivery)}</strong></div>
        )}
      </div>

      {!compact && (logistics.history || []).length > 0 && (
        <div className="tracker-history">
          {[...logistics.history].reverse().map((h, i) => (
            <div className="tracker-history-item" key={i}>
              <strong>{STATUS_LABELS[h.status] || h.status}</strong> — {h.location}
              {h.note ? <span className="muted"> · {h.note}</span> : null}
              <div className="tracker-history-time">{fmt(h.timestamp)}</div>
            </div>
          ))}
        </div>
      )}

      {canManage && !isTerminal && (
        <div className="flex gap-8" style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => onAdvance && onAdvance(logistics)}>
            Advance to Next Checkpoint
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onCancel && onCancel(logistics)}>
            Cancel Shipment
          </button>
        </div>
      )}
    </div>
  );
}
