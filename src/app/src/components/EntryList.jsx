import { useState } from 'react';
import './EntryList.css';

export function EntryList({ entries, onAdd, onDelete, loading }) {
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await onAdd(newName.trim());
      setNewName('');
    } catch (err) {
      console.error('Failed to add entry:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (name) => {
    try {
      await onDelete(name);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  return (
    <div className="entry-list">
      <h2 className="entry-list-header">
        Entries <span className="entry-count">({entries.length})</span>
      </h2>

      {loading ? (
        <div className="entry-list-loading">Loading...</div>
      ) : (
        <ul className="entry-list-items">
          {entries.map((entry) => (
            <li key={entry.name} className="entry-item">
              <span className="entry-name">{entry.name}</span>
              <button
                onClick={() => handleDelete(entry.name)}
                className="entry-delete-btn"
                title="Remove"
              >
                &times;
              </button>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="entry-empty">No entries yet. Add some names!</li>
          )}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter a name..."
          className="entry-input"
          disabled={isAdding}
        />
        <button type="submit" className="entry-add-btn" disabled={isAdding || !newName.trim()}>
          {isAdding ? '...' : 'Add'}
        </button>
      </form>
    </div>
  );
}
