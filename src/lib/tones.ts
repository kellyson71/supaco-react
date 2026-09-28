// Cor por matéria: cores "custom" do M3 harmonizadas com o tema (variáveis --c-* geradas em theme.ts).

export type Tone = 'pink' | 'teal' | 'yellow' | 'lilac' | 'orange' | 'sky';

type ToneClasses = { color: string; on: string; container: string; onContainer: string; text: string; varColor: string; varContainer: string };

// Classes literais para o Tailwind encontrar no build
export const TONES: Record<Tone, ToneClasses> = {
  pink:   { color: 'bg-[var(--c-pink)]',   on: 'text-[var(--c-pink-on)]',   container: 'bg-[var(--c-pink-container)]',   onContainer: 'text-[var(--c-pink-on-container)]',   text: 'text-[var(--c-pink)]',   varColor: 'var(--c-pink)',   varContainer: 'var(--c-pink-container)' },
  teal:   { color: 'bg-[var(--c-teal)]',   on: 'text-[var(--c-teal-on)]',   container: 'bg-[var(--c-teal-container)]',   onContainer: 'text-[var(--c-teal-on-container)]',   text: 'text-[var(--c-teal)]',   varColor: 'var(--c-teal)',   varContainer: 'var(--c-teal-container)' },
  yellow: { color: 'bg-[var(--c-yellow)]', on: 'text-[var(--c-yellow-on)]', container: 'bg-[var(--c-yellow-container)]', onContainer: 'text-[var(--c-yellow-on-container)]', text: 'text-[var(--c-yellow)]', varColor: 'var(--c-yellow)', varContainer: 'var(--c-yellow-container)' },
  lilac:  { color: 'bg-[var(--c-lilac)]',  on: 'text-[var(--c-lilac-on)]',  container: 'bg-[var(--c-lilac-container)]',  onContainer: 'text-[var(--c-lilac-on-container)]',  text: 'text-[var(--c-lilac)]',  varColor: 'var(--c-lilac)',  varContainer: 'var(--c-lilac-container)' },
  orange: { color: 'bg-[var(--c-orange)]', on: 'text-[var(--c-orange-on)]', container: 'bg-[var(--c-orange-container)]', onContainer: 'text-[var(--c-orange-on-container)]', text: 'text-[var(--c-orange)]', varColor: 'var(--c-orange)', varContainer: 'var(--c-orange-container)' },
  sky:    { color: 'bg-[var(--c-sky)]',    on: 'text-[var(--c-sky-on)]',    container: 'bg-[var(--c-sky-container)]',    onContainer: 'text-[var(--c-sky-on-container)]',    text: 'text-[var(--c-sky)]',    varColor: 'var(--c-sky)',    varContainer: 'var(--c-sky-container)' },
};

export const TONE_ORDER: Tone[] = ['teal', 'pink', 'yellow', 'lilac', 'orange', 'sky'];

export function toneFor(code: string): Tone {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONE_ORDER[h % TONE_ORDER.length];
}
