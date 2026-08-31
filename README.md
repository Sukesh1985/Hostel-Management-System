# Hostel Management System

A full-stack web application for managing hostel operations: student registration,
room allotment, attendance, in/out tracking, grievances, reporting and user
administration.

## Modules

1. **Online Student Registration** — students self-register (or staff register them)
   with Roll No, Hostel (UG Boys / UG Girls / PG Boys / PG Girls / Dental), course,
   batch, contact details and a full Parents section (father/mother name & mobile,
   address).
2. **Room Management** — Add Rooms, Room Allotment, Room Shifting, Room Vacant, with
   a full history of every move per student.
3. **Online Students Attendance** — mark present/absent per hostel per day, with a
   roster view and bulk "mark all" actions.
4. **Students In & Out** — look a student up by Roll No, log outgoing (date, time,
   place, reason) and mark them back in (date, time), with full history.
5. **Grievances** — raise a complaint against a student's hostel, with cascading
   Complaint Type → Complaint Sub Type dropdowns (Electrical, Carpenter, Plumbing,
   Internet/Wifi, each with their own sub-types), and status tracking
   (open → in-progress → resolved).
6. **Reports Dashboard** — hostel occupancy, today's attendance, students currently
   out, and grievance breakdowns by status/type.
7. **User Management** — an Admin can add users for every role: Admin, each
   hostel's Warden (UG Boys, UG Girls, PG Boys, PG Girls, Dental), and Students
   (linked to their registration record).

## Tech stack

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT authentication,
  bcrypt password hashing.
- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios.

## Roles & access control

| Role | Access |
|---|---|
| `ADMIN` | Full access to every hostel and module, plus user management |
| `WARDEN_UG_BOYS` / `WARDEN_UG_GIRLS` / `WARDEN_PG_BOYS` / `WARDEN_PG_GIRLS` / `WARDEN_DENTAL` | Same modules as Admin, scoped to their own hostel only |
| `STUDENT` | Dashboard, own profile, own attendance/in-out history, raising grievances |

## Getting started

### 1. Backend

```bash
cd server
cp .env.example .env   # edit JWT_SECRET for anything beyond local dev
npm install
npm run dev            # starts the API on http://localhost:4000
```

On first run the database schema is created automatically and a default admin
user is seeded:

```
email:    admin@hostel.local
password: Admin@123
```

**Change this password after first login in a real deployment.**

Optionally load demo data (5 hostel wardens + 5 sample students, one per hostel):

```bash
npm run seed
```

### 2. Frontend

```bash
cd client
npm install
npm run dev             # starts the app on http://localhost:5173
```

The dev server proxies `/api` requests to `http://localhost:4000` (see
`client/vite.config.js`). Open http://localhost:5173 in a browser.

### 3. Production build

Building the client and then starting the server serves both the API and
the frontend from one process on one URL — no separate static host or CORS
setup needed:

```bash
npm install --prefix client && npm run build --prefix client   # outputs client/dist
npm install --prefix server
npm start --prefix server        # serves the built client + the API on the same port
```

## Deploying online

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to get a
real public URL (Render free tier, Railway/Fly.io, or your own VPS). A
`render.yaml` blueprint is included for a one-click Render deploy.

## Project structure

```
server/
  src/
    constants.js       # hostels, roles, complaint type/sub-type map
    db.js               # SQLite schema + seed of fixed hostels + default admin
    seed.js              # optional demo data
    middleware/auth.js   # JWT auth + role/hostel scoping
    routes/               # one file per module (students, rooms, attendance, ...)
client/
  src/
    context/AuthContext.jsx
    components/           # Layout, ProtectedRoute
    pages/                 # Login, Register, Dashboard, Students, Rooms,
                            # Attendance, InOut, Grievances, Users, Profile
```
