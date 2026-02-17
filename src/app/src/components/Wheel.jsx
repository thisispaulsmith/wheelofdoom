import { useRef, useEffect, useState, useCallback } from 'react';
import { getColorForName } from '../utils/colors';
import './Wheel.css';

const DRAMATIC_MESSAGES = [
  "The Wheel has spoken!",
  "Fate has decided...",
  "Today's victim is...",
  "The chosen one is...",
  "No escape for...",
  "Destiny calls upon...",
  "The odds have chosen...",
  "Fortune favors...",
];

export function Wheel({ entries, loading, onSpinComplete, onTick, disabled }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const animationRef = useRef(null);

  const drawWheel = useCallback((ctx, currentRotation, isLoading) => {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isLoading) {
      // Draw loading wheel
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#374151';
      ctx.fill();
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', centerX, centerY);
      return;
    }

    if (entries.length === 0) {
      // Draw empty wheel
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#374151';
      ctx.fill();
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Add names to spin!', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / entries.length;

    // Draw segments
    entries.forEach((entry, index) => {
      const startAngle = currentRotation + index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = getColorForName(entry.name);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1F2937';
      ctx.font = `bold ${Math.min(18, 200 / entries.length)}px Arial`;
      ctx.fillText(entry.name, radius - 20, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#1F2937';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer (on right side)
    ctx.beginPath();
    ctx.moveTo(canvas.width - 10, centerY);
    ctx.lineTo(canvas.width - 40, centerY - 15);
    ctx.lineTo(canvas.width - 40, centerY + 15);
    ctx.closePath();
    ctx.fillStyle = '#1F2937';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [entries, loading]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    drawWheel(ctx, rotation, loading);
  }, [rotation, loading, drawWheel]);

  const spin = useCallback(() => {
    if (isSpinning || entries.length === 0 || disabled) return;

    setIsSpinning(true);

    const spinDuration = 5000 + Math.random() * 2000; // 5-7 seconds
    const totalRotation = rotation + (Math.PI * 2 * (5 + Math.random() * 5)); // 5-10 full rotations
    const startTime = Date.now();
    const startRotation = rotation;

    let lastTickSegment = -1;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      // Easing function for dramatic slowdown
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const currentRotation = startRotation + (totalRotation - startRotation) * easeOut;

      setRotation(currentRotation);

      // Calculate current segment for tick sound
      const sliceAngle = (2 * Math.PI) / entries.length;
      const normalizedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSegment = Math.floor(normalizedRotation / sliceAngle);

      if (currentSegment !== lastTickSegment) {
        lastTickSegment = currentSegment;
        if (onTick) onTick();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);

        // Determine winner (segment at the pointer, which is on the right = angle 0)
        const finalRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // The pointer is at angle 0 (right side), we need to find which segment is there
        // Since segments start from angle 0 and go clockwise, we need to invert
        const winningIndex = Math.floor(((2 * Math.PI - finalRotation) % (2 * Math.PI)) / sliceAngle) % entries.length;
        const winner = entries[winningIndex];

        const message = DRAMATIC_MESSAGES[Math.floor(Math.random() * DRAMATIC_MESSAGES.length)];

        if (onSpinComplete) {
          onSpinComplete(winner, message);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isSpinning, entries, disabled, rotation, onSpinComplete, onTick]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        spin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spin]);

  return (
    <div className="wheel-container">
      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        onClick={spin}
        className={`wheel-canvas ${isSpinning ? 'spinning' : ''} ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
      />
      <div
        className={`wheel-prompt ${!isSpinning && entries.length > 0 && !disabled && !loading ? 'clickable' : ''}`}
        onClick={spin}
      >
        {loading ? '\u00A0' : (!isSpinning && entries.length > 0 ? 'Click to spin!' : '\u00A0')}
      </div>
    </div>
  );
}
