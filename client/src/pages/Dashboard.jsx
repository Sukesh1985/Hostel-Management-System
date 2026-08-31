import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { isStaff, isStudent, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStaff) return;
    api.get('/reports/dashboard').then((r) => setData(r.data)).catch((err) => setError(apiErrorMessage(err)));
  }, [isStaff]);

  if (isStudent) {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Use the sidebar to view your profile, attendance, in/out history, or raise a grievance.</p>
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading dashboard…</p>;

  const totalStudents = data.occupancy.reduce((s, h) => s + h.total_students, 0);
  const totalAllotted = data.occupancy.reduce((s, h) => s + h.allotted_students, 0);
  const totalCapacity = data.occupancy.reduce((s, h) => s + h.total_capacity, 0);
  const openGrievances = data.grievances_by_status.filter((g) => g.status !== 'resolved').reduce((s, g) => s + g.c, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports Dashboard</h1>
        <p className="text-sm text-gray-500">Generated at {new Date(data.generated_at).toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={totalStudents} />
        <StatCard label="Rooms Allotted" value={totalAllotted} sub={`of ${totalStudents} students`} />
        <StatCard label="Total Bed Capacity" value={totalCapacity} />
        <StatCard label="Present Today" value={data.attendance_today.present} sub={`${data.attendance_today.absent} absent, ${data.attendance_today.not_marked} not marked`} />
        <StatCard label="Currently Out" value={data.currently_out} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Occupancy by Hostel</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Hostel</th>
                <th className="px-4 py-2 font-medium">Students</th>
                <th className="px-4 py-2 font-medium">Allotted</th>
                <th className="px-4 py-2 font-medium">Unallotted</th>
                <th className="px-4 py-2 font-medium">Rooms</th>
                <th className="px-4 py-2 font-medium">Bed Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.occupancy.map((h) => (
                <tr key={h.hostel_id}>
                  <td className="px-4 py-2 font-medium text-gray-800">{h.hostel_name}</td>
                  <td className="px-4 py-2">{h.total_students}</td>
                  <td className="px-4 py-2">{h.allotted_students}</td>
                  <td className="px-4 py-2">{h.unallotted_students}</td>
                  <td className="px-4 py-2">{h.total_rooms}</td>
                  <td className="px-4 py-2">{h.total_capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Grievances by Status ({openGrievances} open)</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
            {data.grievances_by_status.length === 0 && <p className="text-sm text-gray-400">No grievances raised yet.</p>}
            {data.grievances_by_status.map((g) => (
              <div key={g.status} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{g.status}</span>
                <span className="font-medium text-gray-900">{g.c}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Open Grievances by Type</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
            {data.open_grievances_by_type.length === 0 && <p className="text-sm text-gray-400">No open grievances.</p>}
            {data.open_grievances_by_type.map((g) => (
              <div key={g.complaint_type} className="flex justify-between text-sm">
                <span className="text-gray-600">{g.complaint_type}</span>
                <span className="font-medium text-gray-900">{g.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
