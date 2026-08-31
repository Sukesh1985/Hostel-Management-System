import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { ROLE_LABELS, ROLES } from '../lib/constants';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const emptyForm = { name: '', email: '', password: '', role: '', student_id: '' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = () => api.get('/users').then((r) => setUsers(r.data.users));
  const loadStudents = () => api.get('/students').then((r) => setStudents(r.data.students));

  useEffect(() => { loadUsers().catch((err) => setError(apiErrorMessage(err))); loadStudents(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload = { ...form };
      if (form.role !== ROLES.STUDENT) delete payload.student_id;
      else payload.student_id = Number(payload.student_id);
      await api.post('/users', payload);
      setNotice(`User ${form.name} created.`);
      setForm(emptyForm);
      loadUsers();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u.id}`, { active: u.active ? 0 : 1 });
      loadUsers();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Manage Users</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Add User</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
          <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
            <option value="">Select role</option>
            {Object.entries(ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
          </select>
          {form.role === ROLES.STUDENT && (
            <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className={`${inputClass} sm:col-span-2`}>
              <option value="">Link to existing student…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.roll_no} — {s.name}</option>)}
            </select>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Creating…' : 'Create User'}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role] || u.role}</td>
                <td className="px-4 py-2">{u.hostel_name || u.student_roll_no || '—'}</td>
                <td className="px-4 py-2">{u.active ? <span className="text-green-700">Active</span> : <span className="text-gray-400">Inactive</span>}</td>
                <td className="px-4 py-2">
                  <button onClick={() => toggleActive(u)} className="text-xs text-indigo-600 hover:underline">
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
