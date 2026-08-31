import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/constants';

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
  }`;

export default function Layout({ children }) {
  const { user, logout, isStaff, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-indigo-700 leading-tight">Hostel Management</h1>
          <p className="text-xs text-gray-500 mt-1">System</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          {isStaff && <NavLink to="/students" className={linkClass}>Student Registration</NavLink>}
          {isStudent && <NavLink to="/profile" className={linkClass}>My Profile</NavLink>}
          {isStaff && <NavLink to="/rooms" className={linkClass}>Room Management</NavLink>}
          {isStaff && <NavLink to="/attendance" className={linkClass}>Attendance</NavLink>}
          {isStaff && <NavLink to="/inout" className={linkClass}>Students In &amp; Out</NavLink>}
          <NavLink to="/grievances" className={linkClass}>Grievances</NavLink>
          {isAdmin && <NavLink to="/users" className={linkClass}>Manage Users</NavLink>}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200 text-xs text-gray-500">
          <p className="font-medium text-gray-800 truncate">{user?.name}</p>
          <p className="truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
