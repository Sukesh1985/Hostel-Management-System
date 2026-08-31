import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { ROLES, STAFF_ROLES } from './lib/constants';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Profile from './pages/Profile';
import Rooms from './pages/Rooms';
import Attendance from './pages/Attendance';
import InOut from './pages/InOut';
import Grievances from './pages/Grievances';
import Users from './pages/Users';

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute roles={STAFF_ROLES}><Students /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={[ROLES.STUDENT]}><Profile /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute roles={STAFF_ROLES}><Rooms /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute roles={STAFF_ROLES}><Attendance /></ProtectedRoute>} />
      <Route path="/inout" element={<ProtectedRoute roles={STAFF_ROLES}><InOut /></ProtectedRoute>} />
      <Route path="/grievances" element={<ProtectedRoute><Grievances /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={[ROLES.ADMIN]}><Users /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
