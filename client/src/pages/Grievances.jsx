import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const statusStyles = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function Grievances() {
  const { isStaff } = useAuth();
  const [complaintTypes, setComplaintTypes] = useState({});
  const [hostels, setHostels] = useState([]);

  const [rollNo, setRollNo] = useState('');
  const [student, setStudent] = useState(null);
  const [complaintType, setComplaintType] = useState('');
  const [complaintSubtype, setComplaintSubtype] = useState('');
  const [description, setDescription] = useState('');

  const [grievances, setGrievances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/grievances/meta').then((r) => setComplaintTypes(r.data.complaint_types));
    if (isStaff) api.get('/hostels').then((r) => setHostels(r.data.hostels));
  }, [isStaff]);

  const loadGrievances = () => {
    const endpoint = isStaff ? '/grievances' : '/grievances/mine';
    const params = isStaff && statusFilter ? { status: statusFilter } : {};
    api.get(endpoint, { params }).then((r) => setGrievances(r.data.grievances)).catch((err) => setError(apiErrorMessage(err)));
  };

  useEffect(() => { loadGrievances(); }, [isStaff, statusFilter]);

  const lookupStudent = async () => {
    if (!rollNo.trim()) return;
    setError('');
    try {
      const { data } = await api.get(`/students/by-roll/${rollNo.trim()}`);
      setStudent(data.student);
    } catch (err) {
      setStudent(null);
      setError(apiErrorMessage(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post('/grievances', {
        roll_no: isStaff ? rollNo.trim() : undefined,
        complaint_type: complaintType,
        complaint_subtype: complaintSubtype,
        description,
      });
      setNotice('Grievance raised successfully.');
      setComplaintType(''); setComplaintSubtype(''); setDescription('');
      if (isStaff) { setRollNo(''); setStudent(null); }
      loadGrievances();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/grievances/${id}`, { status });
      loadGrievances();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const canSubmit = isStaff ? !!student && complaintType && complaintSubtype : complaintType && complaintSubtype;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Grievances</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Raise a Grievance</h2>

        {isStaff && (
          <>
            <div className="flex gap-3">
              <input placeholder="Enter Roll No" value={rollNo} onChange={(e) => setRollNo(e.target.value)} className={inputClass} />
              <button type="button" onClick={lookupStudent} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 shrink-0">
                Find
              </button>
            </div>
            {student && (
              <div className="text-sm bg-gray-50 rounded-lg p-3 space-y-1">
                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{student.name}</span></p>
                <p><span className="text-gray-500">Hostel:</span> <span className="font-medium">{student.hostel_name}</span></p>
                <p><span className="text-gray-500">Course:</span> <span className="font-medium">{student.course || '—'}</span></p>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Type</label>
            <select
              required value={complaintType}
              onChange={(e) => { setComplaintType(e.target.value); setComplaintSubtype(''); }}
              className={inputClass}
            >
              <option value="">Select type</option>
              {Object.keys(complaintTypes).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Sub Type</label>
            <select
              required value={complaintSubtype} onChange={(e) => setComplaintSubtype(e.target.value)}
              className={inputClass} disabled={!complaintType}
            >
              <option value="">Select sub type</option>
              {(complaintTypes[complaintType] || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}

        <button type="submit" disabled={busy || !canSubmit} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Submitting…' : 'Submit Grievance'}
        </button>
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{isStaff ? 'All Grievances' : 'My Grievances'}</h2>
          {isStaff && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} w-40`}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                {isStaff && <th className="px-4 py-2 font-medium">Student</th>}
                <th className="px-4 py-2 font-medium">Hostel</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Sub Type</th>
                <th className="px-4 py-2 font-medium">Raised</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {isStaff && <th className="px-4 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grievances.map((g) => (
                <tr key={g.id}>
                  {isStaff && <td className="px-4 py-2 font-medium text-gray-800">{g.roll_no} — {g.student_name}</td>}
                  <td className="px-4 py-2">{g.hostel_name}</td>
                  <td className="px-4 py-2">{g.complaint_type}</td>
                  <td className="px-4 py-2">{g.complaint_subtype}</td>
                  <td className="px-4 py-2">{new Date(g.raised_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[g.status]}`}>{g.status}</span>
                  </td>
                  {isStaff && (
                    <td className="px-4 py-2 space-x-2">
                      {g.status !== 'in-progress' && g.status !== 'resolved' && (
                        <button onClick={() => updateStatus(g.id, 'in-progress')} className="text-xs text-amber-700 hover:underline">Start</button>
                      )}
                      {g.status !== 'resolved' && (
                        <button onClick={() => updateStatus(g.id, 'resolved')} className="text-xs text-green-700 hover:underline">Resolve</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {grievances.length === 0 && (
                <tr><td colSpan={isStaff ? 7 : 5} className="px-4 py-6 text-center text-gray-400">No grievances found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
