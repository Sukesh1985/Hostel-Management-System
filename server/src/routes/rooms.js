const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { STAFF_ROLES } = require('../constants');

const router = express.Router();

function assertHostelAccess(req, res, hostelId) {
  const scoped = scopedHostelId(req.user);
  if (scoped !== null && scoped !== undefined && Number(scoped) !== Number(hostelId)) {
    res.status(403).json({ error: 'You can only manage rooms in your own hostel' });
    return false;
  }
  return true;
}

function roomWithOccupancy(roomId) {
  const room = db.prepare('SELECT r.*, h.name AS hostel_name FROM rooms r JOIN hostels h ON h.id = r.hostel_id WHERE r.id = ?').get(roomId);
  if (!room) return null;
  const occupied = db.prepare("SELECT COUNT(*) AS c FROM students WHERE room_id = ? AND status = 'active'").get(roomId).c;
  const effectiveStatus = room.status === 'maintenance' ? 'maintenance' : occupied >= room.capacity ? 'full' : 'available';
  return { ...room, occupied, effective_status: effectiveStatus };
}

router.get('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const { hostel_id, status } = req.query;

  let sql = 'SELECT id FROM rooms WHERE 1=1';
  const params = [];
  if (scoped) {
    sql += ' AND hostel_id = ?';
    params.push(scoped);
  } else if (hostel_id) {
    sql += ' AND hostel_id = ?';
    params.push(hostel_id);
  }
  sql += ' ORDER BY room_no';

  let rooms = db.prepare(sql).all(...params).map((r) => roomWithOccupancy(r.id));
  if (status) rooms = rooms.filter((r) => r.effective_status === status);
  res.json({ rooms });
});

router.get('/:id', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const room = roomWithOccupancy(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!assertHostelAccess(req, res, room.hostel_id)) return;
  const occupants = db.prepare("SELECT * FROM students WHERE room_id = ? AND status = 'active'").all(req.params.id);
  const history = db.prepare(`
    SELECT rh.*, s.name AS student_name, s.roll_no
    FROM room_history rh JOIN students s ON s.id = rh.student_id
    WHERE rh.room_id = ? ORDER BY rh.action_date DESC
  `).all(req.params.id);
  res.json({ room, occupants, history });
});

// Add Room
router.post('/', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { hostel_id, room_no, capacity } = req.body || {};
  if (!hostel_id || !room_no || !capacity) {
    return res.status(400).json({ error: 'Hostel, Room No and Capacity are required' });
  }
  if (!assertHostelAccess(req, res, hostel_id)) return;
  try {
    const info = db.prepare('INSERT INTO rooms (hostel_id, room_no, capacity) VALUES (?, ?, ?)')
      .run(hostel_id, String(room_no).trim(), Number(capacity));
    res.status(201).json({ room: roomWithOccupancy(info.lastInsertRowid) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'This room number already exists in the selected hostel' });
    }
    res.status(500).json({ error: 'Failed to add room', detail: err.message });
  }
});

// Room Allotment - assign a currently unassigned student to a room
router.post('/allot', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { student_id, room_id, remarks } = req.body || {};
  if (!student_id || !room_id) return res.status(400).json({ error: 'Student and Room are required' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (student.room_id) return res.status(409).json({ error: 'Student already has a room. Use Room Shifting instead.' });

  const room = roomWithOccupancy(room_id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.hostel_id !== student.hostel_id) return res.status(400).json({ error: 'Room must be in the same hostel as the student' });
  if (!assertHostelAccess(req, res, room.hostel_id)) return;
  if (room.effective_status === 'full') return res.status(409).json({ error: 'Room is already full' });
  if (room.effective_status === 'maintenance') return res.status(409).json({ error: 'Room is under maintenance' });

  const txn = db.transaction(() => {
    db.prepare('UPDATE students SET room_id = ? WHERE id = ?').run(room_id, student_id);
    db.prepare('INSERT INTO room_history (student_id, room_id, action, remarks) VALUES (?, ?, ?, ?)')
      .run(student_id, room_id, 'allot', remarks || null);
  });
  txn();
  res.json({ student: db.prepare('SELECT * FROM students WHERE id = ?').get(student_id), room: roomWithOccupancy(room_id) });
});

// Room Shifting - move a student from their current room to a new one
router.post('/shift', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { student_id, new_room_id, remarks } = req.body || {};
  if (!student_id || !new_room_id) return res.status(400).json({ error: 'Student and new Room are required' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (!student.room_id) return res.status(409).json({ error: 'Student has no current room. Use Room Allotment instead.' });

  const oldRoomId = student.room_id;
  const newRoom = roomWithOccupancy(new_room_id);
  if (!newRoom) return res.status(404).json({ error: 'New room not found' });
  if (newRoom.hostel_id !== student.hostel_id) return res.status(400).json({ error: 'Room must be in the same hostel as the student' });
  if (!assertHostelAccess(req, res, newRoom.hostel_id)) return;
  if (String(new_room_id) === String(oldRoomId)) return res.status(400).json({ error: 'Student is already in this room' });
  if (newRoom.effective_status === 'full') return res.status(409).json({ error: 'New room is already full' });
  if (newRoom.effective_status === 'maintenance') return res.status(409).json({ error: 'New room is under maintenance' });

  const txn = db.transaction(() => {
    db.prepare('INSERT INTO room_history (student_id, room_id, action, remarks) VALUES (?, ?, ?, ?)')
      .run(student_id, oldRoomId, 'shift_out', remarks || null);
    db.prepare('UPDATE students SET room_id = ? WHERE id = ?').run(new_room_id, student_id);
    db.prepare('INSERT INTO room_history (student_id, room_id, action, remarks) VALUES (?, ?, ?, ?)')
      .run(student_id, new_room_id, 'shift_in', remarks || null);
  });
  txn();
  res.json({ student: db.prepare('SELECT * FROM students WHERE id = ?').get(student_id), room: roomWithOccupancy(new_room_id) });
});

// Room Vacant - free up a student's current room
router.post('/vacate', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const { student_id, remarks } = req.body || {};
  if (!student_id) return res.status(400).json({ error: 'Student is required' });

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (!student.room_id) return res.status(409).json({ error: 'Student does not currently occupy a room' });
  if (!assertHostelAccess(req, res, student.hostel_id)) return;

  const oldRoomId = student.room_id;
  const txn = db.transaction(() => {
    db.prepare('INSERT INTO room_history (student_id, room_id, action, remarks) VALUES (?, ?, ?, ?)')
      .run(student_id, oldRoomId, 'vacate', remarks || null);
    db.prepare('UPDATE students SET room_id = NULL WHERE id = ?').run(student_id);
  });
  txn();
  res.json({ student: db.prepare('SELECT * FROM students WHERE id = ?').get(student_id), room: roomWithOccupancy(oldRoomId) });
});

module.exports = router;
