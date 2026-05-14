import React, { useState } from 'react';

function AutoAssignModal({ guests, tables, customFields, onClose, onAssign }) {
  const [rules, setRules] = useState([
    { field: 'company', type: 'mix' }
  ]);
  const [unassignedStrategy, setUnassignedStrategy] = useState('distribute');

  const addRule = () => {
    const availableFields = ['company', 'job_title', 'age', ...customFields].filter(
      f => !rules.some(r => r.field === f)
    );
    if (availableFields.length > 0) {
      setRules([...rules, { field: availableFields[0], type: 'mix' }]);
    }
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index, key, value) => {
    const newRules = [...rules];
    newRules[index][key] = value;
    setRules(newRules);
  };

  const autoAssign = () => {
    const assignments = {};
    const unassigned = [...guests];

    const groupRule = rules.find(r => r.type === 'group');
    const balanceRule = rules.find(r => r.type === 'balance');

    if (groupRule) {
      const field = groupRule.field;
      const fieldGroups = {};
      unassigned.forEach(guest => {
        const value = guest[field] || '_unassigned_';
        if (!fieldGroups[value]) fieldGroups[value] = [];
        fieldGroups[value].push(guest);
      });

      const groupKeys = Object.keys(fieldGroups);
      groupKeys.forEach((key, index) => {
        const tableId = tables[index % tables.length]?.id;
        fieldGroups[key].forEach(guest => {
          assignments[guest.id] = tableId;
        });
      });
    } else if (balanceRule) {
      const balanceField = balanceRules[0].field;
      const values = guests.map(g => g[balanceField]).filter(Boolean);
      const isNumeric = values.length > 0 && values.every(v => !isNaN(parseFloat(v)));

      let buckets = [];
      if (isNumeric) {
        const nums = values.map(v => parseFloat(v));
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const range = max - min || 1;
        const bucketCount = Math.min(5, Math.ceil(range / 10) || 1);

        unassigned.forEach(guest => {
          const val = parseFloat(guest[balanceField]);
          if (isNaN(val)) {
            buckets.push('_none_');
          } else {
            const bucketIdx = Math.min(Math.floor((val - min) / (range / bucketCount)), bucketCount - 1);
            buckets.push(`bucket_${bucketIdx}`);
          }
        });
      } else {
        unassigned.forEach(guest => {
          buckets.push(guest[balanceField] || '_none_');
        });
      }

      const bucketCounts = {};
      buckets.forEach(b => { bucketCounts[b] = (bucketCounts[b] || 0) + 1; });

      const sortedBuckets = Object.entries(bucketCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);

      unassigned.forEach((guest, idx) => {
        const bucket = buckets[idx];
        const bucketIdx = sortedBuckets.indexOf(bucket);
        const tableId = tables[bucketIdx % tables.length]?.id;
        assignments[guest.id] = tableId;
      });
    } else {
      let currentTableIndex = 0;

      remainingGuests.forEach(guest => {
        if (rulesWithScores.some(r => r.type === 'group')) {
          const groupRule = rulesWithScores.find(r => r.type === 'group');
          const groupValue = guest[groupRule.field];

          if (!groupValue) {
            assignments[guest.id] = tables[currentTableIndex]?.id || null;
            currentTableIndex = (currentTableIndex + 1) % tables.length;
            return;
          }

          const sameGroupGuests = remainingGuests.filter(
            g => g[groupRule.field] === groupValue && assignments[g.id]
          );

          if (sameGroupGuests.length > 0) {
            const existingTableId = assignments[sameGroupGuests[0].id];
            assignments[guest.id] = existingTableId;
          } else {
            assignments[guest.id] = tables[currentTableIndex]?.id || null;
            currentTableIndex = (currentTableIndex + 1) % tables.length;
          }
        } else {
          assignments[guest.id] = tables[currentTableIndex]?.id || null;
          currentTableIndex = (currentTableIndex + 1) % tables.length;
        }
      });

      if (rulesWithScores.some(r => r.type === 'mix')) {
        const mixRule = rulesWithScores.find(r => r.type === 'mix');

        let maxIterations = 5;
        for (let iter = 0; iter < maxIterations; iter++) {
          const tableContents = {};
          tables.forEach(t => { tableContents[t.id] = {}; });

          Object.entries(assignments).forEach(([guestId, tableId]) => {
            if (!tableId) return;
            const guest = guests.find(g => g.id === guestId);
            const fieldValue = guest[mixRule.field];
            if (fieldValue) {
              if (!tableContents[tableId][fieldValue]) {
                tableContents[tableId][fieldValue] = 0;
              }
              tableContents[tableId][fieldValue]++;
            }
          });

          const newAssignments = {};
          const movedGuests = [];

          guests.forEach(guest => {
            const currentTableId = assignments[guest.id];
            if (!currentTableId) return;

            const fieldValue = guest[mixRule.field];
            if (!fieldValue) {
              newAssignments[guest.id] = currentTableId;
              return;
            }

            const currentCount = tableContents[currentTableId][fieldValue] || 0;
            const avgPerTable = guests.filter(g => g[mixRule.field] === fieldValue).length / tables.length;

            if (currentCount > avgPerTable * 1.5) {
              let bestTable = null;
              let minCount = Infinity;

              tables.forEach(table => {
                if (table.id === currentTableId) return;
                const count = tableContents[table.id][fieldValue] || 0;
                if (count < minCount) {
                  minCount = count;
                  bestTable = table.id;
                }
              });

              if (bestTable) {
                tableContents[currentTableId][fieldValue]--;
                tableContents[bestTable][fieldValue] = (tableContents[bestTable][fieldValue] || 0) + 1;
                newAssignments[guest.id] = bestTable;
                movedGuests.push(guest.id);
                return;
              }
            }
            newAssignments[guest.id] = currentTableId;
          });

          if (movedGuests.length === 0) break;
          Object.assign(assignments, newAssignments);
        }
      }
    }

    tables.forEach(table => {
      const tableGuests = Object.entries(assignments)
        .filter(([, tid]) => tid === table.id).map(([gid]) => gid);

      if (tableGuests.length > table.seats) {
        const excess = tableGuests.slice(table.seats);
        excess.forEach(guestId => {
          const emptyTable = tables.find(t =>
            t.id !== table.id &&
            Object.values(assignments).filter(id => id === t.id).length < t.seats
          );
          if (emptyTable) {
            assignments[guestId] = emptyTable.id;
          }
        });
      }
    });

    const remarks = {};
    rules.forEach(rule => {
      if (rule.type === 'balance') {
        const values = guests.map(g => g[rule.field]).filter(Boolean);
        const isNumeric = values.every(v => !isNaN(parseFloat(v)));

        tables.forEach(table => {
          const tableGuestIds = Object.entries(assignments)
            .filter(([, tid]) => tid === table.id)
            .map(([gid]) => gid);
          const tableGuests = guests.filter(g => tableGuestIds.includes(g.id));
          const fieldValues = tableGuests.map(g => g[rule.field]).filter(Boolean);

          if (isNumeric && fieldValues.length > 0) {
            const nums = fieldValues.map(v => parseFloat(v));
            const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
            remarks[table.id] = `${rule.field}: ~${avg}`;
          } else if (fieldValues.length > 0) {
            const unique = [...new Set(fieldValues)];
            if (unique.length <= 3) {
              remarks[table.id] = `${rule.field}: ${unique.join(', ')}`;
            } else {
              remarks[table.id] = `${rule.field}: mixed`;
            }
          }
        });
      } else if (rule.type === 'group') {
        tables.forEach(table => {
          const tableGuestIds = Object.entries(assignments)
            .filter(([, tid]) => tid === table.id)
            .map(([gid]) => gid);
          const tableGuests = guests.filter(g => tableGuestIds.includes(g.id));
          const fieldValues = tableGuests.map(g => g[rule.field]).filter(Boolean);
          const unique = [...new Set(fieldValues)];

          if (unique.length === 1) {
            remarks[table.id] = `${rule.field}: ${unique[0]}`;
          }
        });
      }
    });

    onAssign(assignments, remarks);
    onClose();
  };

  const totalGuests = guests.length;
  const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);
  const assignedCount = guests.filter(g => Object.values(g).some(v => v?.tableId)).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>Auto Assign Guests</h2>

        <div className="stats">
          <div className="stat">
            <div className="stat-value">{totalGuests}</div>
            <div className="stat-label">Total Guests</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalSeats}</div>
            <div className="stat-label">Total Seats</div>
          </div>
          <div className="stat">
            <div className="stat-value">{assignedCount}</div>
            <div className="stat-label">Currently Assigned</div>
          </div>
        </div>

        <div className="form-group">
          <label>Assignment Rules:</label>
          {rules.map((rule, index) => (
            <div key={index} className="rule-builder">
              <div className="rule-row">
                <select
                  value={rule.field}
                  onChange={e => updateRule(index, 'field', e.target.value)}
                >
                  {['company', 'job_title', 'age', ...customFields]
                    .filter(f => !rules.some((r, i) => i !== index && r.field === f))
                    .map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))
                  }
                </select>
                <select
                  value={rule.type}
                  onChange={e => updateRule(index, 'type', e.target.value)}
                >
                  <option value="mix">Mix across tables</option>
                  <option value="group">Group together</option>
                  <option value="balance">Balance evenly</option>
                </select>
                <button className="remove-rule" onClick={() => removeRule(index)}>×</button>
              </div>
            </div>
          ))}
          {rules.length < 5 && (
            <button className="add-rule" onClick={addRule}>+ Add Rule</button>
          )}
        </div>

        <div className="actions">
          <button className="btn" onClick={autoAssign}>Assign Guests</button>
        </div>
      </div>
    </div>
  );
}

export default AutoAssignModal;