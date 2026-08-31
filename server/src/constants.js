// Shared constants for the Hostel Management System backend.

const HOSTELS = [
  'UG Boys Hostel',
  'UG Girls Hostel',
  'PG Boys Hostel',
  'PG Girls Hostel',
  'Dental Hostel',
];

// Role names. Warden roles are tied 1:1 to a hostel above.
const ROLES = {
  ADMIN: 'ADMIN',
  WARDEN_UG_BOYS: 'WARDEN_UG_BOYS',
  WARDEN_UG_GIRLS: 'WARDEN_UG_GIRLS',
  WARDEN_PG_BOYS: 'WARDEN_PG_BOYS',
  WARDEN_PG_GIRLS: 'WARDEN_PG_GIRLS',
  WARDEN_DENTAL: 'WARDEN_DENTAL',
  STUDENT: 'STUDENT',
};

// Maps each warden role to the hostel name it is scoped to.
const WARDEN_ROLE_TO_HOSTEL = {
  [ROLES.WARDEN_UG_BOYS]: 'UG Boys Hostel',
  [ROLES.WARDEN_UG_GIRLS]: 'UG Girls Hostel',
  [ROLES.WARDEN_PG_BOYS]: 'PG Boys Hostel',
  [ROLES.WARDEN_PG_GIRLS]: 'PG Girls Hostel',
  [ROLES.WARDEN_DENTAL]: 'Dental Hostel',
};

const WARDEN_ROLES = Object.keys(WARDEN_ROLE_TO_HOSTEL);

const STAFF_ROLES = [ROLES.ADMIN, ...WARDEN_ROLES];

const COMPLAINT_TYPES = {
  Electrical: ['Fan', 'Light / Tube', 'Switch / Socket', 'Wiring', 'AC / Cooler'],
  Carpenter: ['Bed', 'Table / Chair', 'Door / Window', 'Cupboard / Almirah'],
  Plumbing: ['Tap / Water Supply', 'Toilet / Flush', 'Wash Basin', 'Drainage / Leakage'],
  'Internet/Wifi': ['No Connection', 'Slow Speed', 'Router Not Working', 'LAN Cable Issue'],
};

module.exports = {
  HOSTELS,
  ROLES,
  WARDEN_ROLE_TO_HOSTEL,
  WARDEN_ROLES,
  STAFF_ROLES,
  COMPLAINT_TYPES,
};
