// Catálogo dos memes do modo zueira: cada um é classificado por situação do aluno.
import { canSkip } from './insights';
import { overallAverage, PASS } from './grades';
import { classesOn, nowMin, toMin, WEEKDAYS } from './schedule';
import { daysBetween, isoDay, parseDay } from './dates';
import { aulaMatchesSubject, type Aula, type Calendario, type Subject } from './suap';
import type { AttendanceCheck } from './attendance';

export type Situation =
  | 'estourou' | 'zerou' | 'falta' | 'no-limite' | 'pode-faltar' | 'dia-livre'
  | 'cansado' | 'fim-proximo' | 'nota-baixa' | 'mandando-bem' | 'fim-longe';

/** Nome de cada classificação e o tom do selo. */
export const SITUATION: Record<Situation, { label: string; tone: 'error' | 'warning' | 'success' | 'neutral' }> = {
  estourou: { label: 'Passou do limite', tone: 'error' },
  zerou: { label: 'Faltas zeradas', tone: 'error' },
  falta: { label: 'Levou falta', tone: 'error' },
  'no-limite': { label: 'No limite', tone: 'warning' },
  'pode-faltar': { label: 'Pode faltar', tone: 'success' },
  'dia-livre': { label: 'Dia livre', tone: 'neutral' },
  cansado: { label: 'Dia puxado', tone: 'neutral' },
  'fim-proximo': { label: 'Reta final', tone: 'warning' },
  'nota-baixa': { label: 'Nota baixa', tone: 'error' },
  'mandando-bem': { label: 'Mandando bem', tone: 'success' },
  'fim-longe': { label: 'Longe do fim', tone: 'neutral' },
};

export type Meme = { id: string; caption: string; when: Situation[] };

export const MEMES: Meme[] = [
  { id: 'falte-aula-filho', caption: 'falte aula filho', when: ['pode-faltar'] },
  { id: 'falte-meu-filho', caption: 'falte meu filho', when: ['pode-faltar'] },
  { id: 'falte-amanha', caption: 'FALTE AMANHÃ', when: ['pode-faltar'] },
  { id: 'caralho', caption: 'Caralho', when: ['falta', 'nota-baixa'] },
  { id: 'senhor-cinema', caption: '"puta que pariu" — senhor cinema', when: ['falta', 'nota-baixa'] },
  { id: 'fim-nao-esta-proximo', caption: 'o fim não está próximo', when: ['fim-longe'] },
  { id: 'fim-esta-proximo', caption: 'O fim está próximo', when: ['fim-proximo'] },
  { id: 'reflita', caption: 'REFLITA', when: ['no-limite'] },
  { id: 'alem-do-infinito', caption: 'você foi além do infinito, bro', when: ['estourou'] },
  { id: 'arrogante', caption: 'arrogante', when: ['mandando-bem'] },
  { id: 'nao-sobrou-nada', caption: 'NÃO SOBROU NADA', when: ['zerou'] },
  { id: 'baixo-em-disposicao', caption: 'baixo em disposição', when: ['dia-livre'] },
  { id: 'to-cansado-pai', caption: 'to cansado, pai', when: ['cansado'] },
];

export const memeSrc = (id: string) => `/memes/${id}.webp`;

export type Moment = { situation: Situation; text: string; meme: Meme };

type Ctx = { subjects: Subject[]; now: Date; aulas?: Aula[]; checks?: AttendanceCheck[]; cal?: Calendario | null; holiday?: boolean };

/** Situações que valem agora, da mais urgente para a mais leve, cada uma com um meme. */
export function moments({ subjects, now, aulas, checks, cal, holiday }: Ctx): Moment[] {
  const found: { situation: Situation; text: string }[] = [];
  const today = isoDay(now);
  const mm = nowMin(now);

  const over = subjects.filter((s) => s.limit > 0 && s.absences > s.limit).sort((a, b) => (b.absences - b.limit) - (a.absences - a.limit))[0];
  if (over) found.push({ situation: 'estourou', text: `${over.name}: ${over.absences - over.limit} ${over.absences - over.limit === 1 ? 'falta' : 'faltas'} além do limite.` });

  const zero = subjects.find((s) => s.limit > 0 && s.absences === s.limit);
  if (zero) found.push({ situation: 'zerou', text: `${zero.name}: acabaram as faltas que você podia ter.` });

  const absent = subjects.find((s) => aulas?.some((a) => a.data === today && a.faltas > 0 && aulaMatchesSubject(a, s)) || checks?.some((c) => c.code === s.code && c.date === today && c.status === 'absent'));
  if (absent) found.push({ situation: 'falta', text: `Falta registrada hoje em ${absent.name}.` });

  // Posso faltar: hoje se ainda tem aula pela frente, senão o próximo dia com aula
  const classes = holiday ? [] : classesOn(subjects, now.getDay());
  const left = classes.some((c) => toMin(c.end) > mm);
  let day = now.getDay(), when = 'hoje';
  if (!left) {
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      if (classesOn(subjects, d.getDay()).length) { day = d.getDay(); when = i === 1 ? 'amanhã' : WEEKDAYS[day].toLowerCase(); break; }
    }
  }
  const skip = canSkip(subjects, day);
  if (skip.verdict === 'no' || skip.verdict === 'tight') {
    const w = skip.items[0];
    found.push({ situation: 'no-limite', text: skip.verdict === 'no' ? `Faltar ${when} estoura o limite de ${w.s.name}.` : `Faltar ${when} deixa ${w.s.name} com ${w.leftAfter} ${w.leftAfter === 1 ? 'falta livre' : 'faltas livres'}.` });
  } else if (skip.verdict === 'yes') {
    found.push({ situation: 'pode-faltar', text: `Dá para faltar ${when} com folga em todas as matérias.` });
  }

  if (!classes.length) found.push({ situation: 'dia-livre', text: holiday ? 'Feriado: sem aula hoje.' : 'Sem aula hoje.' });

  const lessons = classes.reduce((n, c) => n + c.lessons, 0);
  if (lessons >= 5) found.push({ situation: 'cansado', text: `${lessons} aulas hoje.` });

  const end = parseDay(cal?.data_fim);
  const daysLeft = end ? daysBetween(now, end) : null;
  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 21) found.push({ situation: 'fim-proximo', text: daysLeft === 0 ? 'O semestre acaba hoje.' : `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} para o fim do semestre.` });

  const avg = overallAverage(subjects);
  if (avg !== null && avg < PASS) found.push({ situation: 'nota-baixa', text: `Média geral em ${Math.round(avg)}, abaixo de ${PASS}.` });
  if (avg !== null && avg >= 85) found.push({ situation: 'mandando-bem', text: `Média geral em ${Math.round(avg)}.` });

  if (daysLeft !== null && daysLeft > 45) found.push({ situation: 'fim-longe', text: `Ainda faltam ${daysLeft} dias de semestre.` });

  // Quando a situação tem mais de um meme, alterna por dia para não repetir sempre o mesmo
  const seed = Math.floor(now.getTime() / 86_400_000);
  return found.map(({ situation, text }) => {
    const options = MEMES.filter((m) => m.when.includes(situation));
    return { situation, text, meme: options[seed % options.length] };
  });
}
