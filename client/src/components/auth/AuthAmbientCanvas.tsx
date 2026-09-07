import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Interactive Ambient Canvas
 * High-performance lightweight 2D grid/particle field in Electric Lime (#CCFF00) and Obsidian
 * with smooth soft reaction to mouse movements.
 */
export function AuthAmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Particle nodes for ambient grid
    const spacing = 48;
    const cols = Math.ceil(width / spacing) + 2;
    const rows = Math.ceil(height / spacing) + 2;

    let time = 0;

    const render = () => {
      time += 0.015;
      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const dotColor = isDark ? 'rgba(204, 255, 0, ' : 'rgba(21, 128, 61, ';
      const lineBase = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)';

      // Draw subtle background grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineBase;
      ctx.beginPath();
      for (let x = 0; x <= width; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw interactive reactive matrix points
      const maxDistance = 180;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Subtle natural breathing wave
          const wave = Math.sin(time + (x + y) * 0.005) * 0.5 + 0.5;

          if (dist < maxDistance) {
            const factor = 1 - dist / maxDistance;
            const radius = 1.2 + factor * 2.5;
            const alpha = 0.15 + factor * 0.55;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `${dotColor}${alpha})`;
            ctx.fill();

            // Connect nearby points to mouse
            if (factor > 0.4) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = `${dotColor}${(factor - 0.4) * 0.25})`;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          } else if (wave > 0.85) {
            const alpha = (wave - 0.85) * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fillStyle = `${dotColor}${alpha})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70 transition-opacity duration-300"
    />
  );
}
