import { useTheme } from '../hooks/useTheme';
import { WHEEL_PALETTES } from '../utils/wheelPalettes';
import './ThemeMenu.css';

export function ThemeMenu({ isOpen, onClose }) {
  const { theme, setTheme, wheelPalette, setWheelPalette } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      <div className="theme-menu-overlay" onClick={onClose} />
      <div className="theme-menu">
        <div className="theme-section">
          <h3 className="theme-section-title">UI Theme</h3>
          <div className="theme-options">
            <button
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => { setTheme('dark'); onClose(); }}
            >
              🌙 Dark
            </button>
            <button
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => { setTheme('light'); onClose(); }}
            >
              ☀️ Light
            </button>
          </div>
        </div>

        <div className="theme-section">
          <h3 className="theme-section-title">Wheel Palette</h3>
          <div className="palette-options">
            {Object.entries(WHEEL_PALETTES).map(([key, palette]) => (
              <button
                key={key}
                className={`palette-option ${wheelPalette === key ? 'active' : ''}`}
                onClick={() => { setWheelPalette(key); onClose(); }}
              >
                <div className="palette-preview">
                  {palette.colors.slice(0, 5).map((color, i) => (
                    <span key={i} style={{ backgroundColor: color }} className="palette-color" />
                  ))}
                </div>
                <span>{palette.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
