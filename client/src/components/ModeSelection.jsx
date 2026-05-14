import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function ModeSelection() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('My Event');
  const [loading, setLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  const createProject = async (mode) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          mode,
          guests: [],
          tables: []
        })
      });
      const data = await res.json();
      navigate(`/${data.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
    setLoading(false);
  };

  return (
    <div className="mode-selection">
      <div className="mode-selection-header">
        <h1>🎉 Table/Seat Management</h1>
        <p>Choose a mode to get started</p>
      </div>

      {!showNewProject ? (
        <div className="mode-cards">
          <div className="mode-card" onClick={() => setShowNewProject(true)}>
            <div className="mode-icon">📋</div>
            <h2>New Project</h2>
            <p>Create a new seating arrangement</p>
          </div>
        </div>
      ) : (
        <div className="new-project-form">
          <div className="form-group">
            <label>Project Name:</label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Annual Dinner 2024"
            />
          </div>

          <div className="mode-cards">
            <div
              className={`mode-card ${loading ? 'loading' : ''}`}
              onClick={() => !loading && createProject('table')}
            >
              <div className="mode-icon">🪑</div>
              <h2>Table Mode</h2>
              <p>Assign guests to round/rectangular tables</p>
              <ul>
                <li>Visual table cards with guest lists</li>
                <li>Drag & drop assignment</li>
                <li>Customizable table names</li>
              </ul>
            </div>

            <div
              className={`mode-card ${loading ? 'loading' : ''}`}
              onClick={() => !loading && createProject('theater')}
            >
              <div className="mode-icon">🎭</div>
              <h2>Theater Mode</h2>
              <p>Assign guests to theater rows with seats</p>
              <ul>
                <li>Row-based layout with seat numbers</li>
                <li>Custom seat prefixes (A, B, C...)</li>
                <li>Sequential seat numbering</li>
              </ul>
            </div>
          </div>

          <button className="btn-back" onClick={() => setShowNewProject(false)}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

export default ModeSelection;