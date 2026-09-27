// Shared shell for all role dashboards: sidebar nav + content area
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function DashboardLayout({ title, links, children }) {
  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', padding: '8px 14px' }}>
          {title}
        </div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
