import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  roll_no: '', hostel_id: '', name: '', course: '', batch: '', mobile_no: '', email: '',
  father_name: '', father_mobile: '', mother_name: '', mother_mobile: '', address: '',
};

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function Students() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadHostels = () => api.get('/hostels').then((r) => setHostels(r.data.hostels));
  const loadStudents = () => {
    const params = {};
    if (q) params.q = q;
    if (hostelFilter) params.hostel_id = hostelFilter;
    return api.get('/students', { params }).then((r) => setStudents(r.data.students));
  };

  useEffect(() => { loadHostels(); }, []);
  useEffect(() => { loadStudents().catch((err) => setError(apiErrorMessage(err))); }, [q, hostelFilter]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submitAdd = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post('/students', form);
      setNotice(`Student ${form.name} registered successfully.`);
      setForm({ ...emptyForm, hostel_id: user.hostel_id || '' });
      setShowAdd(false);
      loadStudents();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    setForm({ ...emptyForm, hostel_id: user.hostel_id || '' });
    setShowAdd(true);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Student Registration</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          + Register Student
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by Roll No or Name"
          className={`${inputClass} max-w-xs`}
        />
        {!user.hostel_id && (
          <select value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)} className={`${inputClass} max-w-xs`}>
            <option value="">All Hostels</option>
            {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      {showAdd && (
        <form onSubmit={submitAdd} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">New Student</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input required placeholder="Roll No" value={form.roll_no} onChange={update('roll_no')} className={inputClass} />
            <select required value={form.hostel_id} onChange={update('hostel_id')} className={inputClass} disabled={!!user.hostel_id}>
              <option value="">Select hostel</option>
              {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <input required placeholder="Student's Name" value={form.name} onChange={update('name')} className={inputClass} />
            <input placeholder="Course" value={form.course} onChange={update('course')} className={inputClass} />
            <input placeholder="Batch" value={form.batch} onChange={update('batch')} className={inputClass} />
            <input placeholder="Mobile No" value={form.mobile_no} onChange={update('mobile_no')} className={inputClass} />
            <input placeholder="Email ID" value={form.email} onChange={update('email')} className={inputClass} />
          </div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Parents Section</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Father's Name" value={form.father_name} onChange={update('father_name')} className={inputClass} />
            <input placeholder="Father's Mobile No" value={form.father_mobile} onChange={update('father_mobile')} className={inputClass} />
            <input placeholder="Mother's Name" value={form.mother_name} onChange={update('mother_name')} className={inputClass} />
            <input placeholder="Mother's Mobile No" value={form.mother_mobile} onChange={update('mother_mobile')} className={inputClass} />
            <input placeholder="Address" value={form.address} onChange={update('address')} className={`${inputClass} sm:col-span-2`} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
              {busy ? 'Saving…' : 'Save Student'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Roll No</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Hostel</th>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr
                  key={s.id} onClick={() => setSelected(s)}
                  className={`cursor-pointer hover:bg-indigo-50 ${selected?.id === s.id ? 'bg-indigo-50' : ''}`}
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{s.roll_no}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.hostel_name}</td>
                  <td className="px-4 py-2">{s.room_id || '—'}</td>
                  <td className="px-4 py-2 capitalize">{s.status}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Student Details</h2>
          {!selected && <p className="text-sm text-gray-400">Select a student to view details.</p>}
          {selected && (
            <dl className="space-y-2 text-sm">
              <Detail label="Roll No" value={selected.roll_no} />
              <Detail label="Name" value={selected.name} />
              <Detail label="Hostel" value={selected.hostel_name} />
              <Detail label="Course" value={selected.course} />
              <Detail label="Batch" value={selected.batch} />
              <Detail label="Mobile No" value={selected.mobile_no} />
              <Detail label="Email" value={selected.email} />
              <div className="border-t border-gray-100 pt-2 mt-2 font-semibold text-gray-700">Parents</div>
              <Detail label="Father's Name" value={selected.father_name} />
              <Detail label="Father's Mobile" value={selected.father_mobile} />
              <Detail label="Mother's Name" value={selected.mother_name} />
              <Detail label="Mother's Mobile" value={selected.mother_mobile} />
              <Detail label="Address" value={selected.address} />
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 text-right">{value || '—'}</dd>
    </div>
  );
}
