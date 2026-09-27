// The live, real-time bidding room. Uses Socket.IO for instant updates across
// every connected buyer, but the server (not this component) is the source of truth.
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api, { isNetworkError } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return remaining;
}

export default function AuctionRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState('');
  const socketRef = useRef(null);

  const countdown = useCountdown(auction?.endTime);

  const loadAuction = React.useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get(`/auctions/${id}`);
      setAuction(data.data.auction);
      setBids(data.data.bids);
      setBidAmount(data.data.auction.currentHighestBid + data.data.auction.minimumIncrement);
    } catch (err) {
      setLoadError(
        isNetworkError(err)
          ? "Couldn't reach the server — check your connection and try again."
          : err.response?.data?.message || 'Failed to load this auction.'
      );
    }
  }, [id]);

  useEffect(() => { loadAuction(); }, [loadAuction]);

  useEffect(() => {
    if (!user) return; // only authenticated users get a live socket connection
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    socket.on('connect', () => { setConnected(true); socket.emit('joinAuction', id); });
    socket.on('disconnect', () => setConnected(false));

    const onNewBid = (payload) => {
      if (payload.auctionId !== id) return;
      setAuction((prev) => prev && ({
        ...prev,
        currentHighestBid: payload.currentHighestBid,
        highestBidder: { name: payload.buyer.name },
        bidCount: payload.bidCount,
      }));
      setBids((prev) => [{ amount: payload.amount, buyer: payload.buyer, timestamp: payload.timestamp }, ...prev]);
      setBidAmount(payload.nextMinimumBid);
    };
    const onClosed = (payload) => {
      if (payload.auctionId !== id) return;
      setAuction((prev) => prev && ({ ...prev, status: payload.status }));
    };

    socket.on('newBid', onNewBid);
    socket.on('auctionClosed', onClosed);

    if (socket.connected) { setConnected(true); socket.emit('joinAuction', id); }

    return () => {
      socket.emit('leaveAuction', id);
      socket.off('newBid', onNewBid);
      socket.off('auctionClosed', onClosed);
    };
  }, [id, user]);

  const placeBid = () => {
    setStatus('');
    const amount = Number(bidAmount);
    if (!socketRef.current || !socketRef.current.connected) {
      setStatus('Not connected — please refresh.');
      return;
    }
    socketRef.current.emit('placeBid', { auctionId: id, amount }, (res) => {
      if (!res.success) setStatus(res.message);
      else setStatus('');
    });
  };

  if (loadError) {
    return (
      <div>
        <Navbar />
        <div className="container" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted">{loadError}</p>
          <button className="btn btn-secondary" onClick={loadAuction}>Retry</button>
        </div>
      </div>
    );
  }

  if (!auction) return <div><Navbar /><p className="container muted" style={{ padding: 40 }}>Loading auction…</p></div>;

  const lot = auction.lot;
  const isBuyer = user?.role === 'buyer';
  const isActive = auction.status === 'active';

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px' }}>
        <div className="grid grid-cols-wide-responsive" style={{ gap: 24 }}>
          <div className="card">
            <div className="flex-between">
              <div>
                <h2 style={{ margin: '0 0 4px' }}>{lot?.commodity?.name}</h2>
                <div className="muted">Lot #{lot?.lotId} · {lot?.mandi} · Seller: {lot?.farmer?.name}</div>
              </div>
              <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>{auction.status.replace('_', ' ')}</span>
            </div>

            <div className="grid grid-3" style={{ marginTop: 20, fontSize: 14 }}>
              <div><span className="muted">Quantity</span><br /><strong>{lot?.quantity} qtl</strong></div>
              <div><span className="muted">Quality Grade</span><br /><strong>{lot?.qualityReport?.grade || '—'}</strong></div>
              <div><span className="muted">Base Price</span><br /><strong>₹{auction.basePrice}</strong></div>
            </div>

            <div className="card" style={{ background: 'var(--green-100)', marginTop: 20, textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 13 }}>Current Bid</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--green-700)' }}>₹{auction.currentHighestBid} / quintal</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Next minimum bid: ₹{auction.currentHighestBid + auction.minimumIncrement} ·
                {' '}{auction.bidCount || 0} bids · Bidders live: {connected ? 'connected' : 'connecting…'}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Time remaining: <strong>{countdown}</strong></div>
            </div>

            {isBuyer && isActive && (
              <div className="flex gap-12" style={{ marginTop: 20, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Your bid (₹/quintal)</label>
                  <input className="form-input" type="number" value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={auction.currentHighestBid + auction.minimumIncrement} />
                </div>
                <button className="btn btn-accent" onClick={placeBid}>PLACE BID</button>
              </div>
            )}
            {status && <div className="badge badge-red" style={{ marginTop: 10 }}>{status}</div>}
            {!isBuyer && <p className="muted" style={{ marginTop: 16 }}>Log in as a buyer to place bids.</p>}
            {isBuyer && !isActive && <p className="muted" style={{ marginTop: 16 }}>This auction is not currently active.</p>}
          </div>

          <div className="card">
            <strong>Bid History</strong>
            <div style={{ marginTop: 12, maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Buyer</th><th>Amount</th></tr></thead>
                <tbody>
                  {bids.map((b, i) => (
                    <tr key={i}>
                      <td>{b.buyer?.name}</td>
                      <td>₹{b.amount}</td>
                    </tr>
                  ))}
                  {bids.length === 0 && <tr><td colSpan={2} className="muted">No bids yet — be the first!</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
