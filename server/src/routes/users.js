const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, WARDEN_ROLE_TO_HOSTEL } = require('../constants');

const router = express.Router();

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

router.get('/', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  const users = db.prepare(`
    SELECT u.*, h.name AS hostel_name, s.roll_no AS student_roll_no
    FROM users u
    LEFT JOIN hostels h ON h.id = u.hostel_id
    LEFT JOIN students s ON s.id = u.student_id
    ORDER BY u.role, u.name
  `).all();
  res.json({ users: users.map(publicUser) });
});

// Admin adds a new user of any role: Admin, per-hostel Warden, or Student (linked to an existing student record).
router.post('/', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  const { name, email, password, role, student_id } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, Email, Password and Role are required' });
  }
  if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });

  let hostelId = null;
  if (WARDEN_ROLE_TO_HOSTEL[role]) {
    const hostel = db.prepare('SELECT id FROM hostels WHERE name = ?').get(WARDEN_ROLE_TO_HOSTEL[role]);
    hostelId = hostel.id;
  }

  let studentId = null;
  if (role === ROLES.STUDENT) {
    if (!student_id) return res.status(400).json({ error: 'student_id is required for Student role users' });
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(student_id);
    if (!student) return res.status(400).json({ error: 'Student not found' });
    studentId = student.id;
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, hostel_id, student_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), email.trim().toLowerCase(), passwordHash, role, hostelId, studentId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user', detail: err.message });
  }
});

router.put('/:id', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { name, active, password } = req.body || {};
  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
