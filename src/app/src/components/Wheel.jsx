import { useRef, useEffect, useState, useCallback } from 'react';
import { getColorForName } from '../utils/colors';
import { useTheme } from '../hooks/useTheme';
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

export function Wheel({ entries, loading, onSpinStart, onSpinComplete, onTick, onCountdownBeep, disabled }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPlayedBeep1, setHasPlayedBeep1] = useState(false);
  const [hasPlayedBeep2, setHasPlayedBeep2] = useState(false);
  const [hasPlayedBeep3, setHasPlayedBeep3] = useState(false);
  const animationRef = useRef(null);
  const { wheelPalette } = useTheme();

  // Helper to get theme colors from CSS variables
  const getThemeColor = (varName) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
  };

  const drawWheel = useCallback((ctx, currentRotation, isLoading, isSpinning, progress) => {
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
      ctx.fillStyle = getThemeColor('--wheel-bg');
      ctx.fill();
      ctx.strokeStyle = getThemeColor('--wheel-stroke-dark');
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = getThemeColor('--wheel-text-light');
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', centerX, centerY);
      return;
    }

    if (entries.length === 0) {
      // Draw empty wheel
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = getThemeColor('--wheel-bg');
      ctx.fill();
      ctx.strokeStyle = getThemeColor('--wheel-stroke-dark');
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = getThemeColor('--wheel-text-light');
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
      ctx.fillStyle = getColorForName(entry.name, wheelPalette);
      ctx.fill();
      ctx.strokeStyle = getThemeColor('--wheel-segment-border');
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = getThemeColor('--wheel-segment-text');
      ctx.font = `bold ${Math.min(18, 200 / entries.length)}px Arial`;
      ctx.fillText(entry.name, radius - 20, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = getThemeColor('--wheel-center');
    ctx.fill();
    ctx.strokeStyle = getThemeColor('--wheel-segment-border');
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw pointer with glow effect during spin
    ctx.save();

    // Add glow effect when spinning
    if (isSpinning) {
      const glowIntensity = progress > 0.8 ? (1 - (progress - 0.8) / 0.2) : 1;
      ctx.shadowColor = '#FFD700'; // Gold glow
      ctx.shadowBlur = 15 * glowIntensity;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.beginPath();
    ctx.moveTo(canvas.width - 10, centerY);
    ctx.lineTo(canvas.width - 40, centerY - 15);
    ctx.lineTo(canvas.width - 40, centerY + 15);
    ctx.closePath();
    ctx.fillStyle = getThemeColor('--wheel-center');
    ctx.fill();
    ctx.strokeStyle = getThemeColor('--wheel-segment-border');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [entries, loading, wheelPalette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    drawWheel(ctx, rotation, loading, isSpinning, progress);
  }, [rotation, loading, isSpinning, progress, drawWheel, wheelPalette]);

  const spin = useCallback(() => {
    if (isSpinning || entries.length === 0 || disabled) return;

    setIsSpinning(true);
    setHasPlayedBeep1(false);
    setHasPlayedBeep2(false);
    setHasPlayedBeep3(false);

    // Notify parent that spin has started
    if (onSpinStart) onSpinStart();

    const spinDuration = 7000 + Math.random() * 3000; // 7-10 seconds
    const totalRotation = rotation + (Math.PI * 2 * (5 + Math.random() * 5)); // 5-10 full rotations
    const startTime = Date.now();
    const startRotation = rotation;

    let lastTickSegment = -1;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(elapsed / spinDuration, 1);
      setProgress(currentProgress);

      // Easing function for dramatic slowdown - exponential curve power 6
      const easeOut = 1 - Math.pow(1 - currentProgress, 6);

      // Add final wobble effect in last 10% of spin
      let finalRotation = startRotation + (totalRotation - startRotation) * easeOut;

      if (currentProgress > 0.9) {
        // Oscillating wobble that decreases as we approach 100%
        const wobbleProgress = (currentProgress - 0.9) / 0.1; // 0-1 range for final 10%
        const wobbleFrequency = 3; // Number of wobbles
        const wobbleAmplitude = 0.1 * (1 - wobbleProgress); // Decreases to 0
        const wobble = Math.sin(wobbleProgress * Math.PI * wobbleFrequency) * wobbleAmplitude;
        finalRotation += wobble;
      }

      const currentRotation = finalRotation;
      setRotation(currentRotation);

      // Calculate current segment for tick sound
      const sliceAngle = (2 * Math.PI) / entries.length;
      const normalizedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSegment = Math.floor(normalizedRotation / sliceAngle);

      if (currentSegment !== lastTickSegment) {
        lastTickSegment = currentSegment;
        const currentSpeed = 1 - easeOut; // Speed from 1.0 (fast) to 0 (stopped)
        if (onTick) onTick(currentSpeed);
      }

      // Trigger countdown beeps at 90%, 95%, 98%
      if (currentProgress >= 0.90 && !hasPlayedBeep1) {
        if (onCountdownBeep) onCountdownBeep(1);
        setHasPlayedBeep1(true);
      }
      if (currentProgress >= 0.95 && !hasPlayedBeep2) {
        if (onCountdownBeep) onCountdownBeep(2);
        setHasPlayedBeep2(true);
      }
      if (currentProgress >= 0.98 && !hasPlayedBeep3) {
        if (onCountdownBeep) onCountdownBeep(3);
        setHasPlayedBeep3(true);
      }

      if (currentProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);

        // Add shake class
        if (canvasRef.current) {
          canvasRef.current.classList.add('shake');
          setTimeout(() => {
            canvasRef.current?.classList.remove('shake');
          }, 500);
        }

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
  }, [isSpinning, entries, disabled, rotation, onSpinStart, onSpinComplete, onTick, onCountdownBeep]);

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
        className={`wheel-canvas ${isSpinning ? (progress < 0.7 ? 'spinning spinning-fast' : 'spinning spinning-slow') : ''} ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
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
