const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { ROLES, STAFF_ROLES, COMPLAINT_TYPES } = require('../constants');

const router = express.Router();

function assertHostelAccess(req, res, hostelId) {
  const scoped = scopedHostelId(req.user);
  if (scoped !== null && scoped !== undefined && Number(scoped) !== Number(hostelId)) {
    res.status(403).json({ error: 'You can only manage grievances for your own hostel' });
    return false;
  }
  return true;
}

router.get('/meta', authenticate, (req, res) => {
  res.json({ complaint_types: COMPLAINT_TYPES });
});

router.get('/mine', authenticate, authorize(ROLES.STUDENT), (req, res) => {
  if (!req.user.student_id) return res.status(404).json({ error: 'No student profile linked to this account' });
  const grievances = db.prepare(`
    SELECT g.*, h.name AS hostel_name FROM grievances g JOIN hostels h ON h.id = g.hostel_id
    WHERE g.student_id = ? ORDER BY g.raised_date DESC
  `).all(req.user.student_id);
  res.json({ grievances });
});

router.get('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const { hostel_id, status, complaint_type } = req.query;

  let sql = `
    SELECT g.*, h.name AS hostel_name, s.roll_no, s.name AS student_name
    FROM grievances g
    JOIN hostels h ON h.id = g.hostel_id
    JOIN students s ON s.id = g.student_id
    WHERE 1=1
  `;
  const params = [];
  if (scoped) {
    sql += ' AND g.hostel_id = ?';
    params.push(scoped);
  } else if (hostel_id) {
    sql += ' AND g.hostel_id = ?';
    params.push(hostel_id);
  }
  if (status) {
    sql += ' AND g.status = ?';
    params.push(status);
  }
  if (complaint_type) {
    sql += ' AND g.complaint_type = ?';
    params.push(complaint_type);
  }
  sql += ' ORDER BY g.raised_date DESC';

  const grievances = db.prepare(sql).all(...params);
  res.json({ grievances });
});

// Raise a grievance. Staff raise it on behalf of a student found by Roll No; students raise their own.
router.post('/', authenticate, (req, res) => {
  const { roll_no, complaint_type, complaint_subtype, description } = req.body || {};

  let student;
  if (req.user.role === ROLES.STUDENT) {
    if (!req.user.student_id) return res.status(404).json({ error: 'No student profile linked to this account' });
    student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.user.student_id);
  } else {
    if (!roll_no) return res.status(400).json({ error: 'Roll No is required' });
    student = db.prepare('SELECT * FROM students WHERE roll_no = ?').get(roll_no.trim());
    if (!student) return res.status(404).json({ error: 'No student found for this Roll No' });
    if (!assertHostelAccess(req, res, student.hostel_id)) return;
  }

  if (!complaint_type || !COMPLAINT_TYPES[complaint_type]) {
    return res.status(400).json({ error: 'A valid Complaint Type is required' });
  }
  if (!complaint_subtype || !COMPLAINT_TYPES[complaint_type].includes(complaint_subtype)) {
    return res.status(400).json({ error: 'A valid Complaint Sub Type for the selected Complaint Type is required' });
  }

  const info = db.prepare(`
    INSERT INTO grievances (hostel_id, student_id, complaint_type, complaint_subtype, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(student.hostel_id, student.id, complaint_type, complaint_subtype, description || null);

  const grievance = db.prepare(`
    SELECT g.*, h.name AS hostel_name, s.roll_no, s.name AS student_name
    FROM grievances g JOIN hostels h ON h.id = g.hostel_id JOIN students s ON s.id = g.student_id
    WHERE g.id = ?
  `).get(info.lastInsertRowid);
  res.status(201).json({ grievance });
});

// Update status (in-progress / resolved) - staff only.
router.put('/:id', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { status, resolved_remarks } = req.body || {};
  if (!['open', 'in-progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'status must be open, in-progress or resolved' });
  }
  const grievance = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!assertHostelAccess(req, res, grievance.hostel_id)) return;

  if (status === 'resolved') {
    db.prepare("UPDATE grievances SET status = ?, resolved_remarks = ?, resolved_date = datetime('now') WHERE id = ?")
      .run(status, resolved_remarks || null, req.params.id);
  } else {
    db.prepare('UPDATE grievances SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  res.json({ grievance: db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id) });
});

module.exports = router;
