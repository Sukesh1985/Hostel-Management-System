const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../constants');

const router = express.Router();

function assertHostelAccess(req, res, hostelId) {
  const scoped = scopedHostelId(req.user);
  if (scoped !== null && scoped !== undefined && Number(scoped) !== Number(hostelId)) {
    res.status(403).json({ error: 'You can only manage students in your own hostel' });
    return false;
  }
  return true;
}

// List / search students. Admin sees all; wardens see only their hostel; students are blocked (use /me).
router.get('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const { hostel_id, q, status } = req.query;

  let sql = `SELECT s.*, h.name AS hostel_name FROM students s JOIN hostels h ON h.id = s.hostel_id WHERE 1=1`;
  const params = [];

  if (scoped) {
    sql += ' AND s.hostel_id = ?';
    params.push(scoped);
  } else if (hostel_id) {
    sql += ' AND s.hostel_id = ?';
    params.push(hostel_id);
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (s.roll_no LIKE ? OR s.name LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY s.name';

  const students = db.prepare(sql).all(...params);
  res.json({ students });
});

router.get('/me', authenticate, authorize(ROLES.STUDENT), (req, res) => {
  if (!req.user.student_id) return res.status(404).json({ error: 'No student profile linked to this account' });
  const student = db
    .prepare('SELECT s.*, h.name AS hostel_name FROM students s JOIN hostels h ON h.id = s.hostel_id WHERE s.id = ?')
    .get(req.user.student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json({ student });
});

// Lookup by roll no - used by Attendance / In-Out / Grievances modules to pull up student details.
router.get('/by-roll/:rollNo', authenticate, (req, res) => {
  const student = db
    .prepare('SELECT s.*, h.name AS hostel_name FROM students s JOIN hostels h ON h.id = s.hostel_id WHERE s.roll_no = ?')
    .get(req.params.rollNo.trim());
  if (!student) return res.status(404).json({ error: 'No student found for this Roll No' });

  if (req.user.role === ROLES.STUDENT && req.user.student_id !== student.id) {
    return res.status(403).json({ error: 'Students may only look up their own record' });
  }
  if (!assertHostelAccess(req, res, student.hostel_id)) return;

  res.json({ student });
});

router.post('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const {
    roll_no, hostel_id, name, course, batch, mobile_no, email,
    father_name, father_mobile, mother_name, mother_mobile, address,
  } = req.body || {};

  if (!roll_no || !hostel_id || !name) {
    return res.status(400).json({ error: 'Roll No, Hostel and Name are required' });
  }
  if (!assertHostelAccess(req, res, hostel_id)) return;

  const hostel = db.prepare('SELECT id FROM hostels WHERE id = ?').get(hostel_id);
  if (!hostel) return res.status(400).json({ error: 'Invalid hostel' });

  try {
    const info = db.prepare(`
      INSERT INTO students
        (roll_no, name, hostel_id, course, batch, mobile_no, email,
         father_name, father_mobile, mother_name, mother_mobile, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roll_no.trim(), name.trim(), hostel_id, course || null, batch || null,
      mobile_no || null, email || null, father_name || null, father_mobile || null,
      mother_name || null, mother_mobile || null, address || null
    );
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ student });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A student with this Roll No already exists' });
    }
    res.status(500).json({ error: 'Failed to create student', detail: err.message });
  }
});

router.put('/:id', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  if (!assertHostelAccess(req, res, existing.hostel_id)) return;

  const fields = [
    'name', 'course', 'batch', 'mobile_no', 'email',
    'father_name', 'father_mobile', 'mother_name', 'mother_mobile', 'address', 'status',
  ];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  res.json({ student });
});

router.delete('/:id', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
