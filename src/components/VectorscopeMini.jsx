import React, { useRef, useEffect, useState } from 'react';
import { Eye, EyeOff, Sparkles, Activity } from 'lucide-react';

/**
 * Rec.709 Color targets on standard Vectorscope graticule:
 * Normalized (u, v) coordinates relative to unit circle.
 */
const TARGETS = [
  { label: 'R',  name: 'Red',     u: -0.169, v:  0.500, color: '#ef4444' },
  { label: 'Mg', name: 'Magenta', u:  0.331, v:  0.419, color: '#ec4899' },
  { label: 'B',  name: 'Blue',    u:  0.500, v: -0.081, color: '#3b82f6' },
  { label: 'Cy', name: 'Cyan',    u:  0.169, v: -0.500, color: '#06b6d4' },
  { label: 'G',  name: 'Green',   u: -0.331, v: -0.419, color: '#22c55e' },
  { label: 'Yl', name: 'Yellow',  u: -0.500, v:  0.081, color: '#eab308' }
];

export default function VectorscopeMini({
  videoRef,
  activeSegment,
  isPlaying,
  currentTime,
  className = ''
}) {
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [showTrace, setShowTrace] = useState(true);

  // Initialize offscreen sampling canvas
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      const off = document.createElement('canvas');
      off.width = 48;
      off.height = 36;
      offscreenCanvasRef.current = off;
    }
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (Math.min(width, height) / 2) - 10;

    const drawScope = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Circular Graticule & Grid
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 15, 26, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Concentric saturation rings (25%, 50%, 75%, 100%)
      [0.25, 0.5, 0.75].forEach(scale => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY);
      ctx.lineTo(centerX + 8, centerY);
      ctx.moveTo(centerX, centerY - 8);
      ctx.lineTo(centerX, centerY + 8);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.stroke();

      // Skin tone I-line (~123 degrees / upper-left towards R/Yl)
      const skinAngle = -2.15; // radians (~123°)
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(skinAngle) * radius * 0.95, centerY + Math.sin(skinAngle) * radius * 0.95);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Target Boxes (R, Mg, B, Cy, G, Yl)
      TARGETS.forEach(t => {
        // Map normalized (u, v) to canvas coordinates
        // U is horizontal (+ right, - left), V is vertical (+ top, - bottom)
        const tx = centerX + (t.u / 0.5) * radius * 0.75;
        const ty = centerY - (t.v / 0.5) * radius * 0.75;

        ctx.strokeStyle = t.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - 3, ty - 3, 6, 6);

        ctx.fillStyle = 'rgba(203, 213, 225, 0.8)';
        ctx.font = '8px monospace';
        ctx.fillText(t.label, tx + 5, ty + 3);
      });

      // 3. Sample pixels live from <video> if available and ready
      const video = videoRef?.current;
      let hasLiveSample = false;

      if (video && video.readyState >= 2 && offscreenCanvasRef.current) {
        try {
          const off = offscreenCanvasRef.current;
          const offCtx = off.getContext('2d', { willReadFrequently: true });
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          const imgData = offCtx.getImageData(0, 0, off.width, off.height).data;

          ctx.fillStyle = 'rgba(34, 211, 238, 0.4)'; // Cyan phosphor glow

          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];

            // Convert RGB to normalized U, V
            const u = (-0.168736 * r - 0.331264 * g + 0.5 * b) / 128;
            const v = (0.5 * r - 0.418688 * g - 0.081312 * b) / 128;

            const px = centerX + (u / 0.5) * radius * 0.75;
            const py = centerY - (v / 0.5) * radius * 0.75;

            // Only draw inside scope circle
            const distSq = (px - centerX) ** 2 + (py - centerY) ** 2;
            if (distSq <= radius ** 2) {
              ctx.fillRect(px, py, 1.2, 1.2);
            }
          }
          hasLiveSample = true;
        } catch (e) {
          // Offscreen drawing might fail due to cross-origin or video not ready
        }
      }

      // 4. Draw Segment Color Cast Vector Trace (if analyzed data available)
      if (activeSegment && activeSegment.avgR !== undefined) {
        const { avgR, avgG, avgB } = activeSegment;
        // Normalize
        const u = (-0.168736 * avgR - 0.331264 * avgG + 0.5 * avgB) / 128;
        const v = (0.5 * avgR - 0.418688 * avgG - 0.081312 * avgB) / 128;

        const vecX = centerX + (u / 0.5) * radius * 0.75;
        const vecY = centerY - (v / 0.5) * radius * 0.75;

        // Trace vector arrow from center
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vecX, vecY);
        ctx.strokeStyle = '#38bdf8'; // Sky blue vector
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vector head dot
        ctx.beginPath();
        ctx.arc(vecX, vecY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Schedule next frame if video is playing
      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(drawScope);
      }
    };

    drawScope();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [videoRef, isPlaying, currentTime, activeSegment]);

  return (
    <div className={`relative bg-slate-950/85 backdrop-blur-md p-2 rounded-lg border border-slate-700/70 shadow-xl select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1 border-b border-slate-800 text-[10px] text-slate-300 font-semibold">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-cyan-400" />
          <span>VECTORSCOPE</span>
        </div>
        {activeSegment && activeSegment.issueType !== 'normal' && (
          <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
            {activeSegment.issueType.replace('_', '-')}
          </span>
        )}
      </div>

      {/* Scope Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={150}
          height={150}
          className="rounded-full shadow-inner"
        />
      </div>

      {/* Scope Legend / Info */}
      <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-slate-800/60 text-[9px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Skin line
        </span>
        <span className="text-slate-500">Rec.709</span>
      </div>
    </div>
  );
}
