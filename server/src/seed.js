// Optional demo-data seeder. Run with `npm run seed` after the server has started at least once
// (so the schema + hostels + default admin already exist).
const bcrypt = require('bcryptjs');
const db = require('./db');
const { ROLES, WARDEN_ROLE_TO_HOSTEL } = require('./constants');

const hostelByName = (name) => db.prepare('SELECT * FROM hostels WHERE name = ?').get(name);

function ensureWarden(role) {
  const hostelName = WARDEN_ROLE_TO_HOSTEL[role];
  const hostel = hostelByName(hostelName);
  const email = `warden.${hostel.id}@hostel.local`;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;
  db.prepare('INSERT INTO users (name, email, password_hash, role, hostel_id) VALUES (?, ?, ?, ?, ?)')
    .run(`${hostelName} Warden`, email, bcrypt.hashSync('Warden@123', 10), role, hostel.id);
  console.log(`Seeded warden: ${email} / Warden@123 (${hostelName})`);
}

Object.keys(WARDEN_ROLE_TO_HOSTEL).forEach(ensureWarden);

const demoStudents = [
  { roll_no: 'UGB2401', hostel: 'UG Boys Hostel', name: 'Arjun Mehta', course: 'B.Tech CSE', batch: '2024-28' },
  { roll_no: 'UGG2401', hostel: 'UG Girls Hostel', name: 'Priya Sharma', course: 'B.Tech ECE', batch: '2024-28' },
  { roll_no: 'PGB2401', hostel: 'PG Boys Hostel', name: 'Rohan Gupta', course: 'M.Tech CSE', batch: '2024-26' },
  { roll_no: 'PGG2401', hostel: 'PG Girls Hostel', name: 'Sneha Iyer', course: 'M.Tech ECE', batch: '2024-26' },
  { roll_no: 'DEN2401', hostel: 'Dental Hostel', name: 'Karan Verma', course: 'BDS', batch: '2024-29' },
];

const insertStudent = db.prepare(`
  INSERT OR IGNORE INTO students
    (roll_no, name, hostel_id, course, batch, mobile_no, email, father_name, father_mobile, mother_name, mother_mobile, address)
  VALUES (@roll_no, @name, @hostel_id, @course, @batch, @mobile_no, @email, @father_name, @father_mobile, @mother_name, @mother_mobile, @address)
`);

for (const s of demoStudents) {
  const hostel = hostelByName(s.hostel);
  insertStudent.run({
    roll_no: s.roll_no,
    name: s.name,
    hostel_id: hostel.id,
    course: s.course,
    batch: s.batch,
    mobile_no: '9999900000',
    email: `${s.roll_no.toLowerCase()}@students.hostel.local`,
    father_name: `Father of ${s.name}`,
    father_mobile: '9999911111',
    mother_name: `Mother of ${s.name}`,
    mother_mobile: '9999922222',
    address: 'Demo Address, Demo City',
  });
}

const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (hostel_id, room_no, capacity) VALUES (?, ?, ?)');
for (const s of demoStudents) {
  const hostel = hostelByName(s.hostel);
  insertRoom.run(hostel.id, '101', 2);
  insertRoom.run(hostel.id, '102', 2);
}

console.log('Demo data seeded. Student roll numbers:', demoStudents.map((s) => s.roll_no).join(', '));
