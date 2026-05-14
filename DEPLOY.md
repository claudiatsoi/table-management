# Deployment Checklist

This project uses one Node service that:
- serves the React production build
- exposes API routes under `/api`
- stores project data in PostgreSQL when `DATABASE_URL` is set
- falls back to a JSON file only when `DATABASE_URL` is not set

## Recommended Production Storage

Use PostgreSQL in all cloud deployments.

Required env var:
- `DATABASE_URL=<postgres-connection-string>`

Optional env var:
- `DATABASE_SSL=true` (default behavior in production)
- set `DATABASE_SSL=false` only for local/non-SSL databases

## Prerequisites

- Push latest code to your Git repo
- Make sure root scripts exist in `package.json`:
  - `build`: builds the client
  - `start`: starts `server/index.js`

## Render (Blueprint)

This repo includes `render.yaml`.

1. In Render, create a new Blueprint service from this repo.
2. Render auto-reads `render.yaml` for build/start settings.
3. Wait for deploy to finish.
4. Verify:
   - `https://<your-app>/api/projects`
   - app home page loads and can create a project.

Notes:
- `DATABASE_URL` is recommended for production persistence
- if not using PostgreSQL, `DB_FILE` is set to `/var/data/database.json`
- when file fallback is used, persistent disk is mounted at `/var/data`

## Railway

This repo includes `railway.json`.

1. In Railway, create project from this repo.
2. Railway reads `railway.json` for build/start commands.
3. Add a Volume in Railway UI and mount it to `/data`.
4. Set environment variable:
   - `DATABASE_URL=<your-postgres-url>`
5. (Optional fallback only) If you do not use PostgreSQL:
   - `DB_FILE=/data/database.json`
6. Deploy.
7. Verify:
   - `https://<your-app>/api/projects`
   - app home page loads and can create a project.

## Vercel

This repo includes `vercel.json` for monorepo routing.

1. Import repo into Vercel.
2. Keep root as project directory.
3. Set environment variable:
   - `DATABASE_URL=<your-postgres-url>`
4. Redeploy and verify:
   - `https://<your-app>/api/projects`
   - app home page loads and can create a project.

Note:
- Vercel filesystem is ephemeral, so `DB_FILE` fallback should not be used for persistent production data.

## Troubleshooting

- If frontend loads but API fails:
  - check service logs for Express startup and route errors.
- If data disappears after redeploy:
  - confirm `DATABASE_URL` is set correctly
  - if using fallback mode, confirm persistent disk/volume is mounted and `DB_FILE` points to it.
- If build fails:
  - run `npm run build` locally at repo root and fix the same error first.

## Security / Reliability Next Steps

- Add auth before sharing publicly.
- Replace JSON file storage with managed database for multi-instance reliability.
- Add backups for persistent data.
