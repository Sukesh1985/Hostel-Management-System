import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const TABS = ['Rooms', 'Add Room', 'Allotment', 'Shifting', 'Vacant'];

export default function Rooms() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Rooms');
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadHostels = () => api.get('/hostels').then((r) => setHostels(r.data.hostels));
  const loadRooms = () => api.get('/rooms').then((r) => setRooms(r.data.rooms));
  const loadStudents = () => api.get('/students').then((r) => setStudents(r.data.students));

  const refreshAll = () => Promise.all([loadRooms(), loadStudents()]).catch((err) => setError(apiErrorMessage(err)));

  useEffect(() => { loadHostels(); refreshAll(); }, []);

  const flash = (msg) => { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 4000); };
  const fail = (err) => { setError(apiErrorMessage(err)); setNotice(''); };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Room Management</h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}

      {tab === 'Rooms' && <RoomsList rooms={rooms} />}
      {tab === 'Add Room' && (
        <AddRoomForm hostels={hostels} user={user} onDone={(msg) => { flash(msg); refreshAll(); }} onError={fail} />
      )}
      {tab === 'Allotment' && (
        <AllotmentForm students={students} rooms={rooms} onDone={(msg) => { flash(msg); refreshAll(); }} onError={fail} />
      )}
      {tab === 'Shifting' && (
        <ShiftingForm students={students} rooms={rooms} onDone={(msg) => { flash(msg); refreshAll(); }} onError={fail} />
      )}
      {tab === 'Vacant' && (
        <VacateForm students={students} onDone={(msg) => { flash(msg); refreshAll(); }} onError={fail} />
      )}
    </div>
  );
}

function RoomsList({ rooms }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Hostel</th>
            <th className="px-4 py-2 font-medium">Room No</th>
            <th className="px-4 py-2 font-medium">Capacity</th>
            <th className="px-4 py-2 font-medium">Occupied</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rooms.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2">{r.hostel_name}</td>
              <td className="px-4 py-2 font-medium text-gray-800">{r.room_no}</td>
              <td className="px-4 py-2">{r.capacity}</td>
              <td className="px-4 py-2">{r.occupied}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.effective_status === 'available' ? 'bg-green-100 text-green-700'
                  : r.effective_status === 'full' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-200 text-gray-600'
                }`}>{r.effective_status}</span>
              </td>
            </tr>
          ))}
          {rooms.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No rooms added yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AddRoomForm({ hostels, user, onDone, onError }) {
  const [form, setForm] = useState({ hostel_id: user.hostel_id || '', room_no: '', capacity: 2 });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/rooms', form);
      onDone(`Room ${form.room_no} added.`);
      setForm({ hostel_id: user.hostel_id || '', room_no: '', capacity: 2 });
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hostel</label>
        <select required disabled={!!user.hostel_id} value={form.hostel_id} onChange={(e) => setForm({ ...form, hostel_id: e.target.value })} className={inputClass}>
          <option value="">Select hostel</option>
          {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Room No</label>
        <input required value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
        <input required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputClass} />
      </div>
      <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
        {busy ? 'Adding…' : 'Add Room'}
      </button>
    </form>
  );
}

function AllotmentForm({ students, rooms, onDone, onError }) {
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  const unallotted = students.filter((s) => !s.room_id && s.status === 'active');
  const student = students.find((s) => String(s.id) === String(studentId));
  const eligibleRooms = rooms.filter((r) => (!student || r.hostel_id === student.hostel_id) && r.effective_status === 'available');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/rooms/allot', { student_id: Number(studentId), room_id: Number(roomId) });
      onDone('Room allotted successfully.');
      setStudentId(''); setRoomId('');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student (unallotted)</label>
        <select required value={studentId} onChange={(e) => { setStudentId(e.target.value); setRoomId(''); }} className={inputClass}>
          <option value="">Select student</option>
          {unallotted.map((s) => <option key={s.id} value={s.id}>{s.roll_no} — {s.name} ({s.hostel_name})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
        <select required value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass} disabled={!studentId}>
          <option value="">Select room</option>
          {eligibleRooms.map((r) => <option key={r.id} value={r.id}>{r.room_no} ({r.occupied}/{r.capacity})</option>)}
        </select>
      </div>
      <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
        {busy ? 'Allotting…' : 'Allot Room'}
      </button>
    </form>
  );
}

function ShiftingForm({ students, rooms, onDone, onError }) {
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  const allotted = students.filter((s) => s.room_id && s.status === 'active');
  const student = students.find((s) => String(s.id) === String(studentId));
  const eligibleRooms = rooms.filter((r) => (!student || r.hostel_id === student.hostel_id) && r.id !== student?.room_id && r.effective_status === 'available');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/rooms/shift', { student_id: Number(studentId), new_room_id: Number(roomId) });
      onDone('Student shifted successfully.');
      setStudentId(''); setRoomId('');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student (currently allotted)</label>
        <select required value={studentId} onChange={(e) => { setStudentId(e.target.value); setRoomId(''); }} className={inputClass}>
          <option value="">Select student</option>
          {allotted.map((s) => <option key={s.id} value={s.id}>{s.roll_no} — {s.name} (Room {s.room_id})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Room</label>
        <select required value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass} disabled={!studentId}>
          <option value="">Select room</option>
          {eligibleRooms.map((r) => <option key={r.id} value={r.id}>{r.room_no} ({r.occupied}/{r.capacity})</option>)}
        </select>
      </div>
      <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
        {busy ? 'Shifting…' : 'Shift Room'}
      </button>
    </form>
  );
}

function VacateForm({ students, onDone, onError }) {
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const allotted = students.filter((s) => s.room_id && s.status === 'active');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/rooms/vacate', { student_id: Number(studentId) });
      onDone('Room vacated successfully.');
      setStudentId('');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
        <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
          <option value="">Select student</option>
          {allotted.map((s) => <option key={s.id} value={s.id}>{s.roll_no} — {s.name} (Room {s.room_id})</option>)}
        </select>
      </div>
      <button type="submit" disabled={busy} className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60">
        {busy ? 'Vacating…' : 'Vacate Room'}
      </button>
    </form>
  );
}
