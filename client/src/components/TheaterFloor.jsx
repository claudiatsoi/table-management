import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function GuestTooltip({ guest }) {
  const extraFields = Object.entries(guest).filter(([k]) => !['id', 'tableId', 'name', 'seat'].includes(k));
  return (
    <div className="guest-tooltip">
      <div className="tooltip-name">{guest.name}</div>
      {guest.seat && <div className="tooltip-field">Seat: {guest.seat}</div>}
      {extraFields.map(([k, v]) => (
        <div key={k} className="tooltip-field">{k}: {v}</div>
      ))}
    </div>
  );
}

function DraggableGuestItem({ guest, onRemove, readOnly }) {
  const { attributes, listeners, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id }
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
    <div style={style} className={`guest-item-wrapper ${isDragging ? 'dragging' : ''}`}>
      <div className="guest-item">
        <span className="guest-drag-handle-icon" {...listeners} {...attributes}>⋮</span>
        <span className="guest-item-name">{guest.name}</span>
        {!readOnly && <button className="guest-remove-btn" onClick={handleRemoveClick}>×</button>}
      </div>
      <div className="guest-item-tooltip">
        <GuestTooltip guest={guest} />
      </div>
    </div>
  );
}

function SeatBox({ seatNumber, prefix, guest, rowId, onDropGuest, onRemoveGuest, readOnly }) {
  const seatId = `${prefix}${seatNumber}`;
  const { isOver, setNodeRef } = useDroppable({
    id: `seat-${rowId}-${seatId}`,
    data: { rowId, seat: seatId, type: 'seat' }
  });

  const extraFields = guest ? Object.entries(guest).filter(([k]) => !['id', 'tableId', 'name', 'seat'].includes(k)) : [];

  return (
    <div
      ref={setNodeRef}
      className={`seat-box ${isOver ? 'drop-hover' : ''} ${guest ? 'occupied' : ''}`}
    >
      <span className="seat-number">{seatId}</span>
      {guest ? (
        <div className="seat-guest-wrapper">
          {readOnly ? (
            <div className="seat-guest-name">{guest.name}</div>
          ) : (
            <DraggableGuestItem
              guest={guest}
              onRemove={onRemoveGuest}
              readOnly={readOnly}
            />
          )}
          {(extraFields.length > 0 || guest.seat) && (
            <div className="seat-guest-tooltip">
              <div className="tooltip-name">{guest.name}</div>
              {guest.seat && <div className="tooltip-field">Seat: {guest.seat}</div>}
              {extraFields.map(([k, v]) => (
                <div key={k} className="tooltip-field">{k}: {v}</div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <span className="seat-empty">Empty</span>
      )}
    </div>
  );
}

function TheaterRow({ row, guests, readOnly, onUpdate, onRemove, onUnassignGuest }) {
  const {
    attributes,
    listeners,
    setNodeRef: sortRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: row.id });

  const { isOver: rowIsOver, setNodeRef: rowDropRef } = useDroppable({
    id: `row-${row.id}`,
    data: { type: 'row', rowId: row.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  const prefix = row.seatPrefix || 'A';
  const seats = row.seats || 10;
  const seatNumbers = Array.from({ length: seats }, (_, i) => i + 1);

  return (
    <div ref={sortRef} style={style} className="theater-row-wrapper">
      <div className="theater-drag-handle" {...attributes} {...listeners}>
        <span>::</span>
      </div>
      <div ref={rowDropRef} className={`theater-row ${rowIsOver ? 'drop-hover' : ''}`}>
        <div className="row-header">
          {readOnly ? (
            <span className="row-name">{row.name}</span>
          ) : (
            <input
              type="text"
              className="row-name-input"
              value={row.name}
              onChange={(e) => onUpdate(row.id, { name: e.target.value })}
            />
          )}
          <span className="seat-count">{guests.filter(g => g.tableId === row.id).length}/{seats}</span>
          {!readOnly && <button className="remove-btn" onClick={() => onRemove(row.id)}>×</button>}
        </div>

        <div className="row-config">
          <label>Prefix:</label>
          {readOnly ? (
            <span className="prefix-display">{prefix}</span>
          ) : (
            <input
              type="text"
              className="prefix-input"
              value={prefix}
              onChange={(e) => onUpdate(row.id, { seatPrefix: e.target.value })}
              maxLength={3}
            />
          )}
          <label>Seats:</label>
          <input
            type="number"
            className="seats-input"
            value={seats}
            onChange={(e) => onUpdate(row.id, { seats: Math.max(1, parseInt(e.target.value) || 1) })}
            disabled={readOnly}
          />
        </div>

        <div className="row-seats">
          {seatNumbers.map(num => {
            const guestInSeat = guests.find(g => g.tableId === row.id && g.seat === `${prefix}${num}`);
            return (
              <SeatBox
                key={num}
                seatNumber={num}
                prefix={prefix}
                guest={guestInSeat}
                rowId={row.id}
                onRemoveGuest={onUnassignGuest}
                readOnly={readOnly}
              />
            );
          })}
        </div>

        <div className="remark-section">
          {readOnly ? (
            <div className="remark-text">{row.remark || ''}</div>
          ) : (
            <input
              type="text"
              className="remark-input"
              placeholder="Remark..."
              value={row.remark || ''}
              onChange={(e) => onUpdate(row.id, { remark: e.target.value })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AddRowSection({ onAddRow, onAddSingle }) {
  const [bulkMode, setBulkMode] = useState(false);
  const [rowCount, setRowCount] = useState(5);
  const [defaultSeats, setDefaultSeats] = useState(10);
  const [defaultPrefix, setDefaultPrefix] = useState('A');

  return (
    <div className="add-row-section">
      {bulkMode ? (
        <div className="bulk-add-form">
          <div className="bulk-add-row">
            <label>Rows:</label>
            <input
              type="number"
              min="1"
              value={rowCount}
              onChange={e => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="bulk-add-row">
            <label>Seats/Row:</label>
            <input
              type="number"
              min="1"
              value={defaultSeats}
              onChange={e => setDefaultSeats(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="bulk-add-row">
            <label>Prefix Start:</label>
            <input
              type="text"
              value={defaultPrefix}
              onChange={e => setDefaultPrefix(e.target.value)}
              maxLength={3}
              style={{ width: 60 }}
            />
          </div>
          <div className="bulk-add-actions">
            <button className="btn" onClick={() => { onAddRow(rowCount, defaultSeats, defaultPrefix); setBulkMode(false); }}>
              Create {rowCount} Rows
            </button>
            <button className="btn btn-secondary" onClick={() => setBulkMode(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="add-row-options">
          <button className="btn" onClick={() => setBulkMode(true)}>+ Bulk Add Rows</button>
          <button className="btn btn-secondary" onClick={onAddSingle}>+ Add Single Row</button>
        </div>
      )}
    </div>
  );
}

function TheaterFloor({ tables, guests, onAddTable, onUpdateTable, onRemoveTable, onUnassignGuest, readOnly }) {
  const rowIds = tables.map(t => t.id);

  return (
    <div className="theater-floor">
      <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
        {tables.map(row => (
          <TheaterRow
            key={row.id}
            row={row}
            guests={guests}
            readOnly={readOnly}
            onUpdate={onUpdateTable}
            onRemove={onRemoveTable}
            onUnassignGuest={onUnassignGuest}
          />
        ))}
      </SortableContext>
      {!readOnly && (
        <AddRowSection
          onAddRow={(count, seats, prefix) => onAddTable(count, seats, prefix)}
          onAddSingle={() => onAddTable(1, 10, 'A')}
        />
      )}
      {tables.length === 0 && !readOnly && (
        <div style={{ width: '100%', textAlign: 'center', color: '#999', padding: 40 }}>
          No rows yet. Click "Add Row" to get started.
        </div>
      )}
    </div>
  );
}

export default TheaterFloor;