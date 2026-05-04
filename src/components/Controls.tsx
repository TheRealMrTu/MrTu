import React from 'react';
import { Play, Square, RotateCcw, Sparkles, Volume2, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface ControlsProps {
  isPlaying: boolean;
  bpm: number;
  volume: number;
  onPlayToggle: () => void;
  onReset: () => void;
  onBpmChange: (bpm: number) => void;
  onVolumeChange: (vol: number) => void;
  onAiInspiration: () => void;
  isAiLoading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  bpm,
  volume,
  onPlayToggle,
  onReset,
  onBpmChange,
  onVolumeChange,
  onAiInspiration,
  isAiLoading,
}) => {
  return (
    <footer className="h-20 border-t border-white/10 bg-[#121216] flex items-center px-8 justify-between w-full">
      <div className="flex items-center gap-10">
        {/* Transport Controls */}
        <div className="flex items-center gap-5">
          <button onClick={onReset} className="text-slate-500 hover:text-white transition-colors">
            <RotateCcw size={16} />
          </button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPlayToggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-transparent border-2 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
            }`}
          >
            {isPlaying ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </motion.button>

          <motion.button
            onClick={onAiInspiration}
            disabled={isAiLoading}
            whileHover={{ scale: 1.1 }}
            className={`w-10 h-10 rounded-full border border-purple-500/30 flex items-center justify-center transition-colors group ${isAiLoading ? 'bg-purple-500/20' : 'hover:bg-purple-500'}`}
          >
             <Sparkles size={14} className={`text-purple-400 group-hover:text-white ${isAiLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Global Stats */}
        <div className="flex gap-8 border-l border-white/10 pl-10">
          <div className="group cursor-pointer">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-cyan-400 transition-colors">Tempo</div>
            <div className="flex items-end gap-1">
               <span className="text-2xl font-mono text-white leading-none">{bpm}.00</span>
               <span className="text-[10px] text-slate-500 mb-1">BPM</span>
            </div>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value))}
              className="w-24 h-0.5 bg-white/5 accent-cyan-500 appearance-none mt-2 block"
            />
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Vol</div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-mono text-cyan-400 leading-none">{Math.round((volume + 60) * 1.66)}</span>
              <span className="text-[10px] text-slate-500 mb-1">%</span>
            </div>
            <input
              type="range"
              min="-60"
              max="0"
              value={volume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="w-24 h-0.5 bg-white/5 accent-cyan-500 appearance-none mt-2 block"
            />
          </div>

          <div className="hidden md:block">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Output</div>
            <div className="text-2xl font-mono text-white leading-none flex items-center gap-2">
               Stereo
               <Activity className="text-cyan-500 w-4 h-4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Master Section */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-1 bg-slate-800 rounded-full relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border border-slate-300"></div>
          </div>
          <span className="text-[9px] uppercase tracking-tighter text-slate-400">Mix Balance</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex gap-1 items-end h-8 overflow-hidden">
             {Array.from({ length: 8 }).map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ height: isPlaying ? [10, 30, 15, 25, 10][i % 5] : 4 }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className={`w-1 bg-cyan-500 ${i > 5 ? 'bg-yellow-500 text-opacity-50' : ''}`} 
                />
             ))}
          </div>
          <span className="text-[9px] uppercase tracking-widest text-white mt-1 font-bold">Master Out</span>
        </div>
      </div>
    </footer>
  );
};
