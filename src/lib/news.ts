// "Desde a sua última visita": compara o boletim/mensagens atuais com um retrato salvo no aparelho.
import { session } from './api';
import type { Mensagem, Subject } from './suap';

type SubjectSnap = { name: string; grades: (number | null)[]; finalExam: number | null; absences: number; status: string };
type Snapshot = { at: number; subjects: Record<string, SubjectSnap>; msgs: number[] };

export type NewsItem =
  | { kind: 'grade'; code: string; subject: string; stage: number; value: number }
  | { kind: 'final'; code: string; subject: string; value: number }
  | { kind: 'absence'; code: string; subject: string; delta: number }
  | { kind: 'status'; code: string; subject: string; status: string }
  | { kind: 'message'; count: number; from: string };

const key = () => `supaco:news:${session.user}`;

export function loadSnapshot(): Snapshot | null {
  try { return JSON.parse(localStorage.getItem(key()) || 'null'); } catch { return null; }
}

export function saveSnapshot(subjects: Subject[], msgs: Mensagem[] | undefined) {
  const prev = loadSnapshot();
  const snap: Snapshot = {
    at: Date.now(),
    // Mantém matérias de outros períodos que já estavam salvas
    subjects: { ...prev?.subjects, ...Object.fromEntries(subjects.map((s) => [s.code, { name: s.name, grades: s.grades.map((g, i) => (s.partial?.[i] ? null : g)), finalExam: s.finalExam, absences: s.absences, status: s.status }])) },
    msgs: msgs ? msgs.map((m) => m.id) : prev?.msgs ?? [],
  };
  try { localStorage.setItem(key(), JSON.stringify(snap)); } catch { /* quota */ }
}

export function diffNews(prev: Snapshot, subjects: Subject[], msgs: Mensagem[] | undefined): NewsItem[] {
  const out: NewsItem[] = [];
  subjects.forEach((s) => {
    const p = prev.subjects[s.code];
    if (!p) return;
    s.grades.forEach((g, i) => { if (g !== null && !s.partial?.[i] && p.grades[i] == null) out.push({ kind: 'grade', code: s.code, subject: s.name, stage: i + 1, value: g }); });
    if (s.finalExam !== null && p.finalExam === null) out.push({ kind: 'final', code: s.code, subject: s.name, value: s.finalExam });
    if (s.absences > p.absences) out.push({ kind: 'absence', code: s.code, subject: s.name, delta: s.absences - p.absences });
    if (s.status && p.status && s.status !== p.status && !/cursando/i.test(s.status)) out.push({ kind: 'status', code: s.code, subject: s.name, status: s.status });
  });
  if (msgs && prev.msgs.length) {
    const seen = new Set(prev.msgs);
    const fresh = msgs.filter((m) => !seen.has(m.id) && !m.registro_leitura);
    if (fresh.length) out.push({ kind: 'message', count: fresh.length, from: fresh[0].remetente?.nome ?? '' });
  }
  return out;
}
