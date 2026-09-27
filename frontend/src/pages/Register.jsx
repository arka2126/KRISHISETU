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

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(form);
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
            <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Password (min 6 characters)</label>
            <input className="form-input" type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
