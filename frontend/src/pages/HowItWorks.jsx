import React from 'react';
import Navbar from '../components/Navbar';

const workflow = [
  'Farmer logs in and mandi staff records a gate entry + lot for the produce brought in.',
  'Mandi staff records the weighed quantity.',
  'A quality assessor tests the lot and issues a digital quality certificate with a grade.',
  'Mandi staff (or admin) approves the lot for auction.',
  'An auction is scheduled with a base price, reserve price and minimum bid increment.',
  'Buyers join the live auction room and place competing bids in real time.',
  'The auction closes automatically; the highest valid bidder above the reserve price wins.',
  'The winning buyer makes a simulated payment; fees and commission are calculated automatically.',
  'A settlement record is generated showing exactly what the farmer receives.',
  'A digital invoice and e-gate pass (with QR code) are issued.',
  'Logistics status is tracked from order confirmation through to delivery.',
  'Admin sees the full transaction reflected in platform-wide analytics.',
];

export default function HowItWorks() {
  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px', maxWidth: 800 }}>
        <h1 className="section-title" style={{ marginTop: 0 }}>How KrishiSetu Works</h1>
        <ol style={{ lineHeight: 1.9 }}>
          {workflow.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </div>
    </div>
  );
}
