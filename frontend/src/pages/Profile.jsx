// Shared profile page for every role: edit personal info, the fields relevant
// to that role (farm/bank details for farmers, business details for buyers &
// mandi staff), and change password. Backed by PUT /api/auth/profile and
// PUT /api/auth/change-password.
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  farmer: 'Farmer',
  buyer: 'Trader / Buyer',
  mandi_staff: 'Mandi Staff',
  quality_assessor: 'Quality Inspector',
  admin: 'Administrator',
};

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    api.get('/auth/me').then((res) => {
      setMe(res.data.user);
      setForm({
        name: res.data.user.name || '',
        phone: res.data.user.phone || '',
        address: res.data.user.address || {},
        farmDetails: res.data.user.farmDetails || {},
        bankDetails: res.data.user.bankDetails || {},
        businessDetails: res.data.user.businessDetails || {},
      });
    });
  }, []);

  const setField = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      if (path.includes('.')) {
        const [group, key] = path.split('.');
        next[group] = { ...next[group], [key]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const payload = { name: form.name, phone: form.phone, address: form.address };
      if (me.role === 'farmer') {
        payload.farmDetails = form.farmDetails;
        payload.bankDetails = form.bankDetails;
      }
      if (me.role === 'buyer' || me.role === 'mandi_staff') {
        payload.businessDetails = form.businessDetails;
      }
      const { data } = await api.put('/auth/profile', payload);
      setMe(data.user);
      updateUser({ name: data.user.name });
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Could not update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Could not change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  if (!user) return null;
  if (!me || !form) {
    return (
      <div>
        <Navbar />
        <p className="container muted" style={{ padding: 40 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px', maxWidth: 760 }}>
        <h1 className="section-title" style={{ marginTop: 0 }}>My Profile</h1>

        <div className="card flex" style={{ gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div className="logo-mark" style={{ width: 56, height: 56, fontSize: 24 }}>
            {me.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{me.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{me.email}</div>
            <span className="badge badge-green" style={{ marginTop: 6, display: 'inline-block' }}>
              {ROLE_LABELS[me.role] || me.role}
            </span>
          </div>
        </div>

        <form className="card" onSubmit={saveProfile}>
          <h3 style={{ marginTop: 0 }}>Personal Details</h3>
          {profileMsg && (
            <div className={`badge ${profileMsg.type === 'success' ? 'badge-green' : 'badge-red'}`} style={{ marginBottom: 12 }}>
              {profileMsg.text}
            </div>
          )}
          <div className="grid grid-2">
            <Field label="Full Name" value={form.name} onChange={(v) => setField('name', v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => setField('phone', v)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email (cannot be changed)</label>
            <input className="form-input" value={me.email} disabled />
          </div>

          <h3>Address</h3>
          <div className="grid grid-2">
            <Field label="Address Line 1" value={form.address.line1} onChange={(v) => setField('address.line1', v)} />
            <Field label="City" value={form.address.city} onChange={(v) => setField('address.city', v)} />
            <Field label="State" value={form.address.state} onChange={(v) => setField('address.state', v)} />
            <Field label="Pincode" value={form.address.pincode} onChange={(v) => setField('address.pincode', v)} />
          </div>

          {me.role === 'farmer' && (
            <>
              <h3>Farm Details</h3>
              <div className="grid grid-2">
                <Field label="Farm Name" value={form.farmDetails.farmName} onChange={(v) => setField('farmDetails.farmName', v)} />
                <Field label="Farm Size" value={form.farmDetails.farmSize} onChange={(v) => setField('farmDetails.farmSize', v)} placeholder="e.g. 5 acres" />
              </div>
              <h3>Bank Details (for settlement payouts)</h3>
              <div className="grid grid-2">
                <Field label="Account Holder" value={form.bankDetails.accountHolder} onChange={(v) => setField('bankDetails.accountHolder', v)} />
                <Field label="Bank Name" value={form.bankDetails.bankName} onChange={(v) => setField('bankDetails.bankName', v)} />
                <Field label="Account Number" value={form.bankDetails.accountNumber} onChange={(v) => setField('bankDetails.accountNumber', v)} />
                <Field label="IFSC Code" value={form.bankDetails.ifsc} onChange={(v) => setField('bankDetails.ifsc', v)} />
              </div>
            </>
          )}

          {(me.role === 'buyer' || me.role === 'mandi_staff') && (
            <>
              <h3>Business Details</h3>
              <div className="grid grid-2">
                <Field label="Business Name" value={form.businessDetails.businessName} onChange={(v) => setField('businessDetails.businessName', v)} />
                <Field label="License Number" value={form.businessDetails.licenseNumber} onChange={(v) => setField('businessDetails.licenseNumber', v)} />
              </div>
              <Field label="Business Address" value={form.businessDetails.businessAddress} onChange={(v) => setField('businessDetails.businessAddress', v)} />
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={savingProfile} style={{ marginTop: 8 }}>
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        <form className="card" onSubmit={savePassword} style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Change Password</h3>
          {pwMsg && (
            <div className={`badge ${pwMsg.type === 'success' ? 'badge-green' : 'badge-red'}`} style={{ marginBottom: 12 }}>
              {pwMsg.text}
            </div>
          )}
          <Field
            label="Current Password" type="password" value={pwForm.currentPassword}
            onChange={(v) => setPwForm((p) => ({ ...p, currentPassword: v }))}
          />
          <div className="grid grid-2">
            <Field
              label="New Password" type="password" value={pwForm.newPassword}
              onChange={(v) => setPwForm((p) => ({ ...p, newPassword: v }))}
            />
            <Field
              label="Confirm New Password" type="password" value={pwForm.confirmPassword}
              onChange={(v) => setPwForm((p) => ({ ...p, confirmPassword: v }))}
            />
          </div>
          <button className="btn btn-secondary" type="submit" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
