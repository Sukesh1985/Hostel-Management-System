require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

require('./db'); // ensures schema + seed run before routes are mounted

const authRoutes = require('./routes/auth');
const hostelRoutes = require('./routes/hostels');
const studentRoutes = require('./routes/students');
const roomRoutes = require('./routes/rooms');
const attendanceRoutes = require('./routes/attendance');
const inoutRoutes = require('./routes/inout');
const grievanceRoutes = require('./routes/grievances');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const { ROLES, WARDEN_ROLE_TO_HOSTEL, COMPLAINT_TYPES } = require('./constants');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/constants', (req, res) => {
  res.json({ roles: ROLES, warden_role_to_hostel: WARDEN_ROLE_TO_HOSTEL, complaint_types: COMPLAINT_TYPES });
});

app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/inout', inoutRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  next();
});

// Serve the built React app (client/dist) when present, so a single deploy
// (e.g. one Render web service) hosts both the API and the frontend on one URL.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Hostel Management System API listening on port ${PORT}`);
});
