# Deploying the Hostel Management System

The app now deploys as a **single service**: the Node/Express API builds the
React frontend and serves it from the same process, so you get one URL for
everything (no separate frontend host, no CORS setup needed).

## Option A — Render (recommended, free tier, ~5 minutes)

1. Push this repo to your own GitHub account if it isn't already there, and
   make sure the branch you want to deploy (e.g. `claude/hostel-management-system-kp22ul`
   or `main` after merging) is up to date.
2. Go to [render.com](https://render.com) and sign up / log in (GitHub login is easiest).
3. Click **New +** → **Blueprint**, and select this repository. Render will
   detect the `render.yaml` file at the repo root and pre-fill a single web
   service (`hostel-management-system`) for you — it already sets:
   - Build command: `npm install --prefix client && npm run build --prefix client && npm install --prefix server`
   - Start command: `npm start --prefix server`
   - `JWT_SECRET`: auto-generated securely
4. Click **Apply** / **Create**. Render will build and deploy — this takes
   a few minutes on the first deploy.
5. Once it's live, Render gives you a URL like
   `https://hostel-management-system.onrender.com` — that's your online app.
6. Open it, log in with the seeded default admin:
   - email: `admin@hostel.local`
   - password: `Admin@123`
   - **Change this password immediately** (Manage Users → your account, or
     create a new Admin user and deactivate the default one).

**No Blueprint option in your dashboard?** Deploy manually instead:
New + → Web Service → connect the repo → Environment: `Node` → Build Command
`npm install --prefix client && npm run build --prefix client && npm install --prefix server`
→ Start Command `npm start --prefix server` → add an env var `JWT_SECRET` set
to any long random string → Create Web Service.

### Data persistence on Render's free plan

The free plan's filesystem is **ephemeral** — the SQLite database resets
whenever the service redeploys or restarts (e.g. after spinning down from
inactivity). That's fine for trying the app out, but not for real student
data. To make it persistent:

1. Upgrade the service to the **Starter** plan (paid).
2. In the service settings, add a **Disk** (e.g. 1 GB, mounted at `/data`).
3. Add an env var `DB_PATH=/data/data.sqlite` so the app writes the database
   to that persistent disk instead of the ephemeral one.
4. Redeploy.

## Option B — Railway / Fly.io / any Node host

The app is a plain Node service, so the same two commands work anywhere
that runs Node 18+:

```bash
# Build
npm install --prefix client && npm run build --prefix client && npm install --prefix server

# Start
npm start --prefix server
```

Set an env var `JWT_SECRET` to a long random string, and optionally `PORT`
(most hosts set this for you) and `DB_PATH` if you want the SQLite file on a
mounted persistent volume. No other configuration or CORS setup is required
since the frontend is served from the same origin as the API.

## Option C — Run it on your own server / VPS

```bash
git clone <your-repo-url>
cd Hostel-Management-System
npm install --prefix client && npm run build --prefix client
npm install --prefix server
JWT_SECRET="$(openssl rand -hex 32)" PORT=4000 npm start --prefix server
```

Put a reverse proxy (Nginx, Caddy) in front of port 4000 with your domain
and TLS certificate, and you have a fully online, persistent deployment
(the SQLite file at `server/data.sqlite` lives on disk normally, so it
survives restarts here).

## After you have a URL

1. Log in as the default admin and **change the password** (or create a new
   Admin user via Manage Users and deactivate the seeded one).
2. Optionally run `npm run seed --prefix server` once against your deployed
   database (e.g. via the host's shell/console feature) to add demo wardens
   and students, or just start registering real students from
   **Student Registration**.
3. Add your real Warden and Student user accounts from **Manage Users**.
