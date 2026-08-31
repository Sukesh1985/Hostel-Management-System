const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { HOSTELS, ROLES } = require('./constants');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS hostels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id),
  course TEXT,
  batch TEXT,
  mobile_no TEXT,
  email TEXT,
  father_name TEXT,
  father_mobile TEXT,
  mother_name TEXT,
  mother_mobile TEXT,
  address TEXT,
  room_id INTEGER REFERENCES rooms(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  hostel_id INTEGER REFERENCES hostels(id),
  student_id INTEGER REFERENCES students(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id),
  room_no TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hostel_id, room_no)
);

CREATE TABLE IF NOT EXISTS room_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  action TEXT NOT NULL,
  action_date TEXT NOT NULL DEFAULT (datetime('now')),
  remarks TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  marked_by INTEGER REFERENCES users(id),
  marked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS student_inout (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  out_date TEXT NOT NULL,
  out_time TEXT NOT NULL,
  in_date TEXT,
  in_time TEXT,
  place TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'out',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grievances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  complaint_type TEXT NOT NULL,
  complaint_subtype TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  raised_date TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_date TEXT,
  resolved_remarks TEXT
);
`);

// --- Seed hostels (fixed list) ---
const insertHostel = db.prepare('INSERT OR IGNORE INTO hostels (name) VALUES (?)');
const seedHostels = db.transaction(() => {
  for (const name of HOSTELS) insertHostel.run(name);
});
seedHostels();

// --- Seed a default admin user if no users exist ---
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const passwordHash = bcrypt.hashSync('Admin@123', 10);
  db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run('System Admin', 'admin@hostel.local', passwordHash, ROLES.ADMIN);
  // eslint-disable-next-line no-console
  console.log('Seeded default admin: admin@hostel.local / Admin@123 (change this after first login)');
}

module.exports = db;
