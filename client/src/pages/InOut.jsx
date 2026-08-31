import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

export default function InOut() {
  const [rollNo, setRollNo] = useState('');
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [outForm, setOutForm] = useState({ out_date: today(), out_time: nowTime(), place: '', reason: '' });
  const [inForm, setInForm] = useState({ in_date: today(), in_time: nowTime() });

  const lookup = async (e) => {
    e?.preventDefault();
    if (!rollNo.trim()) return;
    setError('');
    setNotice('');
    try {
      const { data } = await api.get(`/inout/student/${rollNo.trim()}`);
      setStudent(data.student);
      setRecords(data.records);
    } catch (err) {
      setStudent(null);
      setRecords([]);
      setError(apiErrorMessage(err));
    }
  };

  const openEntry = records.find((r) => r.status === 'out');

  const logOut = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/inout/out', { roll_no: rollNo.trim(), ...outForm });
      setNotice('Outgoing entry logged.');
      setOutForm({ out_date: today(), out_time: nowTime(), place: '', reason: '' });
      lookup();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const logIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/inout/${openEntry.id}/in`, inForm);
      setNotice('Student marked as returned.');
      setInForm({ in_date: today(), in_time: nowTime() });
      lookup();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Students In &amp; Out</h1>

      <form onSubmit={lookup} className="flex gap-3 max-w-md">
        <input
          value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="Enter Roll No"
          className={inputClass}
        />
        <button type="submit" className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 shrink-0">
          Search
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Student Details</h2>
            <dl className="space-y-2 text-sm">
              <Detail label="Roll No" value={student.roll_no} />
              <Detail label="Name" value={student.name} />
              <Detail label="Hostel" value={student.hostel_name} />
              <Detail label="Mobile" value={student.mobile_no} />
            </dl>

            <div className="mt-5 pt-4 border-t border-gray-100">
              {!openEntry ? (
                <form onSubmit={logOut} className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase">Log Outgoing</h3>
                  <input type="date" required value={outForm.out_date} onChange={(e) => setOutForm({ ...outForm, out_date: e.target.value })} className={inputClass} />
                  <input type="time" required value={outForm.out_time} onChange={(e) => setOutForm({ ...outForm, out_time: e.target.value })} className={inputClass} />
                  <input placeholder="Place" value={outForm.place} onChange={(e) => setOutForm({ ...outForm, place: e.target.value })} className={inputClass} />
                  <input placeholder="Reason" value={outForm.reason} onChange={(e) => setOutForm({ ...outForm, reason: e.target.value })} className={inputClass} />
                  <button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                    {busy ? 'Saving…' : 'Mark Outgoing'}
                  </button>
                </form>
              ) : (
                <form onSubmit={logIn} className="space-y-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase">Mark Incoming</h3>
                  <p className="text-xs text-gray-500">Out since {openEntry.out_date} {openEntry.out_time} — {openEntry.place || '—'}</p>
                  <input type="date" required value={inForm.in_date} onChange={(e) => setInForm({ ...inForm, in_date: e.target.value })} className={inputClass} />
                  <input type="time" required value={inForm.in_time} onChange={(e) => setInForm({ ...inForm, in_time: e.target.value })} className={inputClass} />
                  <button type="submit" disabled={busy} className="w-full rounded-lg bg-green-600 text-white py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                    {busy ? 'Saving…' : 'Mark Incoming'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Out Date</th>
                  <th className="px-4 py-2 font-medium">Out Time</th>
                  <th className="px-4 py-2 font-medium">In Date</th>
                  <th className="px-4 py-2 font-medium">In Time</th>
                  <th className="px-4 py-2 font-medium">Place</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">{r.out_date}</td>
                    <td className="px-4 py-2">{r.out_time}</td>
                    <td className="px-4 py-2">{r.in_date || '—'}</td>
                    <td className="px-4 py-2">{r.in_time || '—'}</td>
                    <td className="px-4 py-2">{r.place || '—'}</td>
                    <td className="px-4 py-2">{r.reason || '—'}</td>
                    <td className="px-4 py-2 capitalize">{r.status}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
