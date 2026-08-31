import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [hostelId, setHostelId] = useState(user.hostel_id || '');
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/hostels').then((r) => setHostels(r.data.hostels)); }, []);

  const loadRoster = () => {
    if (!hostelId) { setRoster([]); return; }
    setError('');
    api.get('/attendance', { params: { date, hostel_id: hostelId } })
      .then((r) => setRoster(r.data.roster.map((s) => ({ ...s, status: s.status || 'present' }))))
      .catch((err) => setError(apiErrorMessage(err)));
  };

  useEffect(() => { loadRoster(); }, [hostelId, date]);

  const setStatus = (studentId, status) => {
    setRoster((rows) => rows.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  };

  const markAll = (status) => setRoster((rows) => rows.map((r) => ({ ...r, status })));

  const save = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const records = roster.map((r) => ({ student_id: r.student_id, status: r.status }));
      await api.post('/attendance/mark', { date, records });
      setNotice('Attendance saved successfully.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const presentCount = roster.filter((r) => r.status === 'present').length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Online Students Attendance</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        {!user.hostel_id && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hostel</label>
            <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className={inputClass}>
              <option value="">Select hostel</option>
              {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
        <button onClick={() => markAll('present')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Mark all Present</button>
        <button onClick={() => markAll('absent')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Mark all Absent</button>
        <button onClick={save} disabled={busy || roster.length === 0} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}
      {roster.length > 0 && <p className="text-sm text-gray-500">{presentCount} of {roster.length} marked present</p>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Roll No</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roster.map((r) => (
              <tr key={r.student_id}>
                <td className="px-4 py-2 font-medium text-gray-800">{r.roll_no}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">
                  <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setStatus(r.student_id, 'present')}
                      className={`px-3 py-1 text-xs font-medium ${r.status === 'present' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
                    >Present</button>
                    <button
                      onClick={() => setStatus(r.student_id, 'absent')}
                      className={`px-3 py-1 text-xs font-medium ${r.status === 'absent' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}
                    >Absent</button>
                  </div>
                </td>
              </tr>
            ))}
            {roster.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Select a hostel to load the roster.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
