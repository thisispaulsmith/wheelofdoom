import { useEffect, useState } from 'react';
import './WinnerModal.css';

export function WinnerModal({ winner, message, onClose }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (winner) {
      // Generate confetti pieces
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][Math.floor(Math.random() * 6)],
      }));
      setConfetti(pieces);
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="winner-overlay" onClick={onClose}>
      <div className="confetti-container">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              backgroundColor: piece.color,
            }}
          />
        ))}
      </div>

      <div className="winner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="winner-message">{message}</div>
        <div className="winner-name">{winner.name}</div>
        <button className="winner-close-btn" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
