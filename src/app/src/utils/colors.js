// Shared color palette for wheel and statistics
export const COLORS = [
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

/**
 * Get a consistent color for a given name.
 * Uses a simple hash function to ensure the same name always gets the same color.
 * @param {string} name - The name to get a color for
 * @returns {string} - Hex color code
 */
export function getColorForName(name) {
  // Simple hash function for string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Get color index (ensure positive)
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}
