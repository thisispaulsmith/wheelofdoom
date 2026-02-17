import { WHEEL_PALETTES } from './wheelPalettes';

// Shared color palette for wheel and statistics (backwards compatibility)
export const COLORS = WHEEL_PALETTES.classic.colors;

/**
 * Get a consistent color for a given name.
 * Uses a simple hash function to ensure the same name always gets the same color.
 * @param {string} name - The name to get a color for
 * @param {string} palette - The palette to use (classic, pastel, vibrant, neon)
 * @returns {string} - Hex color code
 */
export function getColorForName(name, palette = 'classic') {
  const colors = WHEEL_PALETTES[palette]?.colors || WHEEL_PALETTES.classic.colors;

  // Simple hash function for string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Get color index (ensure positive)
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
