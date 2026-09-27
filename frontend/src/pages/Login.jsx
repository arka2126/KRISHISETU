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

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
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
      <div className="flex-center" style={{ padding: '60px 20px' }}>
        <form className="card" style={{ maxWidth: 400, width: '100%' }} onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>Login to KrishiSetu</h2>
          {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="farmer1@krishisetu.demo" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Demo@123" />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            No account? <Link to="/register">Register here</Link>
          </p>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Demo accounts (password <code>Demo@123</code>): admin@krishisetu.demo, farmer1@krishisetu.demo,
            buyer1@krishisetu.demo, mandi1@krishisetu.demo, assessor1@krishisetu.demo
          </p>
        </form>
      </div>
    </div>
  );
}
