// Modo zueira: a resposta de "posso faltar a próxima aula?" e as reações do dia, cada uma com um meme.
import { overallAverage, PASS } from './grades';
import { classesOn, nowMin, toMin, WEEKDAYS, type ClassItem } from './schedule';
import { daysBetween, isoDay, parseDay } from './dates';
import { aulaMatchesSubject, type Aula, type Calendario, type Subject } from './suap';
import type { AttendanceCheck } from './attendance';

export const memeSrc = (id: string) => `/memes/${id}.webp`;

/** Todos os memes, com o texto que já está na imagem (só para leitor de tela). */
export const MEMES: Record<string, string> = {
  'falte-aula-filho': 'falte aula filho', 'falte-meu-filho': 'falte meu filho', 'falte-amanha': 'falte amanhã',
  caralho: 'caralho', 'senhor-cinema': 'puta que pariu, senhor cinema', 'fim-nao-esta-proximo': 'o fim não está próximo',
  'fim-esta-proximo': 'o fim está próximo', reflita: 'reflita', 'alem-do-infinito': 'você foi além do infinito, bro',
  arrogante: 'arrogante', 'nao-sobrou-nada': 'não sobrou nada', 'baixo-em-disposicao': 'baixo em disposição', 'to-cansado-pai': 'to cansado, pai',
};

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/** Escolhe uma opção que muda de um dia para o outro, mas não a cada render. */
const pick = <T,>(list: T[], now: Date, salt: string) => list[(Math.floor(now.getTime() / 86_400_000) + hash(salt)) % list.length];
const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;

// ---------- Posso faltar a próxima aula? ----------

export type SkipVerdict = 'pode' | 'reflita' | 'zerou' | 'estourou';

export type NextSkip = {
  item: ClassItem;
  subject: Subject;
  /** "hoje", "amanhã" ou o dia da semana. */
  when: string;
  verdict: SkipVerdict;
  /** Faltas que ainda dá para ter na matéria, e quantas sobram se faltar essa aula. */
  left: number;
  leftAfter: number;
  line: string;
  meme: string;
};

const LINES: Record<SkipVerdict, ((x: { left: number; after: number; over: number; name: string }) => string)[]> = {
  pode: [
    ({ left }) => `pode faltar. ${n(left, 'falta sobrando', 'faltas sobrando')}, tá rico`,
    () => 'falta aí. ninguém vai notar, nem você notava quando ia',
    () => 'a cama venceu por w.o.',
    ({ after }) => `vai com deus (pra casa). ainda sobram ${after} depois dessa`,
    () => 'o professor nem sabe seu nome mesmo',
    ({ left }) => `${n(left, 'falta', 'faltas')} no bolso. gasta, dinheiro parado não rende`,
  ],
  reflita: [
    ({ after }) => `pode, mas depois não vem chorar. sobra ${after}`,
    ({ after }) => `tecnicamente pode. sobra ${after}. vida no fio da navalha`,
    ({ after }) => (after === 0 ? 'se faltar essa, zera. última ficha do fliperama' : `falta e fica com ${after}. você que sabe, eu só trabalho aqui`),
    ({ after }) => `dá, mas sobra ${after}. o eu do futuro vai te odiar`,
  ],
  zerou: [
    () => 'não. senta lá. presença agora é igual boleto: obrigatória',
    () => 'acabou o crédito. se faltar reprova e eu vou rir',
    () => 'zero faltas sobrando. gastou tudo, agora aguenta',
    ({ name }) => `nem pensa. ${name} já te deu todas as chances que tinha`,
  ],
  estourou: [
    ({ over }) => `${n(over, 'falta', 'faltas')} além do limite. speedrun de reprovação any%`,
    () => 'você já passou do limite. tá indo por esporte agora',
    ({ over }) => `limite? ficou ${over} pra trás. vai lá ver se o professor esquece`,
  ],
};

const SKIP_MEMES: Record<SkipVerdict, string[]> = {
  pode: ['falte-aula-filho', 'falte-meu-filho', 'falte-amanha'],
  reflita: ['reflita'],
  zerou: ['nao-sobrou-nada'],
  estourou: ['alem-do-infinito'],
};

/** A próxima aula que ainda não começou: hoje, ou a primeira do próximo dia com aula. */
function nextClass(subjects: Subject[], now: Date, holiday?: boolean): { item: ClassItem; when: string; tomorrow: boolean } | null {
  const mm = nowMin(now);
  const today = holiday ? undefined : classesOn(subjects, now.getDay()).find((c) => toMin(c.start) > mm);
  if (today) return { item: today, when: 'hoje', tomorrow: false };
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    const first = classesOn(subjects, d.getDay())[0];
    if (first) return { item: first, when: i === 1 ? 'amanhã' : WEEKDAYS[d.getDay()].toLowerCase(), tomorrow: i === 1 };
  }
  return null;
}

export function nextSkip(subjects: Subject[], now: Date, holiday?: boolean): NextSkip | null {
  const next = nextClass(subjects, now, holiday);
  const subject = next && subjects.find((s) => s.code === next.item.code);
  if (!next || !subject) return null;

  const left = subject.limit - subject.absences;
  const leftAfter = left - next.item.lessons;
  const verdict: SkipVerdict = left < 0 ? 'estourou' : leftAfter < 0 ? 'zerou' : leftAfter <= 2 ? 'reflita' : 'pode';
  const line = pick(LINES[verdict], now, subject.code)({ left, after: leftAfter, over: -left, name: subject.name });
  // "Falte amanhã" só faz sentido quando a aula é amanhã
  const memes = SKIP_MEMES[verdict].filter((id) => id !== 'falte-amanha' || next.tomorrow);
  const meme = verdict === 'pode' && next.tomorrow ? 'falte-amanha' : pick(memes, now, subject.code);
  return { item: next.item, subject, when: next.when, verdict, left, leftAfter, line, meme };
}

// ---------- Reações do dia ----------

export type Reaction = { id: string; line: string; meme: string };

type Ctx = { subjects: Subject[]; now: Date; aulas?: Aula[]; checks?: AttendanceCheck[]; cal?: Calendario | null; holiday?: boolean };

/** O resto do que está acontecendo, em uma linha cada. */
export function reactions({ subjects, now, aulas, checks, cal, holiday }: Ctx): Reaction[] {
  const out: Reaction[] = [];
  const today = isoDay(now);
  const add = (id: string, memes: string[], lines: string[]) => out.push({ id, meme: pick(memes, now, id), line: pick(lines, now, id) });

  const absent = subjects.find((s) => aulas?.some((a) => a.data === today && a.faltas > 0 && aulaMatchesSubject(a, s)) || checks?.some((c) => c.code === s.code && c.date === today && c.status === 'absent'));
  if (absent) add('falta', ['caralho', 'senhor-cinema'], [`levou falta em ${absent.name}. f`, `falta em ${absent.name}. o professor fez a chamada, que absurdo`, `${absent.name} te deu falta. e você nem aproveitou`]);

  const classes = holiday ? [] : classesOn(subjects, now.getDay());
  const lessons = classes.reduce((sum, c) => sum + c.lessons, 0);
  if (!classes.length) add('livre', ['baixo-em-disposicao'], ['sem aula hoje. faz nada com orgulho', 'dia livre. a produtividade pode esperar', 'hoje não tem aula. deita'] );
  else if (lessons >= 5) add('cansado', ['to-cansado-pai'], [`${lessons} aulas hoje. força (não tenho nenhuma pra te dar)`, `${lessons} aulas. quem montou esse horário te odeia`, `${lessons} aulas hoje. isso é crime em alguns países`]);

  const avg = overallAverage(subjects);
  if (avg !== null && avg < PASS) add('nota', ['senhor-cinema', 'caralho'], [`média ${Math.round(avg)}. o boletim tá pedindo socorro`, `média ${Math.round(avg)}. tá no modo difícil por opção`, `média ${Math.round(avg)}. dá pra recuperar. eu acho. talvez`]);
  else if (avg !== null && avg >= 85) add('nota', ['arrogante'], [`média ${Math.round(avg)}. tá, a gente entendeu, você é inteligente`, `média ${Math.round(avg)}. nerd`, `média ${Math.round(avg)}. empresta o cérebro`]);

  const end = parseDay(cal?.data_fim);
  const d = end ? daysBetween(now, end) : null;
  if (d !== null && d >= 0 && d <= 21) add('fim', ['fim-esta-proximo'], [`faltam ${n(d, 'dia', 'dias')}. aguenta, guerreiro`, `${n(d, 'dia', 'dias')} pro fim. dá pra sentir o cheiro das férias`, `só mais ${n(d, 'dia', 'dias')}. não desiste agora que tá feio desistir`]);
  else if (d !== null && d > 45) add('fim', ['fim-nao-esta-proximo'], [`ainda faltam ${d} dias de semestre. boa sorte aí`, `${d} dias pro fim. nem olha o calendário`, `faltam ${d} dias. respira`]);

  return out;
}
