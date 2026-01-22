import './Results.css';

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export function Results({ results, loading }) {
  return (
    <div className="results">
      <h2 className="results-header">Recent Results</h2>

      {loading ? (
        <div className="results-loading">Loading...</div>
      ) : results.length === 0 ? (
        <div className="results-empty">No spins yet. Give it a whirl!</div>
      ) : (
        <ul className="results-list">
          {results.slice(0, 10).map((result, index) => (
            <li key={index} className="result-item">
              <span className="result-name">{result.selectedName}</span>
              <span className="result-meta">
                <span className="result-time">{formatTime(result.spunAt)}</span>
                {result.spunBy && result.spunBy !== 'anonymous' && (
                  <span className="result-by">by {result.spunBy}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
