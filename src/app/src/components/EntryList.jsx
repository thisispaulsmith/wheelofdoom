import { useState, useRef } from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import './EntryList.css';

export function EntryList({ entries, onAdd, onDelete, loading }) {
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef(null);

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
      inputRef.current?.focus();
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
        <div className="entry-list-loading-wrapper">
          <SkeletonLoader type="entry" count={5} />
        </div>
      ) : (
        <ul className="entry-list-items fade-in">
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
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter a name..."
          className="entry-input"
          disabled={isAdding}
          maxLength={40}
        />
        <button type="submit" className="entry-add-btn" disabled={isAdding || !newName.trim()}>
          {isAdding ? '...' : 'Add'}
        </button>
      </form>
    </div>
  );
}
