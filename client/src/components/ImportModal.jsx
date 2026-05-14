import React, { useState } from 'react';

function ImportModal({ onClose, onImport }) {
  const [csvData, setCsvData] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      setError('No data found');
      return null;
    }

    let headers, data;

    if (hasHeader) {
      headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i] || '');
        return obj;
      });
    } else {
      const cols = lines[0].split(',').length;
      headers = Array.from({ length: cols }, (_, i) => `Field${i + 1}`);
      data = lines.map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i] || '');
        return obj;
      });
    }

    if (!headers.some(h => h.toLowerCase() === 'name')) {
      setError('CSV must have a "name" column');
      return null;
    }

    return { headers, data };
  };

  const handleParse = () => {
    const result = parseCSV(csvData);
    if (result) {
      setPreview(result);
      setError('');
    }
  };

  const handleImport = () => {
    if (preview) {
      onImport(preview.data);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Import Guests from CSV</h2>

        <div className="form-group">
          <label>Paste CSV data:</label>
          <textarea
            value={csvData}
            onChange={e => setCsvData(e.target.value)}
            placeholder="name,company,job_title,age&#10;John Doe,ABC Corp,Manager,35&#10;Jane Smith,XYZ Inc,Director,28"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={e => setHasHeader(e.target.checked)}
            />
            First row contains headers
          </label>
        </div>

        {error && <div style={{ color: '#dc3545', marginBottom: 12 }}>{error}</div>}

        <div className="actions">
          <button className="btn" onClick={handleParse}>Preview</button>
          {preview && (
            <button className="btn btn-secondary" onClick={handleImport}>
              Import {preview.data.length} guests
            </button>
          )}
        </div>

        {preview && (
          <div style={{ marginTop: 16 }}>
            <h3>Preview (first 5 rows)</h3>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {preview.headers.map(h => (
                    <th key={h} style={{ border: '1px solid #ddd', padding: 6, background: '#f0f0f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.data.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map(h => (
                      <td key={h} style={{ border: '1px solid #ddd', padding: 6 }}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;