import React from 'react';
import { useDraggable } from '@dnd-kit/core';

function GuestCard({ guest, onDelete, isSelected, onToggleSelect, showTooltip }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: guest.id
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`
  } : undefined;

  const extraFields = Object.entries(guest)
    .filter(([k]) => !['id', 'tableId', 'name'].includes(k))
    .slice(0, 2);

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggleSelect(guest.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`guest-card ${isSelected ? 'selected' : ''}`}
    >
      <div className="guest-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="guest-content" {...listeners} {...attributes}>
        <div>{guest.name}</div>
        {extraFields.length > 0 && (
          <div className="guest-info">
            {extraFields.map(([k, v], idx) => (
              <span key={k}>{k}: {v}{idx < extraFields.length - 1 ? ' | ' : ''}</span>
            ))}
          </div>
        )}
      </div>
      {onDelete && (
        <div className="guest-actions">
          <button className="delete-btn" onClick={(e) => {
            e.stopPropagation();
            onDelete(guest.id);
          }}>Delete</button>
        </div>
      )}
      {showTooltip && (
        <div className="guest-card-tooltip">
          <div className="tooltip-name">{guest.name}</div>
          {Object.entries(guest).filter(([k]) => !['id', 'tableId'].includes(k)).map(([k, v]) => (
            <div key={k} className="tooltip-field">{k}: {v}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuestList({ guests, onDelete, selectedGuests, onToggleSelect, onClearSelection, onSelectAll }) {
  const selectedCount = selectedGuests.size;
  const allSelected = guests.length > 0 && guests.every(g => selectedGuests.has(g.id));

  return (
    <div className="guest-sidebar">
      <div className="guest-sidebar-header">
        <h2>Unassigned Guests ({guests.length})</h2>
      </div>

      {guests.length > 0 && (
        <div className="select-all-bar">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onSelectAll && onSelectAll(!allSelected)}
            />
            Select All
          </label>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="selection-bar">
          <span>{selectedCount} selected</span>
          <button className="clear-selection-btn" onClick={onClearSelection}>
            Clear
          </button>
        </div>
      )}

      <div className="guest-list">
        {guests.map(guest => (
          <GuestCard
            key={guest.id}
            guest={guest}
            onDelete={onDelete}
            isSelected={selectedGuests.has(guest.id)}
            onToggleSelect={onToggleSelect}
            showTooltip={true}
          />
        ))}
        {guests.length === 0 && (
          <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>
            No unassigned guests
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestList;