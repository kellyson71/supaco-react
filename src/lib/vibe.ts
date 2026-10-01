// Clima do app: sério (padrão) ou zueira, com ou sem memes.
import { useSyncExternalStore } from 'react';

export type Vibe = {
  tone: 'serio' | 'zueira';
  memes: boolean;
  /** Já respondeu ao convite da tela Hoje (não pergunta de novo). */
  asked: boolean;
};

const KEY = 'supaco:vibe';
const DEFAULT: Vibe = { tone: 'serio', memes: false, asked: false };
const subs = new Set<() => void>();

function read(): Vibe {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULT; }
}
let state = read();

export function setVibe(patch: Partial<Vibe>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage bloqueado */ }
  subs.forEach((fn) => fn());
}

export const useVibe = () => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);
/** Memes só aparecem no modo zueira. */
export const memesOn = (v: Vibe) => v.tone === 'zueira' && v.memes;
