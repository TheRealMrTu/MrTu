import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface VisualizerProps {
  analyser: Tone.Analyser | null;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const values = analyser.getValue() as Float32Array;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      
      // Draw background lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22d3ee';

      const sliceWidth = width / values.length;
      let x = 0;

      for (let i = 0; i < values.length; i++) {
        const v = values[i] + 0.5; // Offset to center
        const y = v * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();

      // Add a glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22d3ee';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser]);

  return (
    <div className="w-full h-32 bg-brand-surface rounded-xl overflow-hidden border border-white/5 relative shadow-xl">
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-80"
        width={800}
        height={128}
      />
      <div className="absolute top-4 left-6 text-[10px] font-black font-mono text-cyan-400 opacity-50 uppercase tracking-[0.3em]">
        Signal Analysis
      </div>
      <div className="absolute top-4 right-6 text-[10px] font-mono text-slate-600 opacity-50 uppercase tracking-widest">
        Hz Lineage
      </div>
    </div>
  );
};
