import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [inout, setInout] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/students/me')
      .then(async (r) => {
        setStudent(r.data.student);
        const rollNo = r.data.student.roll_no;
        const [att, io] = await Promise.all([
          api.get(`/attendance/student/${rollNo}`),
          api.get(`/inout/student/${rollNo}`),
        ]);
        setAttendance(att.data.records);
        setInout(io.data.records);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!student) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Detail label="Roll No" value={student.roll_no} />
          <Detail label="Name" value={student.name} />
          <Detail label="Hostel" value={student.hostel_name} />
          <Detail label="Room" value={student.room_id || 'Not allotted'} />
          <Detail label="Course" value={student.course} />
          <Detail label="Batch" value={student.batch} />
          <Detail label="Mobile No" value={student.mobile_no} />
          <Detail label="Email" value={student.email} />
          <Detail label="Father's Name" value={student.father_name} />
          <Detail label="Father's Mobile" value={student.father_mobile} />
          <Detail label="Mother's Name" value={student.mother_name} />
          <Detail label="Mother's Mobile" value={student.mother_mobile} />
          <Detail label="Address" value={student.address} />
        </dl>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Recent Attendance</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2 max-h-72 overflow-y-auto">
            {attendance.length === 0 && <p className="text-sm text-gray-400">No attendance recorded yet.</p>}
            {attendance.map((a) => (
              <div key={a.date} className="flex justify-between text-sm">
                <span className="text-gray-600">{a.date}</span>
                <span className={`font-medium capitalize ${a.status === 'present' ? 'text-green-600' : 'text-red-600'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">In &amp; Out History</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3 max-h-72 overflow-y-auto">
            {inout.length === 0 && <p className="text-sm text-gray-400">No records yet.</p>}
            {inout.map((r) => (
              <div key={r.id} className="text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                <p className="text-gray-800">Out: {r.out_date} {r.out_time} — {r.place || '—'} ({r.reason || '—'})</p>
                <p className="text-gray-500">{r.status === 'in' ? `In: ${r.in_date} ${r.in_time}` : 'Not yet returned'}</p>
              </div>
            ))}
          </div>
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
