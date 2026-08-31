import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../lib/api';
import { HOSTELS } from '../lib/constants';

const initialForm = {
  roll_no: '', hostel_name: '', name: '', course: '', batch: '', mobile_no: '', email: '',
  father_name: '', father_mobile: '', mother_name: '', mother_mobile: '', address: '',
  password: '', confirm_password: '',
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const { confirm_password, ...payload } = form;
      const { data } = await api.post('/auth/register-student', payload);
      setSuccess(`Registration successful for ${data.student.name} (Roll No: ${data.student.roll_no}). You can now log in.`);
      setForm(initialForm);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ label, children }) => (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-indigo-700">Online Student Registration</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Fill in your details to register for hostel accommodation.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Student Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Roll No *">
                <input required value={form.roll_no} onChange={update('roll_no')} className={inputClass} />
              </Field>
              <Field label="Name of Hostel *">
                <select required value={form.hostel_name} onChange={update('hostel_name')} className={inputClass}>
                  <option value="">Select hostel</option>
                  {HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Student's Name *">
                <input required value={form.name} onChange={update('name')} className={inputClass} />
              </Field>
              <Field label="Course">
                <input value={form.course} onChange={update('course')} className={inputClass} placeholder="e.g. B.Tech CSE" />
              </Field>
              <Field label="Batch">
                <input value={form.batch} onChange={update('batch')} className={inputClass} placeholder="e.g. 2024-28" />
              </Field>
              <Field label="Mobile No">
                <input value={form.mobile_no} onChange={update('mobile_no')} className={inputClass} />
              </Field>
              <Field label="Email ID">
                <input type="email" value={form.email} onChange={update('email')} className={inputClass} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Parents Section</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Father's Name">
                <input value={form.father_name} onChange={update('father_name')} className={inputClass} />
              </Field>
              <Field label="Father's Mobile No">
                <input value={form.father_mobile} onChange={update('father_mobile')} className={inputClass} />
              </Field>
              <Field label="Mother's Name">
                <input value={form.mother_name} onChange={update('mother_name')} className={inputClass} />
              </Field>
              <Field label="Mother's Mobile No">
                <input value={form.mother_mobile} onChange={update('mother_mobile')} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <textarea value={form.address} onChange={update('address')} className={inputClass} rows={2} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Account Login</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Password *">
                <input type="password" required value={form.password} onChange={update('password')} className={inputClass} />
              </Field>
              <Field label="Confirm Password *">
                <input type="password" required value={form.confirm_password} onChange={update('confirm_password')} className={inputClass} />
              </Field>
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already registered? <Link to="/login" className="text-indigo-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
