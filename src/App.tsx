/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Settings2, Info, Headphones, Waves, LogIn, LogOut, Save, FolderOpen, User } from 'lucide-react';
import { Sequencer } from './components/Sequencer';
import { Keyboard } from './components/Keyboard';
import { Visualizer } from './components/Visualizer';
import { Controls } from './components/Controls';
import { DRUM_TRACKS, MELODY_TRACKS, Step, ProjectData } from './types';
import { getAiInspiration } from './services/geminiService';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { saveProject, getProjects, testConnection } from './services/projectService';

const INITIAL_GRID: Step[][] = DRUM_TRACKS.map(() => 
  Array.from({ length: 32 }, () => ({ active: false, intensity: 1 }))
);

const INITIAL_MELODY_GRID: Step[][] = MELODY_TRACKS.map(() => 
  Array.from({ length: 32 }, () => ({ active: false, intensity: 1 }))
);

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(-12);
  const [currentStep, setCurrentStep] = useState(-1);
  const [grid, setGrid] = useState<Step[][]>(INITIAL_GRID);
  const [melodyGrid, setMelodyGrid] = useState<Step[][]>(INITIAL_MELODY_GRID);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);
  
  // FX State
  const [cutoff, setCutoff] = useState(2000);
  const [delayFeedback, setDelayFeedback] = useState(0.4);
  const [oscType, setOscType] = useState<Tone.ToneOscillatorType>("sawtooth");
  
  // Auth & Projects State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [projectName, setProjectName] = useState("Untitled Track");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Refs for audio engine
  const drumSampler = useRef<Tone.Sampler | null>(null);
  const leadSynth = useRef<Tone.PolySynth | null>(null);
  const filter = useRef<Tone.Filter | null>(null);
  const delay = useRef<Tone.FeedbackDelay | null>(null);
  const masterVol = useRef<Tone.Volume | null>(null);
  const masterAnalyser = useRef<Tone.Analyser | null>(null);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchProjects();
      }
    });

    // Initialize audio engine
    masterAnalyser.current = new Tone.Analyser('waveform', 256);
    masterVol.current = new Tone.Volume(volume).toDestination();
    masterVol.current.connect(masterAnalyser.current);
    
    setAnalyser(masterAnalyser.current);

    drumSampler.current = new Tone.Sampler({
      urls: {
        C1: "https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3",
        D1: "https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3",
        E1: "https://tonejs.github.io/audio/drum-samples/CR78/perc2.mp3",
        F1: "https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3",
        G1: "https://tonejs.github.io/audio/drum-samples/CR78/perc1.mp3",
        A1: "https://tonejs.github.io/audio/drum-samples/CR78/rim.mp3",
      },
    }).connect(masterVol.current);

    filter.current = new Tone.Filter(cutoff, "lowpass").connect(masterVol.current);
    delay.current = new Tone.FeedbackDelay("8n", delayFeedback).connect(filter.current);

    leadSynth.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 1 },
    }).connect(delay.current);

    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      drumSampler.current?.dispose();
      leadSynth.current?.dispose();
    };
  }, []);

  // Update master volume
  useEffect(() => {
    if (masterVol.current) {
      masterVol.current.volume.rampTo(volume, 0.1);
    }
  }, [volume]);

  // Update FX
  useEffect(() => {
    if (filter.current) {
      filter.current.frequency.rampTo(cutoff, 0.1);
    }
  }, [cutoff]);

  useEffect(() => {
    if (delay.current) {
      delay.current.feedback.rampTo(delayFeedback, 0.1);
    }
  }, [delayFeedback]);

  useEffect(() => {
    if (leadSynth.current) {
      leadSynth.current.set({ oscillator: { type: oscType } });
    }
  }, [oscType]);

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Main tick loop
  useEffect(() => {
    const loop = new Tone.Loop((time) => {
      Tone.Draw.schedule(() => {
        // Calculate step based on absolute transport time for stability
        const seconds = Tone.Transport.seconds;
        const bpmValue = Tone.Transport.bpm.value;
        const quarterNoteTime = 60 / bpmValue;
        const sixteenthNoteTime = quarterNoteTime / 4;
        const step = Math.floor((seconds + 0.01) / sixteenthNoteTime) % 32;
        setCurrentStep(step);
      }, time);
    }, '16n').start(0);

    return () => {
      loop.dispose();
    };
  }, []);

  // Precise audio triggering
  useEffect(() => {
    if (!isPlaying) return;

    const repeat = (time: number) => {
      const stepIndex = Math.floor(Tone.Transport.getTicksAtTime(time) / Tone.Transport.PPQ * 4) % 32;
      
      // Drum trigger
      grid.forEach((row, trackIndex) => {
        if (row[stepIndex].active && drumSampler.current) {
          const notes = ['C1', 'D1', 'E1', 'F1', 'G1', 'A1'];
          drumSampler.current.triggerAttackRelease(notes[trackIndex] || 'C1', '16n', time);
        }
      });

      // Melody trigger
      melodyGrid.forEach((row, trackIndex) => {
        if (row[stepIndex].active && leadSynth.current) {
          const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
          leadSynth.current.triggerAttackRelease(notes[trackIndex] || 'C4', '16n', time);
        }
      });
    };

    const id = Tone.Transport.scheduleRepeat(repeat, '16n');
    return () => Tone.Transport.clear(id);
  }, [isPlaying, grid]);

  const handlePlayToggle = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (isPlaying) {
      Tone.Transport.stop();
      setCurrentStep(-1);
    } else {
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setGrid(INITIAL_GRID);
  };

  const handleToggleStep = (trackIndex: number, stepIndex: number) => {
    setGrid((prev) => {
      const newGrid = [...prev];
      newGrid[trackIndex] = [...newGrid[trackIndex]];
      newGrid[trackIndex][stepIndex] = {
        ...newGrid[trackIndex][stepIndex],
        active: !newGrid[trackIndex][stepIndex].active
      };
      return newGrid;
    });
  };

  const handleToggleMelodyStep = (trackIndex: number, stepIndex: number) => {
    setMelodyGrid((prev) => {
      const newGrid = [...prev];
      newGrid[trackIndex] = [...newGrid[trackIndex]];
      newGrid[trackIndex][stepIndex] = {
        ...newGrid[trackIndex][stepIndex],
        active: !newGrid[trackIndex][stepIndex].active
      };
      return newGrid;
    });
  };

  const handleNoteOn = (note: string) => {
    if (leadSynth.current) {
      leadSynth.current.triggerAttack(note);
    }
  };

  const handleNoteOff = (note: string) => {
    if (leadSynth.current) {
      leadSynth.current.triggerRelease(note);
    }
  };

  const handleAiInspiration = async () => {
    setIsAiLoading(true);
    const inspiration = await getAiInspiration("energetic tech house");
    if (inspiration) {
      if (inspiration.drums) {
        const newGrid = DRUM_TRACKS.map((track) => {
          const key = track.id as keyof typeof inspiration.drums;
          const pattern = inspiration.drums[key];
          return Array.from({ length: 32 }, (_, i) => ({
            active: pattern[i] || false,
            intensity: 1
          }));
        });
        setGrid(newGrid);
      }
      
      if (inspiration.melody) {
        const newMelodyGrid = MELODY_TRACKS.map((track, trackIdx) => {
          const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
          const targetNote = notes[trackIdx];
          return Array.from({ length: 32 }, (_, i) => ({
            active: inspiration.melody[i] === targetNote,
            intensity: 1
          }));
        });
        setMelodyGrid(newMelodyGrid);
      }
    }
    setIsAiLoading(false);
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const p = await getProjects() as any;
      setProjects(p);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
    setIsLoadingProjects(false);
  };

  const handleSaveProject = async () => {
    if (!user) return handleLogin();
    setIsSaving(true);
    try {
      const gridMap: Record<string, boolean[]> = {};
      DRUM_TRACKS.forEach((track, i) => {
        gridMap[track.id] = grid[i].map(s => s.active);
      });
      MELODY_TRACKS.forEach((track, i) => {
        gridMap[track.id] = melodyGrid[i].map(s => s.active);
      });
      await saveProject(projectName, bpm, volume, gridMap);
      await fetchProjects();
    } catch (error) {
      console.error("Save Error:", error);
    }
    setIsSaving(false);
  };

  const handleLoadProject = (p: ProjectData) => {
    setProjectName(p.name);
    setBpm(p.bpm);
    setVolume(p.volume);
    
    const newGrid = DRUM_TRACKS.map((track) => {
      const pattern = p.grid[track.id] || [];
      return Array.from({ length: 32 }, (_, i) => ({
        active: pattern[i] || false,
        intensity: 1
      }));
    });
    setGrid(newGrid);

    const newMelodyGrid = MELODY_TRACKS.map((track) => {
      const pattern = p.grid[track.id] || [];
      return Array.from({ length: 32 }, (_, i) => ({
        active: pattern[i] || false,
        intensity: 1
      }));
    });
    setMelodyGrid(newMelodyGrid);
  };

  return (
    <div className="h-screen bg-brand-bg text-slate-300 flex flex-col overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-white/5 bg-brand-surface flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-6 h-6 bg-cyan-500 rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.3)]">
              <div className="w-1 h-3 bg-white"></div>
            </div>
            <span className="font-bold text-white tracking-tighter text-lg uppercase italic">
              SONIK<span className="text-cyan-400 not-italic">.OS</span>
            </span>
          </div>
          <nav className="hidden md:flex gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <span className="text-cyan-400 border-b border-cyan-400 pb-1">Editor</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Mixer</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Library</span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">Project</span>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-white font-bold text-xs border-b border-white/10 focus:border-cyan-400 outline-none pb-1 transition-colors w-32 md:w-48"
            />
            <button 
              onClick={handleSaveProject}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-black uppercase tracking-widest border border-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Save size={10} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
          
          <div className="flex items-center gap-4 border-l border-white/5 pl-6">
            {user ? (
               <div className="flex items-center gap-3 group">
                  <div className="text-[10px] items-end flex flex-col">
                    <span className="text-white font-bold">{user.displayName}</span>
                    <button onClick={handleLogout} className="text-slate-500 hover:text-red-400">Logout</button>
                  </div>
                  <div className="w-8 h-8 rounded bg-white/5 overflow-hidden border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                    <img src={user.photoURL || ""} alt="Avatar" referrerPolicy="no-referrer" />
                  </div>
               </div>
            ) : (
               <button onClick={handleLogin} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">
                  <LogIn size={14} />
                  Login
               </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Left: Sound Browser */}
        <aside className="w-64 border-r border-white/5 bg-brand-sidebar flex flex-col shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-white/5">
            <div className="relative">
               <input 
                type="text" 
                placeholder="Search sounds..." 
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[10px] focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <h3 className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-black flex items-center justify-between">
                My Projects
                <FolderOpen size={10} />
              </h3>
              <div className="space-y-2">
                {!user && (
                  <p className="text-[10px] text-slate-600 italic">Login to save and load your creations.</p>
                )}
                {user && projects.length === 0 && !isLoadingProjects && (
                  <p className="text-[10px] text-slate-600 italic">No project saved yet.</p>
                )}
                <ul className="space-y-1">
                  {projects.map((p) => (
                    <li 
                      key={p.id}
                      onClick={() => handleLoadProject(p)}
                      className="group flex flex-col p-2 hover:bg-white/5 rounded cursor-pointer transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11px] text-slate-300 font-bold truncate pr-2 group-hover:text-cyan-400">{p.name}</span>
                        <span className="text-[8px] font-mono text-slate-600">{p.bpm} BPM</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-black">Instruments</h3>
              <ul className="space-y-3 text-[11px] font-medium">
                <li className="flex items-center justify-between group cursor-pointer">
                  <span className="text-cyan-400">CR78_Drums.sf2</span>
                  <span className="text-[9px] px-1 bg-cyan-500/10 rounded text-cyan-500">LIVE</span>
                </li>
                <li className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Sawtooth_Poly.vst</li>
                <li className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Sine_Sub_Bass.vst</li>
              </ul>
            </section>
            
            <section className="pt-6 border-t border-white/5">
               <div className="flex items-center gap-2 mb-4">
                  <Waves size={12} className="text-cyan-500" />
                  <h3 className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black">AI Insights</h3>
               </div>
               <AnimatePresence mode="wait">
                  <motion.p 
                    key={currentStep % 4}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-slate-500 leading-relaxed font-mono"
                  >
                    {TIPS[currentStep % TIPS.length]}
                  </motion.p>
               </AnimatePresence>
            </section>
          </div>
        </aside>

        {/* Central Editor Area */}
        <section className="flex-1 flex flex-col bg-brand-bg relative overflow-hidden">
          {/* Timeline Rulers */}
          <div className="h-8 border-b border-white/5 bg-white/[0.01] flex items-center px-4 shrink-0 overflow-hidden">
            <div className="w-full flex justify-between text-[8px] font-mono opacity-30 pt-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i}>{i + 1}.1</span>
              ))}
            </div>
          </div>

          {/* Main Edit View */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-grid space-y-8 scroll-smooth">
             <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <Visualizer analyser={analyser} />

                <Sequencer
                  tracks={DRUM_TRACKS}
                  grid={grid}
                  currentStep={currentStep}
                  onToggleStep={handleToggleStep}
                />

                <div className="space-y-4">
                   <div className="flex items-center gap-2 px-6">
                      <Music className="w-4 h-4 text-purple-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Melody Sequencer</h3>
                   </div>
                   <Sequencer
                    tracks={MELODY_TRACKS}
                    grid={melodyGrid}
                    currentStep={currentStep}
                    onToggleStep={handleToggleMelodyStep}
                  />
                </div>

                <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} />
             </div>
          </div>
          
          {/* Playhead Layer (Abstract Representation) */}
          <div 
            className="absolute top-8 bottom-0 w-px bg-cyan-400 z-10 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-75 pointer-events-none"
            style={{ left: `${(currentStep / 32) * 100}%`, display: currentStep < 0 ? 'none' : 'block' }}
          >
            <div className="w-2 h-2 bg-cyan-400 rotate-45 -translate-x-[3.5px] -mt-1 shadow-lg"></div>
          </div>
        </section>

        {/* Sidebar Right: FX Chain */}
        <aside className="w-16 border-l border-white/5 bg-brand-sidebar flex flex-col items-center py-8 gap-8 shrink-0 hidden md:flex">
          <div className="flex flex-col items-center gap-1 mb-2">
            <Music size={10} className="text-slate-600" />
            <span className="text-[6px] font-black uppercase text-slate-600">Lead</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Wave</span>
            <div className="flex flex-col gap-1">
              {['sawtooth', 'square', 'sine'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOscType(type as any)}
                  className={`w-8 h-4 rounded-sm border transition-all ${
                    oscType === type 
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                      : 'border-white/10 text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <span className="text-[6px] font-bold uppercase">{type.slice(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Cutoff</span>
            <div className="relative w-1 h-24 bg-white/5 rounded-full">
              <input 
                type="range" 
                min="100" 
                max="8000" 
                value={cutoff}
                onChange={(e) => setCutoff(Number(e.target.value))}
                className="absolute inset-x-0 -rotate-90 w-24 translate-y-11 -translate-x-11 opacity-0 cursor-pointer"
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-full bg-cyan-400 rounded-full"
                style={{ height: `${(cutoff / 8000) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Echo</span>
            <div className="relative w-1 h-24 bg-white/5 rounded-full">
              <input 
                type="range" 
                min="0" 
                max="0.8" 
                step="0.01"
                value={delayFeedback}
                onChange={(e) => setDelayFeedback(Number(e.target.value))}
                className="absolute inset-x-0 -rotate-90 w-24 translate-y-11 -translate-x-11 opacity-0 cursor-pointer"
              />
              <motion.div 
                className="absolute bottom-0 left-0 w-full bg-purple-500 rounded-full"
                style={{ height: `${(delayFeedback / 0.8) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="w-1.5 h-32 bg-slate-800 rounded-full relative overflow-hidden">
               <motion.div 
                className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 rounded-full"
                animate={{ height: isPlaying ? [50, 70, 60, 80, 55][currentStep % 5] + '%' : '10%' }}
              />
            </div>
            <span className="text-[8px] font-mono text-slate-600">0dB</span>
          </div>
        </aside>
      </main>

      {/* Global Bottom Transport bar (Controls) */}
      <Controls 
        isPlaying={isPlaying}
        bpm={bpm}
        volume={volume}
        onPlayToggle={handlePlayToggle}
        onReset={handleReset}
        onBpmChange={setBpm}
        onVolumeChange={setVolume}
        onAiInspiration={handleAiInspiration}
        isAiLoading={isAiLoading}
      />
    </div>
  );
}

const TIPS = [
  "Use the AI Inspire button to generate 32-step tech-house patterns.",
  "Experiment with high BPM for high-energy dance tracks.",
  "Scroll horizontally on the sequencers to see all 32 steps.",
  "The melody sequencer uses lead synth notes (C4, E4, G4, B4).",
  "Save your session to the cloud to continue later.",
];
