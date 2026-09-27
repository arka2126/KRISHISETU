import React from 'react';
import { Link } from 'react-router-dom';

const gradeColor = { 'A+': 'badge-green', A: 'badge-green', 'B+': 'badge-orange', B: 'badge-orange', C: 'badge-red' };

export default function CommodityCard({ lot }) {
  const commodityName = lot.commodity?.name || 'Commodity';
  const grade = lot.qualityReport?.grade;
  const auction = lot.auction; // optionally attached by the marketplace page

  return (
    <Link to={auction ? `/auctions/${auction._id}` : `/marketplace/lot/${lot._id}`} className="card card-hover">
      <div className="flex-between" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 17 }}>{commodityName}</strong>
        {grade && <span className={`badge ${gradeColor[grade] || 'badge-gray'}`}>Grade {grade}</span>}
      </div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Lot #{lot.lotId} · {lot.mandi}</div>
      <div className="grid grid-2" style={{ gap: 8, fontSize: 13 }}>
        <div><span className="muted">Quantity</span><br /><strong>{lot.quantity} qtl</strong></div>
        <div><span className="muted">Base Price</span><br /><strong>₹{lot.basePrice}/qtl</strong></div>
        {lot.qualityReport?.moisture !== undefined && (
          <div><span className="muted">Moisture</span><br /><strong>{lot.qualityReport.moisture}%</strong></div>
        )}
        {auction && (
          <div><span className="muted">Highest Bid</span><br /><strong>₹{auction.currentHighestBid}</strong></div>
        )}
      </div>
      {auction && (
        <div style={{ marginTop: 12 }}>
          <span className={`badge ${auction.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
            {auction.status.replace('_', ' ')}
          </span>
        </div>
      )}
    </Link>
  );
}
