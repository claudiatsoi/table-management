import React, { useState, useMemo } from 'react';

function DataTableView({ guests, tables, mode, isLocked, isManager, onUpdateGuest, onAssignSeat, onRemoveGuest, customFields }) {
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const sortedGuests = useMemo(() => {
    return [...guests].sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [guests, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCellClick = (guestId, field) => {
    if (isLocked || !isManager) return;
    setEditingCell(`${guestId}-${field}`);
    const guest = guests.find(g => g.id === guestId);
    setEditValue(guest?.[field] || '');
  };

  const handleCellSave = (guestId, field) => {
    onUpdateGuest(guestId, field, editValue);
    setEditingCell(null);
  };

  const getTableName = (tableId) => {
    if (!tableId) return '-';
    const table = tables.find(t => t.id === tableId);
    return table?.name || '-';
  };

  const getSeatDisplay = (guest) => {
    if (!guest.tableId) return '-';
    return guest.seat || '-';
  };

  const columns = [
    { key: 'name', label: 'Name', width: '150px' },
    ...customFields.filter(f => !['seat', 'tableId'].includes(f)).map(f => ({ key: f, label: f, width: '120px' })),
    { key: 'table', label: mode === 'theater' ? 'Row' : 'Table', width: '120px' },
    { key: 'seat', label: 'Seat', width: '80px' },
  ];

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width }}
                onClick={() => handleSort(col.key)}
                className="sortable-header"
              >
                {col.label}
                {sortField === col.key && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                  </span>
                )}
              </th>
            ))}
            {isManager && <th style={{ width: '80px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedGuests.map(guest => (
            <tr key={guest.id}>
              {columns.map(col => {
                const cellKey = `${guest.id}-${col.key}`;
                const isEditing = editingCell === cellKey;

                if (col.key === 'table') {
                  return (
                    <td
                      key={col.key}
                      onClick={() => !isLocked && isManager && alert('Use Visual mode to change table/row assignment')}
                      className={isLocked ? 'locked-cell' : 'clickable-cell'}
                    >
                      {getTableName(guest.tableId)}
                    </td>
                  );
                }

                if (col.key === 'seat') {
                  return (
                    <td
                      key={col.key}
                      className={isLocked ? 'locked-cell' : 'clickable-cell'}
                    >
                      {getSeatDisplay(guest)}
                    </td>
                  );
                }

                return (
                  <td
                    key={col.key}
                    onClick={() => handleCellClick(guest.id, col.key)}
                    className={`editable-cell ${isLocked ? 'locked-cell' : ''}`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleCellSave(guest.id, col.key)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCellSave(guest.id, col.key);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        className="cell-input"
                      />
                    ) : (
                      <span>{guest[col.key] || '-'}</span>
                    )}
                  </td>
                );
              })}
              {isManager && (
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => onRemoveGuest(guest.id)}
                    disabled={isLocked}
                  >
                    🗑
                  </button>
                </td>
              )}
            </tr>
          ))}
          {guests.length === 0 && (
            <tr>
              <td colSpan={columns.length + (isManager ? 1 : 0)} className="empty-row">
                No guests imported yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTableView;