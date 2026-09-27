// A won lot's detail page: shows quality report, walks the winning buyer through
// the mock payment gateway (initiate -> "checkout" -> verify, with retry on
// failure), then shows invoice/settlement and live shipment tracking once paid.
// Mandi staff/admin can create the shipment record and advance it from here too.
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ShipmentTracker from '../components/ShipmentTracker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export default function LotDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [lot, setLot] = useState(null);
  const [auction, setAuction] = useState(null);
  const [payment, setPayment] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [logistics, setLogistics] = useState(null);

  const [method, setMethod] = useState('upi');
  const [gatewayOrder, setGatewayOrder] = useState(null); // set once /initiate returns — shows the mock checkout step
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const [shipForm, setShipForm] = useState({ pickupLocation: '', destination: '', vehicleNumber: '', driverName: '', driverPhone: '', expectedDelivery: '' });
  const [creatingShipment, setCreatingShipment] = useState(false);

  const loadPaymentAndLogistics = useCallback(async (lotId) => {
    try {
      const filter = user.role === 'buyer' ? { buyer: user.id } : user.role === 'farmer' ? { seller: user.id } : {};
      const { data } = await api.get('/payments', { params: filter });
      const found = data.data.find((p) => (p.lot?._id || p.lot) === lotId);
      if (found) {
        setPayment(found);
        if (found.status === 'paid') {
          try {
            const logRes = await api.get(`/logistics/${lotId}`);
            setLogistics(logRes.data.data);
          } catch {
            setLogistics(null); // no shipment created yet — fine, mandi/admin will create it below
          }
        }
      }
    } catch {
      // demo dataset — non-fatal if this lookup fails
    }
  }, [user]);

  useEffect(() => {
    api.get(`/lots/${id}`).then((r) => setLot(r.data.data));
    api.get('/auctions', { params: { status: 'closed_sold' } }).then((r) => {
      const found = r.data.data.find((a) => a.lot?._id === id);
      if (found) setAuction(found);
    });
    loadPaymentAndLogistics(id);
  }, [id, loadPaymentAndLogistics]);

  const canPay = auction && user?.role === 'buyer' && String(auction.highestBidder?._id || auction.highestBidder) === String(user.id);
  const canManageShipment = user?.role === 'mandi_staff' || user?.role === 'admin';

  // Step 1: create a gateway order (POST /payments/initiate)
  const startPayment = async () => {
    setError('');
    try {
      const { data } = await api.post('/payments/initiate', { auctionId: auction._id, paymentMethod: method });
      setPayment(data.data.payment);
      setGatewayOrder(data.data.gatewayOrder);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start payment.');
    }
  };

  // Step 2: the mock gateway's callback (POST /payments/:id/verify). `outcome` lets
  // this demo trigger either path deterministically, same as a real "test card" would.
  const verify = async (outcome) => {
    setVerifying(true);
    setError('');
    try {
      const { data } = await api.post(`/payments/${payment._id}/verify`, { outcome });
      setPayment(data.data.payment);
      if (data.data.outcome === 'success') {
        setSettlement(data.data.settlement);
        setGatewayOrder(null);
      } else {
        setError(`Payment failed: ${data.data.reason}. You can retry below.`);
        setGatewayOrder(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const createShipment = async (e) => {
    e.preventDefault();
    setCreatingShipment(true);
    try {
      const { data } = await api.post('/logistics', { lot: lot._id, ...shipForm });
      setLogistics(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create shipment.');
    } finally {
      setCreatingShipment(false);
    }
  };

  const advanceShipment = async (record) => {
    const { data } = await api.post(`/logistics/${record._id}/advance`, {});
    setLogistics(data.data);
  };

  const cancelShipment = async (record) => {
    const { data } = await api.put(`/logistics/${record._id}`, { status: 'cancelled', note: 'Cancelled by mandi/admin' });
    setLogistics(data.data);
  };

  if (!lot) return <div><Navbar /><p className="container muted" style={{ padding: 40 }}>Loading…</p></div>;

  const isPaid = payment?.status === 'paid';
  const isProcessing = payment?.status === 'processing';
  const isFailed = payment?.status === 'failed';

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px', maxWidth: 700 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{lot.commodity?.name} — Lot #{lot.lotId}</h2>
          <p className="muted">{lot.mandi} · Seller: {lot.farmer?.name}</p>
          <div className="grid grid-2" style={{ fontSize: 14 }}>
            <div><span className="muted">Quantity</span><br /><strong>{lot.quantity} qtl</strong></div>
            <div><span className="muted">Quality Grade</span><br /><strong>{lot.qualityReport?.grade || '—'}</strong></div>
            <div><span className="muted">Base Price</span><br /><strong>₹{lot.basePrice}</strong></div>
            <div><span className="muted">Status</span><br /><span className="badge badge-green">{lot.status}</span></div>
          </div>
        </div>

        {error && <div className="badge badge-red" style={{ marginTop: 16, display: 'block', padding: 12 }}>{error}</div>}

        {/* Step 1: choose method + start payment */}
        {canPay && !payment && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Payment Summary</h3>
            <p className="muted">Commodity value, mandi fee and platform fee will be calculated automatically at ₹{auction.currentHighestBid}/qtl × {lot.quantity} qtl.</p>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={startPayment}>PAY NOW</button>
          </div>
        )}

        {/* Step 2: mock gateway "checkout" — stands in for a redirect to a real gateway page */}
        {canPay && gatewayOrder && isProcessing && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Complete Payment</h3>
            <div className="gateway-box">
              <p className="muted">
                Redirecting to <strong>{gatewayOrder.provider}</strong> — Order {gatewayOrder.gatewayOrderId} · ₹{payment.totalAmount} via {payment.paymentMethod.replace('_', ' ')}
              </p>
              <p className="muted" style={{ fontSize: 12 }}>This is a simulated gateway — no real bank connection exists. Use the buttons below to simulate the bank's response.</p>
              <div className="flex gap-8 flex-center">
                <button className="btn btn-primary" disabled={verifying} onClick={() => verify('success')}>Simulate Successful Payment</button>
                <button className="btn btn-secondary" disabled={verifying} onClick={() => verify('fail')}>Simulate Failed Payment</button>
              </div>
            </div>
          </div>
        )}

        {/* Failed payment: allow retry */}
        {canPay && isFailed && !gatewayOrder && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Payment Failed</h3>
            <p className="muted">Reason: {payment.gateway?.failureReason || 'Unknown error'}. You can retry with the same or a different method.</p>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={startPayment}>Retry Payment</button>
          </div>
        )}

        {/* Success: invoice + settlement */}
        {isPaid && (
          <div className="card" style={{ marginTop: 20, border: '2px solid var(--green-600)' }}>
            <div className="badge badge-green" style={{ marginBottom: 12 }}>PAID</div>
            <p><strong>Transaction ID:</strong> {payment.transactionId}</p>
            <p><strong>Gateway Transaction:</strong> {payment.gateway?.transactionId}</p>
            <p><strong>Invoice ID:</strong> {payment.invoiceId}</p>
            <table style={{ marginTop: 10 }}>
              <tbody>
                <tr><td>Commodity Value</td><td>₹{payment.commodityValue}</td></tr>
                <tr><td>Mandi Fee</td><td>₹{payment.mandiFee}</td></tr>
                <tr><td>Platform Fee</td><td>₹{payment.platformFee}</td></tr>
                <tr><td><strong>Total</strong></td><td><strong>₹{payment.totalAmount}</strong></td></tr>
              </tbody>
            </table>
            {settlement && (
              <div className="card" style={{ marginTop: 16, background: 'var(--gray-100)' }}>
                <strong>Farmer Settlement (simulated)</strong>
                <p className="muted" style={{ fontSize: 13 }}>
                  Gross ₹{settlement.grossAmount} − Mandi Fee ₹{settlement.mandiFee} − Platform Fee ₹{settlement.platformFee}
                  {' '}− Commission ₹{settlement.commission} = <strong>Farmer receives ₹{settlement.farmerAmount}</strong>
                </p>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => window.print()}>Download Invoice (Print)</button>
          </div>
        )}

        {/* Shipment tracking — visible to anyone once a logistics record exists */}
        {isPaid && logistics && (
          <ShipmentTracker
            logistics={logistics}
            canManage={canManageShipment}
            onAdvance={advanceShipment}
            onCancel={cancelShipment}
          />
        )}

        {/* Mandi/Admin: create the shipment once paid but before logistics exists */}
        {isPaid && !logistics && canManageShipment && (
          <form className="card" style={{ marginTop: 20 }} onSubmit={createShipment}>
            <h3 style={{ marginTop: 0 }}>Create Shipment</h3>
            <p className="muted" style={{ fontSize: 13 }}>Set up simulated logistics tracking for this paid lot.</p>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Pickup Location</label>
                <input className="form-input" value={shipForm.pickupLocation} onChange={(e) => setShipForm((f) => ({ ...f, pickupLocation: e.target.value }))} placeholder={lot.mandi} required />
              </div>
              <div className="form-group">
                <label className="form-label">Destination</label>
                <input className="form-input" value={shipForm.destination} onChange={(e) => setShipForm((f) => ({ ...f, destination: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input className="form-input" value={shipForm.vehicleNumber} onChange={(e) => setShipForm((f) => ({ ...f, vehicleNumber: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Expected Delivery</label>
                <input type="date" className="form-input" value={shipForm.expectedDelivery} onChange={(e) => setShipForm((f) => ({ ...f, expectedDelivery: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input className="form-input" value={shipForm.driverName} onChange={(e) => setShipForm((f) => ({ ...f, driverName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Driver Phone</label>
                <input className="form-input" value={shipForm.driverPhone} onChange={(e) => setShipForm((f) => ({ ...f, driverPhone: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={creatingShipment}>
              {creatingShipment ? 'Creating…' : 'Create Shipment & Start Tracking'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
