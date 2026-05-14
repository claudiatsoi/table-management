import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import GuestList from './components/GuestList';
import TableFloor from './components/TableFloor';
import TheaterFloor from './components/TheaterFloor';
import DataTableView from './components/DataTableView';
import ImportModal from './components/ImportModal';
import FilterPanel from './components/FilterPanel';
import AutoAssignModal from './components/AutoAssignModal';
import ModeSelection from './components/ModeSelection';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function AppContent() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [guests, setGuests] = useState([]);
  const [tables, setTables] = useState([]);
  const [mode, setMode] = useState('table');
  const [viewMode, setViewMode] = useState('visual');
  const [isLocked, setIsLocked] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuest, setActiveGuest] = useState(null);
  const [isManager, setIsManager] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const path = window.location.pathname;
    const id = path.split('/')[1];
    if (id && id.length === 36) {
      setProjectId(id);
      setIsManager(!window.location.pathname.endsWith('/view'));
      loadProject(id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadProject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/projects/${id}`);
      const data = await res.json();
      setProject(data);
      setGuests(data.guests || []);
      setTables(data.tables || []);
      setMode(data.mode || 'table');
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async (newGuests, newTables) => {
    if (!projectId || !isManager) return;
    try {
      await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests: newGuests, tables: newTables })
      });
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const pushHistory = (newGuests, newTables) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ guests: newGuests, tables: newTables });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setGuests(prev.guests);
      setTables(prev.tables);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setGuests(next.guests);
      setTables(next.tables);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const resetAssignments = () => {
    const newGuests = guests.map(g => ({ ...g, tableId: null }));
    const newTables = tables.map(t => ({ ...t, guests: [] }));
    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const addTable = (count, seats, prefix) => {
    const newTables = [];
    const prefixChar = prefix ? prefix.charCodeAt(0) : 65;
    for (let i = 0; i < count; i++) {
      const rowPrefix = prefix ? prefix + i : String.fromCharCode(prefixChar + i);
      newTables.push({
        id: `table-${Date.now()}-${i}`,
        name: mode === 'theater' ? `Row ${i + 1}` : `Table ${tables.length + i + 1}`,
        seats: seats || 10,
        seatPrefix: mode === 'theater' ? rowPrefix : null,
        guests: [],
        remark: '',
        allowOverflow: true
      });
    }
    const updatedTables = [...tables, ...newTables];
    setTables(updatedTables);
    pushHistory(guests, updatedTables);
    saveProject(guests, updatedTables);
  };

  const updateTable = (tableId, updates) => {
    const newTables = tables.map(t => t.id === tableId ? { ...t, ...updates } : t);
    setTables(newTables);
    pushHistory(guests, newTables);
    saveProject(guests, newTables);
  };

  const removeTable = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    const newTables = tables.filter(t => t.id !== tableId);
    const newGuests = guests.map(g => {
      if (table?.guests.includes(g.id)) return { ...g, tableId: null };
      return g;
    });
    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const unassignGuest = (guestId) => {
    const newGuests = guests.map(g => g.id === guestId ? { ...g, tableId: null } : g);
    const newTables = tables.map(t => ({ ...t, guests: t.guests.filter(id => id !== guestId) }));
    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const assignGuest = (guestId, tableId) => {
    let idsToAssign = [guestId];
    if (selectedGuests.has(guestId)) {
      idsToAssign = Array.from(selectedGuests);
      setSelectedGuests(new Set());
    }

    const newGuests = guests.map(g => idsToAssign.includes(g.id) ? { ...g, tableId } : g);

    if (!tableId || tableId === 'pool') {
      const newTables = tables.map(t => ({ ...t, guests: t.guests.filter(id => !idsToAssign.includes(id)) }));
      setGuests(newGuests);
      setTables(newTables);
      pushHistory(newGuests, newTables);
      saveProject(newGuests, newTables);
      return;
    }

    const targetTable = tables.find(t => t.id === tableId);
    const allowOverflow = targetTable?.allowOverflow !== false;
    const currentCount = targetTable?.guests?.filter(id => !idsToAssign.includes(id)).length || 0;
    if (!allowOverflow && currentCount >= (targetTable?.seats || 0)) return;

    const newTables = tables.map(t => {
      if (t.id === tableId) {
        const existingGuests = t.guests.filter(id => !idsToAssign.includes(id));
        const newGuestsList = [...existingGuests, ...idsToAssign.filter(id => !existingGuests.includes(id))];
        return { ...t, guests: newGuestsList };
      }
      return { ...t, guests: t.guests.filter(id => !idsToAssign.includes(id)) };
    });

    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const handleImport = (importedGuests) => {
    const newGuests = importedGuests.map((g, i) => ({ ...g, id: `guest-${Date.now()}-${i}`, tableId: null }));
    const updatedGuests = [...guests, ...newGuests];
    setGuests(updatedGuests);
    pushHistory(updatedGuests, tables);
    saveProject(updatedGuests, tables);
  };

  const handleDeleteGuest = (guestId) => {
    const newGuests = guests.filter(g => g.id !== guestId);
    const newTables = tables.map(t => ({ ...t, guests: t.guests.filter(id => id !== guestId) }));
    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const toggleGuestSelection = (guestId) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) newSet.delete(guestId);
      else newSet.add(guestId);
      return newSet;
    });
  };

  const clearSelection = () => setSelectedGuests(new Set());

  const selectAll = (select) => {
    const filteredGuests = getFilteredGuests();
    if (select) setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    else setSelectedGuests(new Set());
  };

  const updateGuestField = (guestId, field, value) => {
    const newGuests = guests.map(g => g.id === guestId ? { ...g, [field]: value } : g);
    setGuests(newGuests);
    pushHistory(newGuests, tables);
    saveProject(newGuests, tables);
  };

  const assignSeat = (guestId, tableId, seat) => {
    const newGuests = guests.map(g => g.id === guestId ? { ...g, tableId, seat } : g);
    const newTables = tables.map(t => {
      if (t.id === tableId) {
        const existingGuests = t.guests.filter(id => id !== guestId);
        if (!existingGuests.includes(guestId)) existingGuests.push(guestId);
        return { ...t, guests: existingGuests };
      }
      return { ...t, guests: t.guests.filter(id => id !== guestId) };
    });
    setGuests(newGuests);
    setTables(newTables);
    pushHistory(newGuests, newTables);
    saveProject(newGuests, newTables);
  };

  const exportAssignments = () => {
    const data = tables.map(t => ({
      table: t.name,
      seats: t.seats,
      remark: t.remark || '',
      guests: t.guests.map(gid => guests.find(g => g.id === gid)?.name).filter(Boolean)
    }));
    const unassigned = guests.filter(g => !g.tableId).map(g => g.name);
    let csv = 'Table,Seats,Remark,Guests\n';
    data.forEach(row => csv += `"${row.table}",${row.seats},"${row.remark}","${row.guests.join('; ')}"\n`);
    csv += '\nUnassigned Guests\n';
    unassigned.forEach(name => csv += `${name}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-assignments-${project?.name || 'export'}.csv`;
    a.click();
  };

  const getFilteredGuests = () => {
    let filtered = guests.filter(g => !g.tableId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => Object.values(g).some(v => String(v).toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value !== 'all') filtered = filtered.filter(g => String(g[field]) === value);
    });
    filtered.sort((a, b) => sortBy === 'name' ? (a.name || '').localeCompare(b.name || '') : String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')));
    return filtered;
  };

  const getCustomFields = () => {
    if (!guests.length) return [];
    const fields = new Set();
    guests.forEach(g => Object.keys(g).forEach(k => { if (!['id', 'tableId', 'name'].includes(k)) fields.add(k); }));
    return Array.from(fields);
  };

  const handleDragStart = (event) => {
    const guest = guests.find(g => g.id === event.active.id);
    if (guest) setActiveGuest(guest);
  };

  const handleDragEnd = (event) => {
    setActiveGuest(null);
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id && tables.some(t => t.id === active.id) && tables.some(t => t.id === over.id)) {
      const oldIndex = tables.findIndex(t => t.id === active.id);
      const newIndex = tables.findIndex(t => t.id === over.id);
      const newTables = [...tables];
      const [movedTable] = newTables.splice(oldIndex, 1);
      newTables.splice(newIndex, 0, movedTable);
      setTables(newTables);
      pushHistory(guests, newTables);
      saveProject(guests, newTables);
      return;
    }

    const guestId = active.id;
    const dropData = over.data?.current || over.data;

    if (dropData?.type === 'seat' && mode === 'theater') {
      const { rowId, seat } = dropData;
      assignSeat(guestId, rowId, seat);
      return;
    }

    const dropId = over.id;
    if (dropId.startsWith('table-')) assignGuest(guestId, dropId);
    else if (dropId === 'pool') assignGuest(guestId, null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <DndContext collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app">
        <header className="header">
          <div className="header-left">
            <h1>🎉 {mode === 'theater' ? 'Theater' : 'Table'} Management</h1>
            {project && <span className="project-name">{project.name}</span>}
          </div>
          <div className="header-center">
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'visual' ? 'active' : ''}`} onClick={() => setViewMode('visual')}>Visual</button>
              <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Data Table</button>
            </div>
          </div>
          <div className="header-right">
            {isManager && (
              <>
                <button onClick={() => setShowImport(true)} className="btn">Import</button>
                <button onClick={() => setShowAutoAssign(true)} className="btn">Auto Assign</button>
                <button onClick={exportAssignments} className="btn btn-secondary">Export</button>
                <button onClick={undo} disabled={historyIndex <= 0} className="btn btn-undo">↩</button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="btn btn-redo">↪</button>
                {viewMode === 'table' && <button onClick={() => setIsLocked(!isLocked)} className={`btn btn-lock ${isLocked ? 'locked' : ''}`}>{isLocked ? '🔒 Locked' : '🔓 Unlock'}</button>}
                <button onClick={resetAssignments} className="btn btn-reset">Reset</button>
                <div className="share-link">
                  <input readOnly value={`${window.location.origin}/${projectId}/view`} onClick={e => e.target.select()} />
                </div>
              </>
            )}
            {!isManager && <span className="view-only-badge">View Only</span>}
          </div>
        </header>

        {isManager && <FilterPanel guests={guests} filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} searchQuery={searchQuery} setSearchQuery={setSearchQuery} customFields={getCustomFields()} />}

        <main className={`main ${viewMode === 'table' ? 'data-table-view' : ''}`}>
          {viewMode === 'table' ? (
            <DataTableView guests={guests} tables={tables} mode={mode} isLocked={isLocked} isManager={isManager} onUpdateGuest={updateGuestField} onAssignSeat={assignSeat} onRemoveGuest={handleDeleteGuest} customFields={getCustomFields()} />
          ) : isManager ? (
            <>
              <GuestList guests={getFilteredGuests()} onDelete={handleDeleteGuest} selectedGuests={selectedGuests} onToggleSelect={toggleGuestSelection} onClearSelection={clearSelection} onSelectAll={selectAll} />
              {mode === 'theater' ? (
                <TheaterFloor tables={tables} guests={guests} onAddTable={addTable} onUpdateTable={updateTable} onRemoveTable={removeTable} onUnassignGuest={unassignGuest} />
              ) : (
                <TableFloor tables={tables} guests={guests} onAddTable={addTable} onUpdateTable={updateTable} onRemoveTable={removeTable} onUnassignGuest={unassignGuest} />
              )}
            </>
          ) : mode === 'theater' ? (
            <TheaterFloor tables={tables} guests={guests} readOnly />
          ) : (
            <TableFloor tables={tables} guests={guests} readOnly />
          )}
        </main>

        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
        {showAutoAssign && <AutoAssignModal guests={guests} tables={tables} customFields={getCustomFields()} onClose={() => setShowAutoAssign(false)} onAssign={(assignments, remarks) => {
          const newGuests = guests.map(g => ({ ...g, tableId: assignments[g.id] || null }));
          const newTables = tables.map(t => ({ ...t, guests: Object.entries(assignments).filter(([, tid]) => tid === t.id).map(([gid]) => gid), remark: remarks?.[t.id] || t.remark }));
          setGuests(newGuests);
          setTables(newTables);
          pushHistory(newGuests, newTables);
          saveProject(newGuests, newTables);
        }} />}

        <DragOverlay>{activeGuest && <div className="guest-card dragging">{activeGuest.name}</div>}</DragOverlay>
      </div>
    </DndContext>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModeSelection />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;