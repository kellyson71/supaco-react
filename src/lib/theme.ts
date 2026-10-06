// Cor dinâmica do Material 3: gera todo o esquema de cores a partir de uma cor semente.
import { useSyncExternalStore } from 'react';
import {
  argbFromHex, Blend, hexFromArgb, Hct, MaterialDynamicColors as C, TonalPalette, type DynamicColor, type DynamicScheme,
  SchemeExpressive, SchemeFidelity, SchemeMonochrome, SchemeNeutral, SchemeTonalSpot, SchemeVibrant,
} from '@material/material-color-utilities';

export type Mode = 'light' | 'dark' | 'system';

export const SEEDS = [
  { id: 'verde', label: 'Verde IF', hex: '#2f9e41' },
  { id: 'menta', label: 'Menta', hex: '#12a37f' },
  { id: 'petroleo', label: 'Petróleo', hex: '#1f8a8a' },
  { id: 'ceu', label: 'Céu', hex: '#1c8fd6' },
  { id: 'azul', label: 'Azul', hex: '#3d6fd6' },
  { id: 'indigo', label: 'Índigo', hex: '#5059d6' },
  { id: 'roxo', label: 'Roxo', hex: '#7b5cd6' },
  { id: 'uva', label: 'Uva', hex: '#a04fc4' },
  { id: 'rosa', label: 'Rosa', hex: '#d6457a' },
  { id: 'vermelho', label: 'Vermelho', hex: '#d64545' },
  { id: 'laranja', label: 'Laranja', hex: '#e2742b' },
  { id: 'ambar', label: 'Âmbar', hex: '#c99a12' },
  { id: 'oliva', label: 'Oliva', hex: '#7a8c2a' },
  { id: 'grafite', label: 'Grafite', hex: '#5f6b7a' },
] as const;

/** Como a semente vira paleta: do mais sóbrio ao mais colorido. */
export const STYLES = [
  { id: 'tonal', label: 'Equilibrado', hint: 'O padrão do Material 3' },
  { id: 'vibrant', label: 'Vibrante', hint: 'Cores mais saturadas' },
  { id: 'expressive', label: 'Expressivo', hint: 'Combinações inesperadas' },
  { id: 'fidelity', label: 'Fiel à cor', hint: 'Usa a cor exata que você escolheu' },
  { id: 'neutral', label: 'Neutro', hint: 'Quase cinza, com um toque de cor' },
  { id: 'mono', label: 'Monocromático', hint: 'Preto, branco e cinza' },
] as const;
export type Style = (typeof STYLES)[number]['id'];

const SCHEMES: Record<Style, new (source: Hct, dark: boolean, contrast: number, spec?: '2021' | '2025') => DynamicScheme> = {
  tonal: SchemeTonalSpot, vibrant: SchemeVibrant, expressive: SchemeExpressive, fidelity: SchemeFidelity, neutral: SchemeNeutral, mono: SchemeMonochrome,
};

/**
 * Temas prontos. "dinamico" gera tudo da cor escolhida (claro/escuro pelo modo); "preto" é o dinâmico escuro com fundo preto
 * de verdade; os demais são paletas tradicionais fixas, que decidem sozinhas se são claras ou escuras.
 */
export type Classic = { id: string; label: string; dark: boolean; bg: string; fg: string; accents: [string, string, string]; error: string };
export const CLASSICS: Classic[] = [
  { id: 'github-dark', label: 'GitHub Escuro', dark: true, bg: '#0d1117', fg: '#e6edf3', accents: ['#58a6ff', '#bc8cff', '#3fb950'], error: '#f85149' },
  { id: 'dracula', label: 'Dracula', dark: true, bg: '#282a36', fg: '#f8f8f2', accents: ['#bd93f9', '#ff79c6', '#8be9fd'], error: '#ff5555' },
  { id: 'nord', label: 'Nord', dark: true, bg: '#2e3440', fg: '#eceff4', accents: ['#88c0d0', '#81a1c1', '#b48ead'], error: '#bf616a' },
  { id: 'monokai', label: 'Monokai', dark: true, bg: '#272822', fg: '#f8f8f2', accents: ['#a6e22e', '#66d9ef', '#fd971f'], error: '#f92672' },
  { id: 'gruvbox-dark', label: 'Gruvbox Escuro', dark: true, bg: '#282828', fg: '#ebdbb2', accents: ['#fabd2f', '#8ec07c', '#d3869b'], error: '#fb4934' },
  { id: 'solarized-dark', label: 'Solarized Escuro', dark: true, bg: '#002b36', fg: '#93a1a1', accents: ['#268bd2', '#2aa198', '#b58900'], error: '#dc322f' },
  { id: 'github-light', label: 'GitHub Claro', dark: false, bg: '#ffffff', fg: '#1f2328', accents: ['#0969da', '#8250df', '#1a7f37'], error: '#cf222e' },
  { id: 'solarized-light', label: 'Solarized Claro', dark: false, bg: '#fdf6e3', fg: '#586e75', accents: ['#268bd2', '#2aa198', '#b58900'], error: '#dc322f' },
  { id: 'gruvbox-light', label: 'Gruvbox Claro', dark: false, bg: '#fbf1c7', fg: '#3c3836', accents: ['#b57614', '#427b58', '#8f3f71'], error: '#cc241d' },
];
export type ThemeId = 'dinamico' | 'preto' | (typeof CLASSICS)[number]['id'];
const classicOf = (id: string) => CLASSICS.find((c) => c.id === id);
const isTheme = (id: unknown): id is ThemeId => id === 'dinamico' || id === 'preto' || !!classicOf(id as string);

export type Prefs = {
  theme: ThemeId;
  style: Style;
  /** 0 = padrão · 1 = médio · 2 = alto */
  contrast: 0 | 1 | 2;
  /** Fundo preto de verdade no modo escuro (telas OLED). */
  amoled: boolean;
  shape: 'round' | 'soft' | 'sharp';
  text: 'sm' | 'md' | 'lg';
  /** Saturação das cores das matérias. */
  subjects: 'soft' | 'normal' | 'vivid';
  reduceMotion: boolean;
};

export const DEFAULT_PREFS: Prefs = { theme: 'dinamico', style: 'tonal', contrast: 0, amoled: false, shape: 'round', text: 'md', subjects: 'normal', reduceMotion: false };

const SHAPE = { round: 1, soft: 0.6, sharp: 0.22 };
const TEXT = { sm: 0.94, md: 1, lg: 1.08 };
/** Teto de saturação das cores das matérias: [claro, escuro]. */
const CHROMA = { soft: [28, 20], normal: [48, 32], vivid: [72, 48] };

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

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Mistura `a` com `b`: t = 0 dá `a`, t = 1 dá `b`. */
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const luma = (hex: string) => { const [r, g, b] = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** Texto legível (preto ou branco) sobre a cor dada. */
const onColor = (hex: string) => (luma(hex) > 0.4 ? '#000000' : '#ffffff');

/** Papéis de cor do M3 a partir do fundo, do texto e de três destaques de uma paleta tradicional. */
function classicVars(c: Classic): Record<string, string> {
  const { bg, fg, dark } = c;
  const black = '#000000', white = '#ffffff';
  const accent = (name: string, hex: string) => ({
    [`--md-${name}`]: hex,
    [`--md-on-${name}`]: onColor(hex),
    [`--md-${name}-container`]: mix(bg, hex, dark ? 0.32 : 0.2),
    [`--md-on-${name}-container`]: dark ? mix(hex, white, 0.55) : mix(hex, black, 0.55),
  });
  const ladder = dark ? [0.03, 0.06, 0.09, 0.13] : [0.025, 0.05, 0.08, 0.11];
  return {
    ...accent('primary', c.accents[0]), ...accent('secondary', c.accents[1]), ...accent('tertiary', c.accents[2]), ...accent('error', c.error),
    '--md-surface': bg, '--md-on-surface': fg, '--md-on-surface-variant': mix(fg, bg, 0.28),
    '--md-surface-dim': dark ? mix(bg, black, 0.2) : mix(bg, fg, 0.1), '--md-surface-bright': dark ? mix(bg, fg, 0.12) : bg,
    '--md-surface-container-lowest': dark ? mix(bg, black, 0.25) : mix(bg, white, 0.6),
    '--md-surface-container-low': mix(bg, fg, ladder[0]), '--md-surface-container': mix(bg, fg, ladder[1]),
    '--md-surface-container-high': mix(bg, fg, ladder[2]), '--md-surface-container-highest': mix(bg, fg, ladder[3]),
    '--md-outline': mix(fg, bg, 0.5), '--md-outline-variant': mix(fg, bg, 0.75),
    '--md-inverse-surface': fg, '--md-inverse-on-surface': bg, '--md-inverse-primary': mix(c.accents[0], bg, 0.35),
  };
}

export const seedHex = (seed: string) => (seed.startsWith('#') ? seed : SEEDS.find((s) => s.id === seed)?.hex ?? SEEDS[0].hex);

export function buildVars(seedHexValue: string, dark: boolean, prefs: Prefs = DEFAULT_PREFS): Record<string, string> {
  const classic = classicOf(prefs.theme);
  if (classic) { seedHexValue = classic.accents[0]; dark = classic.dark; }
  const source = argbFromHex(seedHexValue);
  const scheme = new SCHEMES[prefs.style](Hct.fromInt(source), dark, prefs.contrast / 2, '2025');
  const vars: Record<string, string> = {};
  for (const [name, role] of Object.entries(ROLES)) vars[`--md-${name}`] = hexFromArgb(role.getArgb(scheme));

  if (dark && (prefs.amoled || prefs.theme === 'preto')) {
    // Preto puro no fundo; os contêineres sobem em degraus curtos para ainda dar relevo
    const n = scheme.neutralPalette;
    Object.assign(vars, {
      '--md-surface': '#000000', '--md-surface-dim': '#000000', '--md-surface-container-lowest': '#000000',
      '--md-surface-container-low': hexFromArgb(n.tone(4)), '--md-surface-container': hexFromArgb(n.tone(7)),
      '--md-surface-container-high': hexFromArgb(n.tone(10)), '--md-surface-container-highest': hexFromArgb(n.tone(14)),
    });
  }

  if (classic) Object.assign(vars, classicVars(classic));

  const cap = CHROMA[prefs.subjects][dark ? 1 : 0];
  // Com mais contraste, as cores das matérias também se afastam do fundo
  const shift = prefs.contrast * 4;
  for (const [name, hex] of Object.entries(CUSTOM)) {
    const hct = Hct.fromInt(Blend.harmonize(argbFromHex(hex), source));
    // Saturação limitada para as cores não brigarem com o tema (mais contida no escuro)
    const p = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, cap));
    vars[`--c-${name}`] = hexFromArgb(p.tone(dark ? 80 + shift / 2 : 45 - shift));
    vars[`--c-${name}-on`] = hexFromArgb(p.tone(dark ? 20 : 100));
    vars[`--c-${name}-container`] = hexFromArgb(p.tone(dark ? 30 : 90));
    vars[`--c-${name}-on-container`] = hexFromArgb(p.tone(dark ? 90 + shift / 2 : 10));
  }

  vars['--shape'] = String(SHAPE[prefs.shape]);
  vars['--text-scale'] = String(TEXT[prefs.text]);
  return vars;
}

/** As três cores principais de uma combinação, para as miniaturas da tela de aparência. */
export function swatch(seed: string, dark: boolean, style: Style = 'tonal') {
  const scheme = new SCHEMES[style](Hct.fromInt(argbFromHex(seedHex(seed))), dark, 0, '2025');
  return { primary: hexFromArgb(C.primary.getArgb(scheme)), secondary: hexFromArgb(C.secondaryContainer.getArgb(scheme)), tertiary: hexFromArgb(C.tertiary.getArgb(scheme)) };
}

// ---------- Estado persistido ----------

const K = { mode: 'supaco:mode', seed: 'supaco:seed', prefs: 'supaco:prefs', vars: 'supaco:themevars' };
const media = typeof window !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;

type State = { mode: Mode; seed: string; dark: boolean; prefs: Prefs };
let state: State = read();
const subs = new Set<() => void>();

function read(): State {
  let mode: Mode = 'dark', seed: string = SEEDS[0].id, prefs = DEFAULT_PREFS;
  try {
    // Sem escolha salva, o app abre no escuro
    mode = (localStorage.getItem(K.mode) as Mode) || 'dark';
    seed = localStorage.getItem(K.seed) || SEEDS[0].id;
    prefs = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(K.prefs) || '{}') };
  } catch { /* storage bloqueado */ }
  if (!SCHEMES[prefs.style]) prefs = { ...prefs, style: 'tonal' };
  if (!isTheme(prefs.theme)) prefs = { ...prefs, theme: 'dinamico' };
  const forced = classicOf(prefs.theme)?.dark ?? (prefs.theme === 'preto' ? true : undefined);
  const dark = forced ?? (mode === 'dark' || (mode === 'system' && !!media?.matches));
  return { mode, seed, dark, prefs };
}

export function applyTheme() {
  state = read();
  const vars = buildVars(seedHex(state.seed), state.dark, state.prefs);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.classList.toggle('dark', state.dark);
  root.classList.toggle('reduce-motion', state.prefs.reduceMotion);
  root.style.colorScheme = state.dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', vars['--md-surface']));
  try { localStorage.setItem(K.vars, JSON.stringify({ dark: state.dark, forced: state.prefs.theme !== 'dinamico', vars })); } catch { /* quota */ }
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
/** Aceita o id de uma cor pronta ou um hexadecimal ("#rrggbb") escolhido à mão. */
export const setSeed = (id: string) => set(K.seed, id);
export const setPref = <P extends keyof Prefs>(key: P, value: Prefs[P]) => set(K.prefs, JSON.stringify({ ...state.prefs, [key]: value }));
/** Volta cor, estilo e ajustes ao padrão (o modo claro/escuro fica como está). */
export const resetTheme = () => { try { localStorage.removeItem(K.seed); } catch { /* ok */ } set(K.prefs, JSON.stringify(DEFAULT_PREFS)); };
/** Alterna claro/escuro com um toque (sai do modo "sistema"). */
export const toggleDark = () => {
  // Num tema fixo o modo não manda: volta ao dinâmico e inverte o que se está vendo
  if (state.prefs.theme !== 'dinamico') { try { localStorage.setItem(K.prefs, JSON.stringify({ ...state.prefs, theme: 'dinamico' })); } catch { /* ok */ } }
  setMode(state.dark ? 'light' : 'dark');
};

media?.addEventListener('change', () => { if (state.mode === 'system') applyTheme(); });

export function useThemeState() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);
}
