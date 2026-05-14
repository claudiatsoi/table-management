const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_FILE = path.join(__dirname, 'database.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { projects: {} };
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getProject(id) {
  const db = loadDB();
  return db.projects[id] || null;
}

function saveProject(project) {
  const db = loadDB();
  db.projects[project.id] = {
    ...project,
    updated_at: new Date().toISOString()
  };
  saveDB(db);
}

app.get('/api/projects', (req, res) => {
  const db = loadDB();
  const projects = Object.values(db.projects).map(p => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    updated_at: p.updated_at
  }));
  res.json(projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)));
});

app.get('/api/projects/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.post('/api/projects', (req, res) => {
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
  saveProject(project);
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const { name, guests, tables, mode } = req.body;
  const existing = getProject(req.params.id);
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
  saveProject(project);
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const db = loadDB();
  if (!db.projects[req.params.id]) {
    return res.status(404).json({ error: 'Project not found' });
  }
  delete db.projects[req.params.id];
  saveDB(db);
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});