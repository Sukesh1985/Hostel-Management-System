const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const hostels = db.prepare('SELECT * FROM hostels ORDER BY id').all();
  res.json({ hostels });
});

module.exports = router;
