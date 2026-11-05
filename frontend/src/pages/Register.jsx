import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const dashboardPath = {
  farmer: '/farmer/dashboard',
  buyer: '/buyer/dashboard',
  mandi_staff: '/mandi/dashboard',
  quality_assessor: '/quality/dashboard',
  admin: '/admin/dashboard',
};

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'farmer' });
  const [error, setError] = useState('');

  const handlePhoneChange = (e) => {
    // Restrict strictly to digits only, maximum 10 digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError('Phone number must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const res = await register({
      ...form,
      name: trimmedName,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
    });

    if (res.success) {
      const stored = JSON.parse(localStorage.getItem('ks_user'));
      navigate(dashboardPath[stored.role] || '/');
    } else {
      setError(res.message);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="flex-center" style={{ padding: '50px 20px' }}>
        <form className="card" style={{ maxWidth: 440, width: '100%' }} onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>Create your KrishiSetu account</h2>
          {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">I am a</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="farmer">Farmer / Seller</option>
              <option value="buyer">Buyer / Trader</option>
              <option value="mandi_staff">Mandi Staff</option>
              <option value="quality_assessor">Quality Assessor</option>
              <option value="admin">Platform Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              className="form-input"
              required
              minLength={2}
              maxLength={50}
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              required
              placeholder="e.g. ramesh@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number (10 digits)</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  padding: '9px 12px',
                  background: 'var(--gray-100)',
                  border: '1px solid var(--gray-300)',
                  borderRight: 'none',
                  borderRadius: '6px 0 0 6px',
                  fontSize: 14,
                  color: 'var(--gray-600)',
                  fontWeight: 600,
                }}
              >
                +91
              </span>
              <input
                className="form-input"
                style={{ borderRadius: '0 6px 6px 0' }}
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={handlePhoneChange}
              />
            </div>
            <span className="muted" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              Only 10 digits allowed (e.g. 9876543210)
            </span>
          </div>
          <div className="form-group">
            <label className="form-label">Password (min 6 characters)</label>
            <input
              className="form-input"
              type="password"
              minLength={6}
              required
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
