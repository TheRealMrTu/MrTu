export type InstrumentType = 'synth' | 'drum';

export interface Step {
  active: boolean;
  intensity: number;
}

export type Grid = Step[][];

export interface ProjectData {
  id?: string;
  name: string;
  bpm: number;
  volume: number;
  grid: Record<string, boolean[]>;
  userId: string;
}

export interface InstrumentConfig {
  id: string;
  name: string;
  type: InstrumentType;
  color: string;
}

export const DRUM_TRACKS: InstrumentConfig[] = [
  { id: 'kick', name: 'Kick', type: 'drum', color: '#ef4444' },
  { id: 'snare', name: 'Snare', type: 'drum', color: '#f97316' },
  { id: 'clap', name: 'Clap', type: 'drum', color: '#ec4899' },
  { id: 'hihat', name: 'Hi-Hat', type: 'drum', color: '#eab308' },
  { id: 'perc', name: 'Perc', type: 'drum', color: '#22c55e' },
  { id: 'rim', name: 'Rim', type: 'drum', color: '#10b981' },
];

export const MELODY_TRACKS: InstrumentConfig[] = [
  { id: 'lead_c4', name: 'C4', type: 'synth', color: '#8b5cf6' },
  { id: 'lead_d4', name: 'D4', type: 'synth', color: '#a78bfa' },
  { id: 'lead_e4', name: 'E4', type: 'synth', color: '#c4b5fd' },
  { id: 'lead_f4', name: 'F4', type: 'synth', color: '#ddd6fe' },
  { id: 'lead_g4', name: 'G4', type: 'synth', color: '#8b5cf6' },
  { id: 'lead_a4', name: 'A4', type: 'synth', color: '#a78bfa' },
  { id: 'lead_b4', name: 'B4', type: 'synth', color: '#c4b5fd' },
  { id: 'lead_c5', name: 'C5', type: 'synth', color: '#ddd6fe' },
];
