import './SkeletonLoader.css';

export function SkeletonLoader({ type = 'entry', count = 3 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`skeleton-loader skeleton-loader-${type}`}>
      {items.map((i) => (
        <div key={i} className={`skeleton-item skeleton-item-${type}`}>
          <div className="skeleton-shimmer"></div>
        </div>
      ))}
    </div>
  );
}
