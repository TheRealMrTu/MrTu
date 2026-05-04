import React from 'react';
import { motion } from 'motion/react';
import { InstrumentConfig, Step } from '../types';

interface SequencerProps {
  tracks: InstrumentConfig[];
  grid: Step[][];
  currentStep: number;
  onToggleStep: (trackIndex: number, stepIndex: number) => void;
}

export const Sequencer: React.FC<SequencerProps> = ({
  tracks,
  grid,
  currentStep,
  onToggleStep,
}) => {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-white/5 bg-brand-surface divide-y divide-white/5 shadow-2xl">
      <div className="flex items-center justify-between p-3 px-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Drum Pattern</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-1 rounded-full ${
                  Math.floor(currentStep / 4) === i ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
          {currentStep >= 0 ? `Step ${currentStep + 1}` : 'Stopped'}
        </div>
      </div>
      
      <div className="flex">
        {/* Track Headers */}
        <div className="w-32 border-r border-white/5 flex flex-col shrink-0">
          <div className="h-6 border-b border-white/5 bg-white/[0.01]"></div>
          {tracks.map((track) => (
            <div key={track.id} className="h-12 flex items-center px-4 border-b last:border-b-0 border-white/5 bg-white/[0.01]">
              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-white transition-colors">
                {track.name}
              </span>
            </div>
          ))}
        </div>

        {/* Steps Grid */}
        <div className="flex-1 flex flex-col overflow-x-auto scrollbar-hide">
          {/* Step numbers header */}
          <div className="flex h-6 border-b border-white/5 bg-white/[0.01] w-max">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="w-10 flex items-center justify-center shrink-0 border-r border-white/5">
                <span className="text-[7px] font-mono text-slate-600">{(i + 1).toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
          {grid.map((row, trackIndex) => (
            <div key={trackIndex} className="flex h-12 border-b last:border-b-0 border-white/5 w-max">
              {row.map((step, stepIndex) => (
                <button
                  key={stepIndex}
                  onClick={() => onToggleStep(trackIndex, stepIndex)}
                  className={`
                    w-10 border-r border-white/5 transition-all duration-75 relative shrink-0
                    ${stepIndex % 4 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}
                    ${currentStep === stepIndex ? 'after:content-[""] after:absolute after:inset-0 after:bg-cyan-400/10 after:z-0' : ''}
                  `}
                >
                  <motion.div
                    animate={{ 
                      scale: step.active ? 1 : 0.8,
                      opacity: step.active ? 1 : 0.2
                    }}
                    className={`
                      w-3 h-3 mx-auto rounded-sm relative z-10
                      ${step.active 
                        ? 'shadow-[0_0_10px_rgba(34,211,238,0.4)]' 
                        : ''
                      }
                    `}
                    style={{
                      backgroundColor: step.active ? tracks[trackIndex].color : '#334155'
                    }}
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
