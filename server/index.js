const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'database.json');
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = Boolean(DATABASE_URL);

const useSSL = process.env.DATABASE_SSL === 'true'
  || (process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false');

const pool = USE_POSTGRES
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: useSSL ? { rejectUnauthorized: false } : false
    })
  : null;

let storageInitPromise = null;

function mapRowToProject(row) {
  return {
    id: row.id,
    name: row.name,
    guests: row.guests || [],
    tables: row.tables || [],
    mode: row.mode || 'table',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function ensureStorageReady() {
  if (storageInitPromise) return storageInitPromise;

  storageInitPromise = (async () => {
    if (!USE_POSTGRES) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        guests JSONB NOT NULL DEFAULT '[]'::jsonb,
        tables JSONB NOT NULL DEFAULT '[]'::jsonb,
        mode TEXT NOT NULL DEFAULT 'table',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  })();

  return storageInitPromise;
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { projects: {} };
}

function saveDB(data) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function listProjects() {
  await ensureStorageReady();

  if (USE_POSTGRES) {
    const result = await pool.query(`
      SELECT id, name, created_at, updated_at
      FROM projects
      ORDER BY updated_at DESC
    `);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    }));
  }

  const db = loadDB();
  const projects = Object.values(db.projects).map(p => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    updated_at: p.updated_at
  }));
  return projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

async function getProject(id) {
  await ensureStorageReady();

  if (USE_POSTGRES) {
    const result = await pool.query(
      `SELECT id, name, guests, tables, mode, created_at, updated_at FROM projects WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) return null;
    return mapRowToProject(result.rows[0]);
  }

  const db = loadDB();
  return db.projects[id] || null;
}

async function saveProject(project) {
  await ensureStorageReady();

  if (USE_POSTGRES) {
    const result = await pool.query(
      `
      INSERT INTO projects (id, name, guests, tables, mode, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, COALESCE($6::timestamptz, NOW()), NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        guests = EXCLUDED.guests,
        tables = EXCLUDED.tables,
        mode = EXCLUDED.mode,
        updated_at = NOW()
      RETURNING id, name, guests, tables, mode, created_at, updated_at
      `,
      [
        project.id,
        project.name,
        JSON.stringify(project.guests || []),
        JSON.stringify(project.tables || []),
        project.mode || 'table',
        project.created_at || null
      ]
    );
    return mapRowToProject(result.rows[0]);
  }

  const db = loadDB();
  db.projects[project.id] = {
    ...project,
    updated_at: new Date().toISOString()
  };
  saveDB(db);
  return db.projects[project.id];
}

async function deleteProject(id) {
  await ensureStorageReady();

  if (USE_POSTGRES) {
    const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  const db = loadDB();
  if (!db.projects[id]) return false;
  delete db.projects[id];
  saveDB(db);
  return true;
}

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (err) {
    console.error('Failed to list projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Failed to load project:', err);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const id = uuidv4();
    const { name, guests = [], tables = [], mode = 'table' } = req.body;
    const project = {
      id,
      name: name || 'Untitled Project',
      guests,
      tables,
      mode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const saved = await saveProject(project);
    res.json(saved);
  } catch (err) {
    console.error('Failed to create project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name, guests, tables, mode } = req.body;
    const existing = await getProject(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = {
      ...existing,
      name: name ?? existing.name,
      guests: guests ?? existing.guests,
      tables: tables ?? existing.tables,
      mode: mode ?? existing.mode ?? 'table'
    };
    const saved = await saveProject(project);
    res.json(saved);
  } catch (err) {
    console.error('Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Serve React static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all for React routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Only listen locally, not on Vercel (serverless)
if (!process.env.VERCEL) {
  ensureStorageReady()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        if (USE_POSTGRES) {
          console.log('Storage: PostgreSQL');
        } else {
          console.log(`Storage: file (${DB_FILE})`);
        }
      });
    })
    .catch(err => {
      console.error('Failed to initialize storage:', err);
      process.exit(1);
    });
}

// Initialize storage on startup (needed for Vercel cold starts)
ensureStorageReady().catch(err => {
  console.error('Failed to initialize storage:', err);
});

module.exports = app;