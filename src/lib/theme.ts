// Cor dinâmica do Material 3: gera todo o esquema de cores a partir de uma cor semente.
import { useSyncExternalStore } from 'react';
import { argbFromHex, Blend, hexFromArgb, Hct, MaterialDynamicColors as C, SchemeTonalSpot, TonalPalette, type DynamicColor } from '@material/material-color-utilities';

export type Mode = 'light' | 'dark' | 'system';

export const SEEDS = [
  { id: 'verde', label: 'Verde IF', hex: '#2f9e41' },
  { id: 'azul', label: 'Azul', hex: '#3d6fd6' },
  { id: 'roxo', label: 'Roxo', hex: '#7b5cd6' },
  { id: 'rosa', label: 'Rosa', hex: '#d6457a' },
  { id: 'laranja', label: 'Laranja', hex: '#e2742b' },
  { id: 'petroleo', label: 'Petróleo', hex: '#1f8a8a' },
] as const;

/** Cores das matérias e de status, harmonizadas com a semente (M3 "custom colors"). */
const CUSTOM: Record<string, string> = {
  pink: '#e8457a', teal: '#1f9e8a', yellow: '#e8a712', lilac: '#8a6cf0', orange: '#ef7a2f', sky: '#2f8fe0',
  success: '#2f9e41', warning: '#e0a000',
};

const ROLES: Record<string, DynamicColor> = {
  primary: C.primary, 'on-primary': C.onPrimary, 'primary-container': C.primaryContainer, 'on-primary-container': C.onPrimaryContainer,
  secondary: C.secondary, 'on-secondary': C.onSecondary, 'secondary-container': C.secondaryContainer, 'on-secondary-container': C.onSecondaryContainer,
  tertiary: C.tertiary, 'on-tertiary': C.onTertiary, 'tertiary-container': C.tertiaryContainer, 'on-tertiary-container': C.onTertiaryContainer,
  error: C.error, 'on-error': C.onError, 'error-container': C.errorContainer, 'on-error-container': C.onErrorContainer,
  surface: C.surface, 'on-surface': C.onSurface, 'on-surface-variant': C.onSurfaceVariant,
  'surface-dim': C.surfaceDim, 'surface-bright': C.surfaceBright,
  'surface-container-lowest': C.surfaceContainerLowest, 'surface-container-low': C.surfaceContainerLow,
  'surface-container': C.surfaceContainer, 'surface-container-high': C.surfaceContainerHigh, 'surface-container-highest': C.surfaceContainerHighest,
  outline: C.outline, 'outline-variant': C.outlineVariant,
  'inverse-surface': C.inverseSurface, 'inverse-on-surface': C.inverseOnSurface, 'inverse-primary': C.inversePrimary,
};

export function buildVars(seedHex: string, dark: boolean): Record<string, string> {
  const source = argbFromHex(seedHex);
  const scheme = new SchemeTonalSpot(Hct.fromInt(source), dark, 0, '2025');
  const vars: Record<string, string> = {};
  for (const [name, role] of Object.entries(ROLES)) vars[`--md-${name}`] = hexFromArgb(role.getArgb(scheme));
  for (const [name, hex] of Object.entries(CUSTOM)) {
    const hct = Hct.fromInt(Blend.harmonize(argbFromHex(hex), source));
    // Saturação limitada para as cores não brigarem com o tema (mais contida no escuro)
    const p = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, dark ? 32 : 48));
    vars[`--c-${name}`] = hexFromArgb(p.tone(dark ? 80 : 45));
    vars[`--c-${name}-on`] = hexFromArgb(p.tone(dark ? 20 : 100));
    vars[`--c-${name}-container`] = hexFromArgb(p.tone(dark ? 30 : 90));
    vars[`--c-${name}-on-container`] = hexFromArgb(p.tone(dark ? 90 : 10));
  }
  return vars;
}

// ---------- Estado persistido ----------

const K = { mode: 'supaco:mode', seed: 'supaco:seed', vars: 'supaco:themevars' };
const media = typeof window !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;

type State = { mode: Mode; seed: string; dark: boolean };
let state: State = read();
const subs = new Set<() => void>();

function read(): State {
  let mode: Mode = 'system', seed: string = SEEDS[0].id;
  try {
    mode = (localStorage.getItem(K.mode) as Mode) || 'system';
    seed = localStorage.getItem(K.seed) || SEEDS[0].id;
  } catch { /* storage bloqueado */ }
  const dark = mode === 'dark' || (mode === 'system' && !!media?.matches);
  return { mode, seed, dark };
}

export function applyTheme() {
  state = read();
  const hex = SEEDS.find((s) => s.id === state.seed)?.hex ?? SEEDS[0].hex;
  const vars = buildVars(hex, state.dark);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.classList.toggle('dark', state.dark);
  root.style.colorScheme = state.dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', vars['--md-surface']));
  try { localStorage.setItem(K.vars, JSON.stringify({ dark: state.dark, vars })); } catch { /* quota */ }
  subs.forEach((fn) => fn());
}

function set(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage bloqueado */ }
  // Transição suave de cores ao trocar o tema
  document.documentElement.classList.add('theme-anim');
  applyTheme();
  setTimeout(() => document.documentElement.classList.remove('theme-anim'), 450);
}

export const setMode = (m: Mode) => set(K.mode, m);
export const setSeed = (id: string) => set(K.seed, id);
/** Alterna claro/escuro com um toque (sai do modo "sistema"). */
export const toggleDark = () => setMode(state.dark ? 'light' : 'dark');

media?.addEventListener('change', () => { if (state.mode === 'system') applyTheme(); });

export function useThemeState() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);
}
