import { useStatistics } from '../hooks/useStatistics';
import { SkeletonLoader } from './SkeletonLoader';
import './Statistics.css';

// Import colors from Wheel.jsx for consistency
const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
];

export function Statistics({ results, loading }) {
  const stats = useStatistics(results);

  // Find max count for normalization (highest count gets 100% bar width)
  const maxCount = stats.length > 0 ? stats[0].count : 1;

  return (
    <div className="statistics">
      <h3 className="statistics-header">Selection Statistics</h3>

      {loading ? (
        <div className="statistics-loading-wrapper">
          <SkeletonLoader type="result" count={4} />
        </div>
      ) : stats.length === 0 ? (
        <div className="statistics-empty-wrapper">
          <div className="statistics-empty">No statistics yet. Spin the wheel to collect data!</div>
        </div>
      ) : (
        <ul className="statistics-list fade-in">
          {stats.map((stat, index) => {
            const barWidth = (stat.count / maxCount) * 100;
            const color = COLORS[index % COLORS.length];

            return (
              <li key={stat.name} className="stat-item">
                <span className="stat-name" title={stat.name}>{stat.name}</span>
                <div className="stat-bar-container">
                  <div
                    className="stat-bar"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="stat-count">{stat.count}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
