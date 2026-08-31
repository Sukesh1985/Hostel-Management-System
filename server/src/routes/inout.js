const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../constants');

const router = express.Router();

function assertHostelAccess(req, res, hostelId) {
  const scoped = scopedHostelId(req.user);
  if (scoped !== null && scoped !== undefined && Number(scoped) !== Number(hostelId)) {
    res.status(403).json({ error: 'You can only manage in/out records for your own hostel' });
    return false;
  }
  return true;
}

// History for a student, looked up by Roll No - shows details + all out/in entries.
router.get('/student/:rollNo', authenticate, (req, res) => {
  const student = db
    .prepare('SELECT s.*, h.name AS hostel_name FROM students s JOIN hostels h ON h.id = s.hostel_id WHERE s.roll_no = ?')
    .get(req.params.rollNo.trim());
  if (!student) return res.status(404).json({ error: 'No student found for this Roll No' });

  if (req.user.role === ROLES.STUDENT && req.user.student_id !== student.id) {
    return res.status(403).json({ error: 'Students may only view their own records' });
  }
  if (req.user.role !== ROLES.STUDENT && !assertHostelAccess(req, res, student.hostel_id)) return;

  const records = db.prepare('SELECT * FROM student_inout WHERE student_id = ? ORDER BY out_date DESC, out_time DESC').all(student.id);
  res.json({ student, records });
});

// Currently-out roster (staff only), optionally filtered by hostel.
router.get('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const { hostel_id, status } = req.query;

  let sql = `
    SELECT io.*, s.roll_no, s.name, s.hostel_id, h.name AS hostel_name
    FROM student_inout io
    JOIN students s ON s.id = io.student_id
    JOIN hostels h ON h.id = s.hostel_id
    WHERE 1=1
  `;
  const params = [];
  if (scoped) {
    sql += ' AND s.hostel_id = ?';
    params.push(scoped);
  } else if (hostel_id) {
    sql += ' AND s.hostel_id = ?';
    params.push(hostel_id);
  }
  if (status) {
    sql += ' AND io.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY io.out_date DESC, io.out_time DESC LIMIT 200';

  const records = db.prepare(sql).all(...params);
  res.json({ records });
});

// Log a new outgoing entry for a student.
router.post('/out', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { roll_no, out_date, out_time, place, reason } = req.body || {};
  if (!roll_no || !out_date || !out_time) {
    return res.status(400).json({ error: 'Roll No, out date and out time are required' });
  }
  const student = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(roll_no.trim());
  if (!student) return res.status(404).json({ error: 'No student found for this Roll No' });
  if (!assertHostelAccess(req, res, student.hostel_id)) return;

  const openEntry = db.prepare("SELECT id FROM student_inout WHERE student_id = ? AND status = 'out'").get(student.id);
  if (openEntry) return res.status(409).json({ error: 'This student already has an open outgoing entry. Mark them in first.' });

  const info = db.prepare(`
    INSERT INTO student_inout (student_id, out_date, out_time, place, reason, status)
    VALUES (?, ?, ?, ?, ?, 'out')
  `).run(student.id, out_date, out_time, place || null, reason || null);

  res.status(201).json({ record: db.prepare('SELECT * FROM student_inout WHERE id = ?').get(info.lastInsertRowid) });
});

// Mark a student back in.
router.post('/:id/in', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { in_date, in_time } = req.body || {};
  if (!in_date || !in_time) return res.status(400).json({ error: 'in date and in time are required' });

  const record = db.prepare('SELECT * FROM student_inout WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.status === 'in') return res.status(409).json({ error: 'This entry is already marked as returned' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id);
  if (!assertHostelAccess(req, res, student.hostel_id)) return;

  db.prepare("UPDATE student_inout SET in_date = ?, in_time = ?, status = 'in' WHERE id = ?")
    .run(in_date, in_time, req.params.id);

  res.json({ record: db.prepare('SELECT * FROM student_inout WHERE id = ?').get(req.params.id) });
});

module.exports = router;
