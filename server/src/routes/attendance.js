const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { ROLES, STAFF_ROLES } = require('../constants');

const router = express.Router();

function assertHostelAccess(req, res, hostelId) {
  const scoped = scopedHostelId(req.user);
  if (scoped !== null && scoped !== undefined && Number(scoped) !== Number(hostelId)) {
    res.status(403).json({ error: 'You can only manage attendance for your own hostel' });
    return false;
  }
  return true;
}

// Roster for a given date + hostel, each student annotated with today's status (or null if unmarked).
router.get('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const { date, hostel_id } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

  const effectiveHostelId = scoped || hostel_id;
  if (!effectiveHostelId) return res.status(400).json({ error: 'hostel_id is required' });
  if (!assertHostelAccess(req, res, effectiveHostelId)) return;

  const roster = db.prepare(`
    SELECT s.id AS student_id, s.roll_no, s.name, a.status
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
    WHERE s.hostel_id = ? AND s.status = 'active'
    ORDER BY s.name
  `).all(date, effectiveHostelId);

  res.json({ date, roster });
});

// Bulk-mark attendance for a date/hostel.
router.post('/mark', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { date, records } = req.body || {};
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'date and a non-empty records array are required' });
  }

  const studentIds = records.map((r) => r.student_id);
  const placeholders = studentIds.map(() => '?').join(',');
  const students = db.prepare(`SELECT * FROM students WHERE id IN (${placeholders})`).all(...studentIds);
  const byId = new Map(students.map((s) => [s.id, s]));

  for (const r of records) {
    const student = byId.get(r.student_id);
    if (!student) return res.status(404).json({ error: `Student ${r.student_id} not found` });
    if (!assertHostelAccess(req, res, student.hostel_id)) return;
    if (!['present', 'absent'].includes(r.status)) {
      return res.status(400).json({ error: 'status must be present or absent' });
    }
  }

  const upsert = db.prepare(`
    INSERT INTO attendance (student_id, date, status, marked_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, marked_at = datetime('now')
  `);
  const txn = db.transaction(() => {
    for (const r of records) upsert.run(r.student_id, date, r.status, req.user.id);
  });
  txn();

  res.json({ ok: true, count: records.length });
});

router.get('/student/:rollNo', authenticate, (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(req.params.rollNo.trim());
  if (!student) return res.status(404).json({ error: 'Student not found' });

  if (req.user.role === ROLES.STUDENT && req.user.student_id !== student.id) {
    return res.status(403).json({ error: 'Students may only view their own attendance' });
  }
  if (req.user.role !== ROLES.STUDENT && !assertHostelAccess(req, res, student.hostel_id)) return;

  const records = db.prepare('SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 90').all(student.id);
  res.json({ student, records });
});

module.exports = router;
