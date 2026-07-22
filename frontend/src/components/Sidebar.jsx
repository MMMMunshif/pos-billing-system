import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/stock', label: 'Add Stock', icon: '📥' },
  { to: '/sales', label: 'Sales', icon: '💰' },
  { to: '/customers', label: 'Customers', icon: '👥' },
  { to: '/payments', label: 'Payments', icon: '💳' },
  { to: '/reports', label: 'Reports', icon: '📋' },
];

export default function Sidebar({ open, onClose }) {
  const { userProfile, logout } = useAuth();

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">🏪</span>
          <div>
            <strong>Fancy Shop</strong>
            <small>Management</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-role">{userProfile?.role || 'user'}</span>
            <span className="user-name">{userProfile?.name || userProfile?.email}</span>
          </div>
          <button type="button" className="btn btn-outline btn-block" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
