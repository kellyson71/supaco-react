// Cálculos do semestre a partir das aulas lançadas: presença por dia, sequências, retrospectiva e formatura.
import { aulaMatchesSubject, type Aula, type DadosAluno, type Periodo, type Requisitos, type Subject } from './suap';
import { parseDay } from './dates';

// ---------- Presença por dia ----------

export type DayPresence = { date: string; lessons: number; absences: number };

export function presenceByDay(aulas: Aula[]): DayPresence[] {
  const map = new Map<string, DayPresence>();
  aulas.forEach((a) => {
    const d = map.get(a.data) ?? { date: a.data, lessons: 0, absences: 0 };
    d.lessons += a.qtd_aulas;
    d.absences += a.faltas;
    map.set(a.data, d);
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Sequências de dias de aula sem nenhuma falta: a atual (até o último dia) e a melhor. */
export function streaks(days: DayPresence[]) {
  let run = 0, best = 0;
  days.forEach((d) => { run = d.absences === 0 ? run + 1 : 0; best = Math.max(best, run); });
  return { current: run, best };
}

// ---------- Retrospectiva ----------

const STOP = new Set(('aula aulas atividade atividades continuação continuacao introdução introducao apresentação apresentacao ' +
  'sobre para com dos das nas nos uma um de da do em e o a os as ao aos à às por pela pelo entre como ' +
  'parte prática pratica exercícios exercicios exercício exercicio revisão revisao conteúdo conteudo avaliação avaliacao ' +
  'projeto acompanhamento desenvolvimento disciplina estudo estudos resolução resolucao lista listas correção correcao ' +
  'semana dia aplicação aplicacao conceitos conceito básico basico básicos basicos geral início inicio').split(' '));

export type Retro = {
  lessons: number; absences: number; presence: number; days: number;
  best: { s: Subject; presence: number } | null;
  worst: { s: Subject; absences: number } | null;
  weekday: { day: number; absences: number } | null;
  streak: { current: number; best: number };
  words: { word: string; count: number }[];
  topGrade: { s: Subject; grade: number } | null;
  firstDay: string | null;
};

export function retrospective(aulas: Aula[], subjects: Subject[]): Retro {
  const days = presenceByDay(aulas);
  const lessons = days.reduce((a, d) => a + d.lessons, 0);
  const absences = days.reduce((a, d) => a + d.absences, 0);

  const per = subjects.map((s) => {
    const mine = aulas.filter((a) => aulaMatchesSubject(a, s));
    const l = mine.reduce((a, x) => a + x.qtd_aulas, 0);
    const f = mine.reduce((a, x) => a + x.faltas, 0);
    return { s, lessons: l, absences: f, presence: l ? (l - f) / l : 1 };
  }).filter((x) => x.lessons > 0);

  const byPresence = [...per].sort((a, b) => b.presence - a.presence || b.lessons - a.lessons);
  const byAbsence = [...per].sort((a, b) => b.absences - a.absences);

  const perWeekday = new Map<number, number>();
  days.forEach((d) => {
    const wd = parseDay(d.date)?.getDay();
    if (wd !== undefined && d.absences) perWeekday.set(wd, (perWeekday.get(wd) ?? 0) + d.absences);
  });
  const wd = [...perWeekday.entries()].sort((a, b) => b[1] - a[1])[0];

  const counts = new Map<string, { word: string; count: number }>();
  aulas.forEach((a) => {
    (a.conteudo ?? '').split(/[^\p{L}\p{N}#+.]+/u).forEach((raw) => {
      const w = raw.replace(/\.+$/, '');
      const key = w.toLowerCase();
      if (w.length < 3 || STOP.has(key) || /^\d+$/.test(w)) return;
      const c = counts.get(key) ?? { word: w, count: 0 };
      c.count += 1;
      // Prefere a grafia com maiúscula ("Django" em vez de "django")
      if (/^\p{Lu}/u.test(w) && !/^\p{Lu}/u.test(c.word)) c.word = w;
      counts.set(key, c);
    });
  });
  const words = [...counts.values()].filter((w) => w.count > 1).sort((a, b) => b.count - a.count).slice(0, 8);

  const graded = subjects.flatMap((s) => s.grades.filter((g): g is number => g !== null).map((g) => ({ s, grade: g })));
  const topGrade = graded.sort((a, b) => b.grade - a.grade)[0] ?? null;

  return {
    lessons, absences, days: days.length,
    presence: lessons ? (lessons - absences) / lessons : 1,
    best: byPresence[0] ? { s: byPresence[0].s, presence: byPresence[0].presence } : null,
    worst: byAbsence[0]?.absences ? { s: byAbsence[0].s, absences: byAbsence[0].absences } : null,
    weekday: wd ? { day: wd[0], absences: wd[1] } : null,
    streak: streaks(days),
    words,
    topGrade,
    firstDay: days[0]?.date ?? null,
  };
}

// ---------- Previsão de formatura ----------

const semIndex = (ano: number, periodo: number) => ano * 2 + (periodo - 1);
const semLabel = (i: number) => `${Math.floor(i / 2)}.${(i % 2) + 1}`;

export type Forecast = {
  pace: number; // horas por semestre concluído
  remaining: number; // semestres, contando o atual
  forecast: string; // ex.: "2029.1"
  nominal: string | null; // pela matriz: ingresso + qtd_periodos
  paceForNominal: number | null; // horas/semestre para terminar no prazo da matriz
  lateBy: number; // semestres além do prazo (0 = no prazo)
};

export function graduationForecast(req: Requisitos, periods: Periodo[], aluno: DadosAluno | undefined): Forecast | null {
  const current = periods[0];
  const completed = periods.length - 1;
  const done = req.totais.ch_cumprida;
  const pending = req.totais.ch_pendente;
  if (!current || completed < 1 || done <= 0) return null;

  const pace = done / completed;
  const remaining = pending <= 0 ? 0 : Math.max(1, Math.ceil(pending / pace));
  const now = semIndex(current.ano, current.periodo);
  const end = now + Math.max(remaining - 1, 0);

  const ing = aluno?.ingresso.match(/(\d{4})\D+(\d)/);
  const nominalIdx = ing && aluno?.qtd_periodos ? semIndex(+ing[1], +ing[2]) + aluno.qtd_periodos - 1 : null;
  const left = nominalIdx !== null ? nominalIdx - now + 1 : null;

  return {
    pace: Math.round(pace),
    remaining,
    forecast: semLabel(end),
    nominal: nominalIdx !== null ? semLabel(nominalIdx) : null,
    paceForNominal: left && left > 0 ? Math.ceil(pending / left) : null,
    lateBy: nominalIdx !== null ? Math.max(0, end - nominalIdx) : 0,
  };
}
