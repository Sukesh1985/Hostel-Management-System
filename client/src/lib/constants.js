// Mirrors server/src/constants.js. Kept in sync manually since these are fixed, rarely-changed values.

export const HOSTELS = [
  'UG Boys Hostel',
  'UG Girls Hostel',
  'PG Boys Hostel',
  'PG Girls Hostel',
  'Dental Hostel',
];

export const ROLES = {
  ADMIN: 'ADMIN',
  WARDEN_UG_BOYS: 'WARDEN_UG_BOYS',
  WARDEN_UG_GIRLS: 'WARDEN_UG_GIRLS',
  WARDEN_PG_BOYS: 'WARDEN_PG_BOYS',
  WARDEN_PG_GIRLS: 'WARDEN_PG_GIRLS',
  WARDEN_DENTAL: 'WARDEN_DENTAL',
  STUDENT: 'STUDENT',
};

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  WARDEN_UG_BOYS: 'UG Boys Hostel Warden',
  WARDEN_UG_GIRLS: 'UG Girls Hostel Warden',
  WARDEN_PG_BOYS: 'PG Boys Hostel Warden',
  WARDEN_PG_GIRLS: 'PG Girls Hostel Warden',
  WARDEN_DENTAL: 'Dental Hostel Warden',
  STUDENT: 'Student',
};

export const WARDEN_ROLES = [
  ROLES.WARDEN_UG_BOYS,
  ROLES.WARDEN_UG_GIRLS,
  ROLES.WARDEN_PG_BOYS,
  ROLES.WARDEN_PG_GIRLS,
  ROLES.WARDEN_DENTAL,
];

export const STAFF_ROLES = [ROLES.ADMIN, ...WARDEN_ROLES];
