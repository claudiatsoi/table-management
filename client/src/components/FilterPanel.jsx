import React from 'react';

function FilterPanel({ guests, filters, setFilters, sortBy, setSortBy, searchQuery, setSearchQuery, customFields }) {
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="filter-panel">
      <input
        type="text"
        placeholder="Search guests..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="name">Sort by Name</option>
        {customFields.map(field => (
          <option key={field} value={field}>Sort by {field}</option>
        ))}
      </select>

      {customFields.map(field => {
        const uniqueValues = [...new Set(guests.map(g => g[field]).filter(Boolean))];
        if (uniqueValues.length < 2) return null;

        return (
          <select
            key={field}
            value={filters[field] || 'all'}
            onChange={e => handleFilterChange(field, e.target.value)}
          >
            <option value="all">All {field}</option>
            {uniqueValues.map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        );
      })}

      {Object.keys(filters).length > 0 && (
        <button
          className="btn btn-secondary"
          onClick={() => setFilters({})}
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

export default FilterPanel;