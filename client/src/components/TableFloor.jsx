import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function GuestTooltip({ guest }) {
  const extraFields = Object.entries(guest).filter(([k]) => !['id', 'tableId', 'name'].includes(k));
  return (
    <div className="guest-tooltip">
      <div className="tooltip-name">{guest.name}</div>
      {extraFields.map(([k, v]) => (
        <div key={k} className="tooltip-field">{k}: {v}</div>
      ))}
    </div>
  );
}

function DraggableGuestItem({ guest, onRemove, readOnly, tableId }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id, fromTable: tableId }
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(guest.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`guest-item-wrapper ${isDragging ? 'dragging' : ''}`}
    >
      <div className="guest-item">
        <span className="guest-drag-handle" {...listeners} {...attributes}>{guest.name}</span>
        {!readOnly && <button className="guest-remove-btn" onClick={handleRemoveClick}>×</button>}
      </div>
      <div className="guest-item-tooltip">
        <GuestTooltip guest={guest} />
      </div>
    </div>
  );
}

function TableDropZone({ table, guests, readOnly, onUpdate, onRemove, onUnassignGuest }) {
  const { isOver, setNodeRef } = useDroppable({ id: table.id });
  const tableGuests = table.guests.map(id => guests.find(g => g.id === id)).filter(Boolean);
  const [showSeatsEdit, setShowSeatsEdit] = useState(false);
  const isFull = tableGuests.length > table.seats;
  const allowOverflow = table.allowOverflow !== false;

  return (
    <div className={`table-card ${isOver ? 'drop-hover' : ''} ${isFull && !allowOverflow ? 'over-capacity' : ''}`}>
      <div className="table-card-header">
        {readOnly ? (
          <span className="table-name">{table.name}</span>
        ) : (
          <input
            type="text"
            className="table-name-input"
            value={table.name}
            onChange={(e) => onUpdate(table.id, { name: e.target.value })}
          />
        )}
        <span className={`seat-count ${isFull && !allowOverflow ? 'seat-full' : ''}`}>
          {tableGuests.length}/{table.seats}
        </span>
        {!readOnly && (
          <button className="remove-btn" onClick={() => onRemove(table.id)}>×</button>
        )}
      </div>

      <div className="seats-edit">
        {showSeatsEdit ? (
          <input
            type="number"
            min="1"
            value={table.seats}
            onChange={(e) => onUpdate(table.id, { seats: Math.max(1, parseInt(e.target.value) || 1) })}
            onBlur={() => setShowSeatsEdit(false)}
            autoFocus
            className="seats-input"
          />
        ) : (
          <span className="seats-label" onClick={() => !readOnly && setShowSeatsEdit(true)}>
            {table.seats} seats
          </span>
        )}
      </div>

      <div className="overflow-toggle">
        {readOnly ? (
          <span className={`overflow-status ${allowOverflow ? 'allowed' : 'blocked'}`}>
            {allowOverflow ? 'Overflow allowed' : 'No overflow'}
          </span>
        ) : (
          <label className="overflow-label">
            <input
              type="checkbox"
              checked={allowOverflow}
              onChange={(e) => onUpdate(table.id, { allowOverflow: e.target.checked })}
            />
            Allow overflow
          </label>
        )}
      </div>

      <div className="remark-section">
        {readOnly ? (
          <div className="remark-text">{table.remark || ''}</div>
        ) : (
          <input
            type="text"
            className="remark-input"
            placeholder="Remark..."
            value={table.remark || ''}
            onChange={(e) => onUpdate(table.id, { remark: e.target.value })}
          />
        )}
      </div>

      <div ref={setNodeRef} className="table-guests">
        {tableGuests.length === 0 ? (
          <div className="empty">Drop guests here</div>
        ) : (
          tableGuests.map(guest => (
            <DraggableGuestItem
              key={guest.id}
              guest={guest}
              onRemove={(guestId) => {
                if (onUnassignGuest) {
                  onUnassignGuest(guestId);
                } else {
                  const newGuests = table.guests.filter(id => id !== guestId);
                  onUpdate(table.id, { guests: newGuests });
                }
              }}
              readOnly={readOnly}
              tableId={table.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddTableSection({ onAddTable, onAddSingle }) {
  const [bulkMode, setBulkMode] = useState(false);
  const [tableCount, setTableCount] = useState(10);
  const [defaultSeats, setDefaultSeats] = useState(10);

  return (
    <div className="add-table-section">
      {bulkMode ? (
        <div className="bulk-add-form">
          <div className="bulk-add-row">
            <label>Tables:</label>
            <input
              type="number"
              min="1"
              value={tableCount}
              onChange={e => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="bulk-add-row">
            <label>Seats/Table:</label>
            <input
              type="number"
              min="1"
              value={defaultSeats}
              onChange={e => setDefaultSeats(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="bulk-add-actions">
            <button className="btn" onClick={() => { onAddTable(tableCount, defaultSeats); setBulkMode(false); }}>
              Create {tableCount} Tables
            </button>
            <button className="btn btn-secondary" onClick={() => setBulkMode(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="add-table-options">
          <button className="btn" onClick={() => setBulkMode(true)}>+ Bulk Add Tables</button>
          <button className="btn btn-secondary" onClick={onAddSingle}>+ Add Single Table</button>
        </div>
      )}
    </div>
  );
}

function SortableTableCard({ table, guests, readOnly, onUpdate, onRemove, onUnassignGuest }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: table.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  return (
    <div ref={setNodeRef} style={style} className="table-sortable-wrapper">
      <div className="table-drag-handle" {...attributes} {...listeners}>
        <span>::</span>
      </div>
      <TableDropZone
        table={table}
        guests={guests}
        readOnly={readOnly}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onUnassignGuest={onUnassignGuest}
      />
    </div>
  );
}

function TableFloor({ tables, guests, onAddTable, onUpdateTable, onRemoveTable, onUnassignGuest, readOnly, onReorderTables }) {
  const tableIds = tables.map(t => t.id);

  return (
    <div className="table-floor">
      <SortableContext items={tableIds} strategy={verticalListSortingStrategy}>
        {tables.map(table => (
          <SortableTableCard
            key={table.id}
            table={table}
            guests={guests}
            readOnly={readOnly}
            onUpdate={onUpdateTable}
            onRemove={onRemoveTable}
            onUnassignGuest={onUnassignGuest}
          />
        ))}
      </SortableContext>
      {!readOnly && (
        <AddTableSection
          onAddTable={(count, seats) => onAddTable(count, seats)}
          onAddSingle={() => onAddTable(1, 10)}
        />
      )}
      {tables.length === 0 && !readOnly && (
        <div style={{ width: '100%', textAlign: 'center', color: '#999', padding: 40 }}>
          No tables yet. Click "Add Table" to get started.
        </div>
      )}
    </div>
  );
}

export default TableFloor;