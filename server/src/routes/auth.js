const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authenticate } = require('../middleware/auth');
const { ROLES } = require('../constants');

const router = express.Router();

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Public online self-registration for students.
router.post('/register-student', (req, res) => {
  const {
    roll_no, hostel_name, name, course, batch, mobile_no, email,
    father_name, father_mobile, mother_name, mother_mobile, address,
    password,
  } = req.body || {};

  if (!roll_no || !hostel_name || !name || !password) {
    return res.status(400).json({ error: 'Roll No, Hostel, Name and Password are required' });
  }

  const hostel = db.prepare('SELECT * FROM hostels WHERE name = ?').get(hostel_name);
  if (!hostel) return res.status(400).json({ error: 'Invalid hostel selected' });

  const existing = db.prepare('SELECT id FROM students WHERE roll_no = ?').get(roll_no.trim());
  if (existing) return res.status(409).json({ error: 'A student with this Roll No is already registered' });

  const emailNorm = email ? email.trim().toLowerCase() : null;
  if (emailNorm) {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
    if (existingUser) return res.status(409).json({ error: 'This email is already registered' });
  }

  const insertStudent = db.prepare(`
    INSERT INTO students
      (roll_no, name, hostel_id, course, batch, mobile_no, email,
       father_name, father_mobile, mother_name, mother_mobile, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txn = db.transaction(() => {
    const info = insertStudent.run(
      roll_no.trim(), name.trim(), hostel.id, course || null, batch || null,
      mobile_no || null, emailNorm, father_name || null, father_mobile || null,
      mother_name || null, mother_mobile || null, address || null
    );
    const studentId = info.lastInsertRowid;

    const loginEmail = emailNorm || `${roll_no.trim().toLowerCase()}@students.hostel.local`;
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role, student_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name.trim(), loginEmail, passwordHash, ROLES.STUDENT, studentId);

    return studentId;
  });

  try {
    const studentId = txn();
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.status(201).json({ student });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

module.exports = router;
