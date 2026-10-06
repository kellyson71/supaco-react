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

/** Cores de um tema pronto num dos modos: fundo, texto, três destaques e a cor de erro. */
export type Palette = { bg: string; fg: string; accents: [string, string, string]; error: string };
/** Tema pronto tradicional, com a versão escura e a clara: quem escolhe entre as duas é o modo. */
export type Family = { id: string; label: string; dark: Palette; light: Palette };
export const FAMILIES: Family[] = [
  { id: 'github', label: 'GitHub',
    dark: { bg: '#0d1117', fg: '#e6edf3', accents: ['#58a6ff', '#bc8cff', '#3fb950'], error: '#f85149' },
    light: { bg: '#ffffff', fg: '#1f2328', accents: ['#0969da', '#8250df', '#1a7f37'], error: '#cf222e' } },
  { id: 'catppuccin', label: 'Catppuccin',
    dark: { bg: '#1e1e2e', fg: '#cdd6f4', accents: ['#cba6f7', '#89b4fa', '#a6e3a1'], error: '#f38ba8' },
    light: { bg: '#eff1f5', fg: '#4c4f69', accents: ['#8839ef', '#1e66f5', '#40a02b'], error: '#d20f39' } },
  { id: 'dracula', label: 'Dracula',
    dark: { bg: '#282a36', fg: '#f8f8f2', accents: ['#bd93f9', '#ff79c6', '#8be9fd'], error: '#ff5555' },
    light: { bg: '#fffbeb', fg: '#1f1f1f', accents: ['#644ac9', '#a3144d', '#036a96'], error: '#cb3a2a' } },
  { id: 'tokyo', label: 'Tokyo Night',
    dark: { bg: '#1a1b26', fg: '#c0caf5', accents: ['#7aa2f7', '#bb9af7', '#9ece6a'], error: '#f7768e' },
    light: { bg: '#e1e2e7', fg: '#343b58', accents: ['#2e7de9', '#9854f1', '#587539'], error: '#c64343' } },
  { id: 'nord', label: 'Nord',
    dark: { bg: '#2e3440', fg: '#eceff4', accents: ['#88c0d0', '#81a1c1', '#b48ead'], error: '#bf616a' },
    light: { bg: '#eceff4', fg: '#2e3440', accents: ['#5e81ac', '#4f7f8f', '#8a5f86'], error: '#b04a55' } },
  { id: 'gruvbox', label: 'Gruvbox',
    dark: { bg: '#282828', fg: '#ebdbb2', accents: ['#fabd2f', '#8ec07c', '#d3869b'], error: '#fb4934' },
    light: { bg: '#fbf1c7', fg: '#3c3836', accents: ['#b57614', '#427b58', '#8f3f71'], error: '#cc241d' } },
  { id: 'solarized', label: 'Solarized',
    dark: { bg: '#002b36', fg: '#93a1a1', accents: ['#268bd2', '#2aa198', '#b58900'], error: '#dc322f' },
    light: { bg: '#fdf6e3', fg: '#586e75', accents: ['#268bd2', '#2aa198', '#b58900'], error: '#dc322f' } },
  { id: 'rosepine', label: 'Rosé Pine',
    dark: { bg: '#191724', fg: '#e0def4', accents: ['#c4a7e7', '#ebbcba', '#9ccfd8'], error: '#eb6f92' },
    light: { bg: '#faf4ed', fg: '#575279', accents: ['#907aa9', '#d7827e', '#56949f'], error: '#b4637a' } },
  { id: 'monokai', label: 'Monokai',
    dark: { bg: '#272822', fg: '#f8f8f2', accents: ['#a6e22e', '#66d9ef', '#fd971f'], error: '#f92672' },
    light: { bg: '#fafafa', fg: '#272822', accents: ['#4f8a00', '#0089b3', '#c96a00'], error: '#e0145a' } },
];

/** Ponto de partida do "Seu tema", em que a pessoa escolhe cada cor. */
const CUSTOM_DEFAULT: { dark: Palette; light: Palette } = {
  dark: { bg: '#101014', fg: '#ececf1', accents: ['#8ab4f8', '#c58af9', '#81c995'], error: '#f2777a' },
  light: { bg: '#ffffff', fg: '#1f1f1f', accents: ['#1a73e8', '#9334e6', '#188038'], error: '#c5221f' },
};

/** Fontes: a do app, a do aparelho, uma com serifa e uma de largura fixa. */
export const FONTS = {
  padrao: "'Google Sans Flex', 'Google Sans', system-ui, sans-serif",
  sistema: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serifa: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
  mono: "ui-monospace, 'JetBrains Mono', 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
};

export type Prefs = {
  /** "dinamico" (tudo sai de uma cor), "custom" (a pessoa escolhe cada cor) ou o id de um tema pronto de FAMILIES. */
  theme: string;
  style: Style;
  /** 0 = padrão · 1 = médio · 2 = alto */
  contrast: 0 | 1 | 2;
  /** Fundo: com um toque da cor do tema, cinza neutro, ou puro (preto no escuro, branco no claro). */
  bg: 'tinted' | 'neutral' | 'pure';
  shape: 'round' | 'soft' | 'sharp';
  text: 'sm' | 'md' | 'lg';
  font: keyof typeof FONTS;
  /** Saturação das cores das matérias; "none" deixa todas em cinza. */
  subjects: 'none' | 'soft' | 'normal' | 'vivid';
  reduceMotion: boolean;
  custom: { dark: Palette; light: Palette };
};

export const DEFAULT_PREFS: Prefs = {
  theme: 'dinamico', style: 'tonal', contrast: 0, bg: 'tinted', shape: 'round', text: 'md', font: 'padrao', subjects: 'normal', reduceMotion: false, custom: CUSTOM_DEFAULT,
};

/** A paleta fixa em uso (tema pronto ou "Seu tema"), ou null no tema dinâmico. */
export function paletteOf(prefs: Prefs, dark: boolean): Palette | null {
  if (prefs.theme === 'custom') return prefs.custom[dark ? 'dark' : 'light'];
  return FAMILIES.find((f) => f.id === prefs.theme)?.[dark ? 'dark' : 'light'] ?? null;
}

const SHAPE = { round: 1, soft: 0.6, sharp: 0.22 };
const TEXT = { sm: 0.94, md: 1, lg: 1.08 };
/** Teto de saturação das cores das matérias: [claro, escuro]. */
const CHROMA = { soft: [28, 20], normal: [48, 32], vivid: [72, 48] };
/** Sem cor, as matérias se distinguem pelo tom de cinza: [cor, contêiner] de cada uma, no claro e no escuro. */
const GRAYS = {
  light: [[25, 92], [35, 88], [45, 84], [30, 90], [40, 86], [50, 82]],
  dark: [[92, 36], [82, 30], [72, 24], [87, 33], [77, 27], [67, 21]],
};
const STATUS = ['success', 'warning'];

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

/** Papéis de cor do M3 a partir do fundo, do texto e de três destaques de uma paleta fixa. */
function paletteVars(c: Palette, dark: boolean, pure: boolean): Record<string, string> {
  const black = '#000000', white = '#ffffff';
  const bg = pure ? (dark ? black : white) : c.bg;
  const fg = c.fg;
  const accent = (name: string, hex: string) => ({
    [`--md-${name}`]: hex,
    [`--md-on-${name}`]: onColor(hex),
    [`--md-${name}-container`]: mix(bg, hex, dark ? 0.32 : 0.2),
    [`--md-on-${name}-container`]: dark ? mix(hex, white, 0.55) : mix(hex, black, 0.55),
  });
  const ladder = dark ? [0.04, 0.07, 0.1, 0.14] : [0.025, 0.05, 0.08, 0.11];
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

/** Papéis que formam o fundo e o texto neutro: são os que o ajuste "Fundo" mexe. */
const NEUTRALS = ['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high',
  'surface-container-highest', 'on-surface', 'on-surface-variant', 'outline', 'outline-variant', 'inverse-surface', 'inverse-on-surface'];

export const seedHex = (seed: string) => (seed.startsWith('#') ? seed : SEEDS.find((s) => s.id === seed)?.hex ?? SEEDS[0].hex);

export function buildVars(seedHexValue: string, dark: boolean, prefs: Prefs = DEFAULT_PREFS): Record<string, string> {
  const pal = paletteOf(prefs, dark);
  const mono = !pal && prefs.style === 'mono';
  const source = argbFromHex(pal ? pal.accents[0] : seedHexValue);
  const scheme = new SCHEMES[pal ? 'tonal' : prefs.style](Hct.fromInt(source), dark, prefs.contrast / 2, '2025');
  const vars: Record<string, string> = {};
  for (const [name, role] of Object.entries(ROLES)) vars[`--md-${name}`] = hexFromArgb(role.getArgb(scheme));

  if (dark) {
    // O M3 de 2025 deixa alguns contêineres claros mesmo no escuro (o terciário, e os outros conforme o estilo e o contraste):
    // viram blocos pastel no meio da tela escura. Aqui todos descem para um tom escuro da própria cor.
    const palettes = { primary: scheme.primaryPalette, secondary: scheme.secondaryPalette, tertiary: scheme.tertiaryPalette, error: scheme.errorPalette };
    for (const [name, p] of Object.entries(palettes)) {
      if (Hct.fromInt(argbFromHex(vars[`--md-${name}-container`])).tone <= 50) continue;
      vars[`--md-${name}-container`] = hexFromArgb(p.tone(prefs.contrast ? 24 : 30));
      vars[`--md-on-${name}-container`] = hexFromArgb(p.tone(prefs.contrast ? 95 : 90));
    }
  }

  if (pal) Object.assign(vars, paletteVars(pal, dark, prefs.bg === 'pure' && prefs.theme !== 'custom'));
  else if (prefs.bg === 'neutral') {
    // Mesmos tons, sem o toque de cor do tema
    for (const name of NEUTRALS) {
      const h = Hct.fromInt(argbFromHex(vars[`--md-${name}`]));
      vars[`--md-${name}`] = hexFromArgb(Hct.from(h.hue, 0, h.tone).toInt());
    }
  } else if (prefs.bg === 'pure') {
    // Preto (ou branco) puro no fundo; os contêineres sobem em degraus curtos para ainda dar relevo
    const n = scheme.neutralPalette;
    const steps = dark ? [0, 4, 7, 10, 14] : [100, 97.5, 95.5, 93.5, 91];
    const [base, ...rest] = steps.map((t) => hexFromArgb(n.tone(t)));
    Object.assign(vars, {
      '--md-surface': base, '--md-surface-container-lowest': base, [dark ? '--md-surface-dim' : '--md-surface-bright']: base,
      '--md-surface-container-low': rest[0], '--md-surface-container': rest[1], '--md-surface-container-high': rest[2], '--md-surface-container-highest': rest[3],
    });
  }

  // No monocromático nada tem cor: matérias e status ficam em cinza (só o erro continua vermelho)
  const subjects = mono ? 'none' : prefs.subjects;
  const gray = TonalPalette.fromHueAndChroma(0, 0);
  // Com mais contraste, as cores das matérias também se afastam do fundo
  const shift = prefs.contrast * 4;
  Object.entries(CUSTOM).forEach(([name, hex], i) => {
    const status = STATUS.includes(name);
    let p: TonalPalette, color: number, container: number;
    if (status ? mono : subjects === 'none') {
      p = gray;
      [color, container] = status ? (dark ? [name === 'success' ? 90 : 70, name === 'success' ? 32 : 24] : [name === 'success' ? 30 : 50, name === 'success' ? 90 : 84]) : GRAYS[dark ? 'dark' : 'light'][i];
    } else {
      const hct = Hct.fromInt(Blend.harmonize(argbFromHex(hex), source));
      // Saturação limitada para as cores não brigarem com o tema (mais contida no escuro)
      const cap = CHROMA[status || subjects === 'none' ? 'normal' : subjects][dark ? 1 : 0];
      p = TonalPalette.fromHueAndChroma(hct.hue, Math.min(hct.chroma, cap));
      [color, container] = dark ? [80 + shift / 2, 30] : [45 - shift, 90];
    }
    vars[`--c-${name}`] = hexFromArgb(p.tone(color));
    vars[`--c-${name}-on`] = hexFromArgb(p.tone(dark ? 20 : 100));
    vars[`--c-${name}-container`] = hexFromArgb(p.tone(container));
    vars[`--c-${name}-on-container`] = hexFromArgb(p.tone(dark ? 90 + shift / 2 : 10));
  });

  vars['--shape'] = String(SHAPE[prefs.shape]);
  vars['--text-scale'] = String(TEXT[prefs.text]);
  vars['--app-font'] = FONTS[prefs.font];
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
migrate();
let state: State = read();
const subs = new Set<() => void>();

/** Converte o que versões antigas salvaram: "Preto puro", o tema Preto e os temas presos a um modo ("github-dark"). */
function migrate() {
  try {
    const raw = JSON.parse(localStorage.getItem(K.prefs) || 'null');
    if (!raw || 'font' in raw) return;
    const fixed = /^(.+)-(dark|light)$/.exec(raw.theme ?? '');
    let mode: Mode | undefined;
    if (raw.theme === 'preto') { raw.theme = 'dinamico'; raw.bg = 'pure'; mode = 'dark'; }
    else if (fixed) { raw.theme = fixed[1]; mode = fixed[2] as Mode; }
    else if (['dracula', 'nord', 'monokai'].includes(raw.theme)) mode = 'dark';
    if (raw.amoled) raw.bg = 'pure';
    delete raw.amoled;
    raw.font = DEFAULT_PREFS.font;
    localStorage.setItem(K.prefs, JSON.stringify(raw));
    if (mode) localStorage.setItem(K.mode, mode);
  } catch { /* storage bloqueado */ }
}

function read(): State {
  let mode: Mode = 'dark', seed: string = SEEDS[0].id, prefs = DEFAULT_PREFS;
  try {
    // Sem escolha salva, o app abre no escuro
    mode = (localStorage.getItem(K.mode) as Mode) || 'dark';
    seed = localStorage.getItem(K.seed) || SEEDS[0].id;
    const raw = JSON.parse(localStorage.getItem(K.prefs) || '{}');
    prefs = { ...DEFAULT_PREFS, ...raw, custom: { dark: { ...CUSTOM_DEFAULT.dark, ...raw.custom?.dark }, light: { ...CUSTOM_DEFAULT.light, ...raw.custom?.light } } };
  } catch { /* storage bloqueado */ }
  // Valor que não existe mais (versão antiga ou armazenamento mexido) volta ao padrão
  if (!SCHEMES[prefs.style]) prefs = { ...prefs, style: 'tonal' };
  if (!FONTS[prefs.font]) prefs = { ...prefs, font: 'padrao' };
  if (!['tinted', 'neutral', 'pure'].includes(prefs.bg)) prefs = { ...prefs, bg: 'tinted' };
  if (!['none', 'soft', 'normal', 'vivid'].includes(prefs.subjects)) prefs = { ...prefs, subjects: 'normal' };
  if (prefs.theme !== 'dinamico' && prefs.theme !== 'custom' && !FAMILIES.some((f) => f.id === prefs.theme)) prefs = { ...prefs, theme: 'dinamico' };
  const dark = mode === 'dark' || (mode === 'system' && !!media?.matches);
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
/** Aceita o id de uma cor pronta ou um hexadecimal ("#rrggbb") escolhido à mão. */
export const setSeed = (id: string) => set(K.seed, id);
export const setPref = <P extends keyof Prefs>(key: P, value: Prefs[P]) => set(K.prefs, JSON.stringify({ ...state.prefs, [key]: value }));
/** Volta cor, estilo e ajustes ao padrão (o modo claro/escuro fica como está). */
export const resetTheme = () => { try { localStorage.removeItem(K.seed); } catch { /* ok */ } set(K.prefs, JSON.stringify(DEFAULT_PREFS)); };
/** Alterna claro/escuro com um toque (sai do modo "sistema"). */
export const toggleDark = () => setMode(state.dark ? 'light' : 'dark');
/** Troca uma cor do "Seu tema" no modo dado; `accent` é a posição entre os três destaques. */
export function setCustomColor(dark: boolean, key: 'bg' | 'fg' | 'error' | 0 | 1 | 2, hex: string) {
  const k = dark ? 'dark' : 'light';
  const cur = state.prefs.custom[k];
  const next: Palette = typeof key === 'number' ? { ...cur, accents: cur.accents.map((c, i) => (i === key ? hex : c)) as Palette['accents'] } : { ...cur, [key]: hex };
  setPref('custom', { ...state.prefs.custom, [k]: next });
}

media?.addEventListener('change', () => { if (state.mode === 'system') applyTheme(); });

export function useThemeState() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);
}
