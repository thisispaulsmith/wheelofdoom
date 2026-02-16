import { useMemo } from 'react';

/**
 * Aggregates results into selection statistics
 * @param {Array} results - Array of result objects with selectedName property
 * @returns {Array} Statistics sorted by count descending, then name ascending
 */
export function useStatistics(results) {
  return useMemo(() => {
    if (!results || results.length === 0) {
      return [];
    }

    // Count occurrences of each name
    const counts = results.reduce((acc, result) => {
      const name = result.selectedName;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    // Calculate total spins
    const totalSpins = results.length;

    // Convert to array and calculate percentages
    const stats = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: (count / totalSpins) * 100,
    }));

    // Sort by count descending, then by name ascending (for ties)
    stats.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });

    return stats;
  }, [results]);
}
