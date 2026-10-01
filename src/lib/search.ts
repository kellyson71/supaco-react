// Motor da busca global: normalização, pontuação, autocompletar e itens recentes.
import { session } from './api';
import type { Tone } from './tones';

export type SearchGroup = 'paginas' | 'acoes' | 'materias' | 'prazos' | 'aulas' | 'pessoas' | 'materiais' | 'mensagens' | 'campus' | 'feriados';

export const GROUP_LABEL: Record<SearchGroup, string> = {
  paginas: 'Ir para', acoes: 'Ações', materias: 'Matérias', prazos: 'Prazos', aulas: 'Aulas',
  pessoas: 'Pessoas', materiais: 'Materiais', mensagens: 'Mensagens', campus: 'Campus', feriados: 'Feriados',
};

export type PreviewRow = { icon: string; label: string; value: string };

export type SearchItem = {
  id: string;
  group: SearchGroup;
  title: string;
  sub?: string;
  /** Texto extra que entra na busca mas não aparece (sinônimos, conteúdo, etc.). */
  keywords?: string;
  icon: string;
  tone?: Tone;
  photo?: string;
  /** Informação curta à direita (nota, data, contagem). */
  meta?: string;
  metaTone?: 'error' | 'warning' | 'success';
  to?: string;
  href?: string;
  run?: () => void;
  preview?: { text?: string; rows?: PreviewRow[] };
  /** Empurra o item para cima em empates (ex.: o que é de hoje). */
  boost?: number;
};

/** Minúsculas e sem acento, mantendo o mesmo comprimento do texto original. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isWordStart = (text: string, i: number) => i === 0 || /[\s\-_/.,:()]/.test(text[i - 1]);

/** Letras do termo aparecem em ordem no texto (tolerância a digitação incompleta). */
function subsequence(text: string, token: string) {
  let i = 0;
  for (const ch of text) if (ch === token[i]) i++;
  return i === token.length;
}

function tokenScore(title: string, rest: string, token: string): number {
  if (title === token) return 100;
  const at = title.indexOf(token);
  if (at === 0) return 80;
  if (at > 0) {
    for (let i = at; i !== -1; i = title.indexOf(token, i + 1)) if (isWordStart(title, i)) return 60;
    return 40;
  }
  const r = rest.indexOf(token);
  if (r !== -1) {
    for (let i = r; i !== -1; i = rest.indexOf(token, i + 1)) if (isWordStart(rest, i)) return 25;
    return 15;
  }
  if (token.length >= 3 && subsequence(title, token)) return 8;
  return 0;
}

export type Scored = { item: SearchItem; score: number };

type Indexed = { item: SearchItem; title: string; rest: string };

/** Normaliza uma vez só; a cada tecla a busca só compara texto. */
export const buildIndex = (items: SearchItem[]): Indexed[] =>
  items.map((item) => ({ item, title: norm(item.title), rest: norm(`${item.sub ?? ''} ${item.keywords ?? ''}`) }));

export function search(index: Indexed[], query: string): Scored[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const full = tokens.join(' ');
  const out: Scored[] = [];
  for (const { item, title, rest } of index) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const s = tokenScore(title, rest, t);
      if (!s) { ok = false; break; }
      score += s;
    }
    if (!ok) continue;
    // Frase inteira no começo do título vale mais que os termos soltos
    if (tokens.length > 1 && title.startsWith(full)) score += 40;
    out.push({ item, score: score / tokens.length + (item.boost ?? 0) });
  }
  out.sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length);
  // Com resultado bom no topo, os aproximados (letras em ordem) só fazem ruído
  return out[0]?.score >= 40 ? out.filter((r) => r.score >= 15) : out;
}

/** Trechos do título que batem com a busca, para destacar. */
export function matchRanges(title: string, query: string): [number, number][] {
  const t = norm(title);
  if (t.length !== title.length) return [];
  const ranges: [number, number][] = [];
  for (const token of norm(query).split(/\s+/).filter(Boolean)) {
    let at = -1;
    for (let i = t.indexOf(token); i !== -1; i = t.indexOf(token, i + 1)) {
      if (at === -1) at = i;
      if (isWordStart(t, i)) { at = i; break; }
    }
    if (at !== -1) ranges.push([at, at + token.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/**
 * Sugestão de autocompletar: o resto do título do melhor resultado que começa com o que foi digitado,
 * ou o resto da palavra que o último termo inicia.
 */
export function completion(results: Scored[], query: string): string {
  if (!query.trim() || query !== query.trimStart()) return '';
  const q = norm(query);
  for (const { item } of results.slice(0, 6)) {
    const t = norm(item.title);
    if (t.length === item.title.length && t.startsWith(q) && t.length > q.length) return item.title.slice(q.length);
  }
  if (query.endsWith(' ')) return '';
  const last = q.split(/\s+/).pop()!;
  if (last.length < 2) return '';
  for (const { item } of results.slice(0, 6)) {
    const t = norm(item.title);
    if (t.length !== item.title.length) continue;
    for (let i = t.indexOf(last); i !== -1; i = t.indexOf(last, i + 1)) {
      if (!isWordStart(t, i)) continue;
      const end = t.slice(i).search(/[\s\-_/.,:()]/);
      const word = item.title.slice(i, end === -1 ? undefined : i + end);
      if (word.length > last.length) return word.slice(last.length);
    }
  }
  return '';
}

// ---------- Recentes ----------

const recentKey = () => `supaco:search:${session.user}`;

export function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(recentKey()) || '[]'); } catch { return []; }
}

export function pushRecent(id: string) {
  try { localStorage.setItem(recentKey(), JSON.stringify([id, ...loadRecent().filter((x) => x !== id)].slice(0, 6))); } catch { /* quota */ }
}
