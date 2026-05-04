import React from 'react';
import { motion } from 'motion/react';
import { Piano } from 'lucide-react';

interface KeyboardProps {
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
}

const NOTES = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];

export const Keyboard: React.FC<KeyboardProps> = ({ onNoteOn, onNoteOff }) => {
  return (
    <div className="bg-brand-surface rounded-xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 p-4 bg-white/[0.02] border-b border-white/5">
        <Piano className="w-4 h-4 text-cyan-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Poly Synth Lead</h3>
      </div>
      
      <div className="flex relative h-48 bg-black p-4">
        {NOTES.map((note) => {
          const isBlack = note.includes('#');
          return (
            <motion.button
              key={note}
              onMouseDown={() => onNoteOn(note)}
              onMouseUp={() => onNoteOff(note)}
              onMouseLeave={() => onNoteOff(note)}
              onTouchStart={() => onNoteOn(note)}
              onTouchEnd={() => onNoteOff(note)}
              whileTap={{ 
                backgroundColor: isBlack ? '#1e293b' : '#cbd5e1',
                scale: 0.98 
              }}
              className={`
                relative flex-1 transition-all duration-75
                ${isBlack 
                  ? 'bg-[#121216] text-slate-400 h-28 z-10 -mx-3.5 w-7 rounded-b shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5' 
                  : 'bg-white text-slate-900 h-full rounded-b shadow-inner border-x border-b border-black/10'
                }
              `}
            >
              <span className={`absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-black ${isBlack ? 'text-slate-600' : 'text-slate-300'}`}>
                {note.replace('4', '').replace('5', '')}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
