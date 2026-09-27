import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const steps = [
  { title: 'Farmer registers produce', desc: 'Gate entry and lot creation at the local mandi.' },
  { title: 'Quality certified', desc: 'An independent assessor grades moisture, purity and quality.' },
  { title: 'Live digital auction', desc: 'Verified buyers bid in real time until the auction closes.' },
  { title: 'Payment & settlement', desc: 'Simulated payment, automatic fee deduction and farmer payout.' },
];

export default function Landing() {
  return (
    <div>
      <Navbar />
      <section className="hero">
        <h1>India's Digital Bridge Between Farmers and Markets</h1>
        <p>Transparent price discovery, digital auctions, quality assurance and faster agricultural trade — all in one platform.</p>
        <div className="hero-actions">
          <Link to="/marketplace" className="btn btn-accent">Explore Marketplace</Link>
          <Link to="/register" className="btn btn-secondary" style={{ background: 'white' }}>Sell Your Produce</Link>
        </div>
      </section>

      <section className="container" style={{ padding: '60px 20px' }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>How KrishiSetu Works</h2>
        <div className="grid grid-4">
          {steps.map((s, i) => (
            <div className="card" key={s.title}>
              <div className="badge badge-green" style={{ marginBottom: 10 }}>Step {i + 1}</div>
              <strong>{s.title}</strong>
              <p className="muted" style={{ fontSize: 14 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ padding: '0 20px 60px' }}>
        <div className="card" style={{ background: 'var(--green-100)', textAlign: 'center', padding: 40 }}>
          <h2 style={{ marginTop: 0 }}>Connecting Farms. Creating Markets. Empowering Farmers.</h2>
          <p className="muted">A demo/prototype platform inspired by India's National Agriculture Market concept.</p>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </section>

      <footer style={{ background: 'var(--green-900)', color: 'white', padding: '24px 20px', textAlign: 'center', fontSize: 13 }}>
        © {new Date().getFullYear()} KrishiSetu — Prototype/demo platform. Not affiliated with any government body.
      </footer>
    </div>
  );
}
