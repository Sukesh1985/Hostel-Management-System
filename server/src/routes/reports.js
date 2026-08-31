const express = require('express');
const db = require('../db');
const { authenticate, authorize, scopedHostelId } = require('../middleware/auth');
const { STAFF_ROLES } = require('../constants');

const router = express.Router();

router.get('/dashboard', authenticate, authorize(...STAFF_ROLES), (req, res) => {
  const scoped = scopedHostelId(req.user);
  const hostelFilter = scoped ? 'AND s.hostel_id = ?' : '';
  const hostelParams = scoped ? [scoped] : [];

  const hostels = scoped
    ? db.prepare('SELECT * FROM hostels WHERE id = ?').all(scoped)
    : db.prepare('SELECT * FROM hostels ORDER BY id').all();

  // Occupancy per hostel
  const occupancy = hostels.map((h) => {
    const totalStudents = db.prepare("SELECT COUNT(*) AS c FROM students WHERE hostel_id = ? AND status = 'active'").get(h.id).c;
    const allotted = db.prepare("SELECT COUNT(*) AS c FROM students WHERE hostel_id = ? AND status = 'active' AND room_id IS NOT NULL").get(h.id).c;
    const roomStats = db.prepare('SELECT COUNT(*) AS rooms, COALESCE(SUM(capacity), 0) AS capacity FROM rooms WHERE hostel_id = ?').get(h.id);
    return {
      hostel_id: h.id,
      hostel_name: h.name,
      total_students: totalStudents,
      allotted_students: allotted,
      unallotted_students: totalStudents - allotted,
      total_rooms: roomStats.rooms,
      total_capacity: roomStats.capacity,
    };
  });

  const today = new Date().toISOString().slice(0, 10);

  // Today's attendance summary
  const attendanceSql = `
    SELECT a.status, COUNT(*) AS c
    FROM attendance a JOIN students s ON s.id = a.student_id
    WHERE a.date = ? ${hostelFilter}
    GROUP BY a.status
  `;
  const attendanceRows = db.prepare(attendanceSql).all(today, ...hostelParams);
  const attendanceToday = { present: 0, absent: 0 };
  for (const row of attendanceRows) attendanceToday[row.status] = row.c;
  const totalActiveStudents = db.prepare(`SELECT COUNT(*) AS c FROM students s WHERE s.status = 'active' ${hostelFilter}`).get(...hostelParams).c;
  attendanceToday.not_marked = Math.max(totalActiveStudents - attendanceToday.present - attendanceToday.absent, 0);

  // Students currently out
  const currentlyOutSql = `
    SELECT COUNT(*) AS c FROM student_inout io JOIN students s ON s.id = io.student_id
    WHERE io.status = 'out' ${hostelFilter}
  `;
  const currentlyOut = db.prepare(currentlyOutSql).get(...hostelParams).c;

  // Grievances by status and type
  const grievanceStatusSql = `
    SELECT g.status, COUNT(*) AS c FROM grievances g JOIN students s ON s.id = g.student_id
    WHERE 1=1 ${hostelFilter} GROUP BY g.status
  `;
  const grievancesByStatus = db.prepare(grievanceStatusSql).all(...hostelParams);

  const grievanceTypeSql = `
    SELECT g.complaint_type, COUNT(*) AS c FROM grievances g JOIN students s ON s.id = g.student_id
    WHERE g.status != 'resolved' ${hostelFilter} GROUP BY g.complaint_type
  `;
  const openGrievancesByType = db.prepare(grievanceTypeSql).all(...hostelParams);

  res.json({
    generated_at: new Date().toISOString(),
    occupancy,
    attendance_today: attendanceToday,
    currently_out: currentlyOut,
    grievances_by_status: grievancesByStatus,
    open_grievances_by_type: openGrievancesByType,
  });
});

module.exports = router;
