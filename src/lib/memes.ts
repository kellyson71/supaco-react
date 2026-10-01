// Modo zueira: decide se dá para faltar uma aula pesando vários fatores e responde com frase e meme.
import { currentAverage, PASS } from './grades';
import { classesOn, nowMin, toMin, WEEKDAYS, type ClassItem } from './schedule';
import { daysBetween, isoDay, parseDay } from './dates';
import { aulaMatchesSubject, cleanName, type Aula, type Avaliacao, type Calendario, type Subject } from './suap';

export const memeSrc = (id: string) => `/memes/${id}.webp`;

/** Todos os memes, com o texto que já está na imagem (só para leitor de tela). */
export const MEMES: Record<string, string> = {
  'falte-aula-filho': 'falte aula filho', 'falte-meu-filho': 'falte meu filho', 'falte-amanha': 'falte amanhã',
  caralho: 'caralho', 'senhor-cinema': 'puta que pariu, senhor cinema', 'fim-nao-esta-proximo': 'o fim não está próximo',
  'fim-esta-proximo': 'o fim está próximo', reflita: 'reflita', 'alem-do-infinito': 'você foi além do infinito, bro',
  arrogante: 'arrogante', 'nao-sobrou-nada': 'não sobrou nada', 'baixo-em-disposicao': 'baixo em disposição', 'to-cansado-pai': 'to cansado, pai',
};

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const plural = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;

// ---------- Próximas aulas ----------

export type Target = { item: ClassItem; subject: Subject; date: string; when: string; daysAhead: number };

/** As próximas aulas que ainda não começaram, de hoje em diante. */
export function upcoming(subjects: Subject[], now: Date, holiday?: boolean, max = 4): Target[] {
  const out: Target[] = [];
  const mm = nowMin(now);
  for (let i = 0; i <= 7 && out.length < max; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    if (i === 0 && holiday) continue;
    for (const item of classesOn(subjects, d.getDay())) {
      if (i === 0 && toMin(item.start) <= mm) continue;
      const subject = subjects.find((s) => s.code === item.code);
      if (subject && out.length < max) out.push({ item, subject, date: isoDay(d), when: i === 0 ? 'hoje' : i === 1 ? 'amanhã' : WEEKDAYS[d.getDay()].toLowerCase(), daysAhead: i });
    }
  }
  return out;
}

// ---------- Decisão ----------

export type Verdict = 'pode' | 'depende' | 'melhor-nao' | 'zerou' | 'estourou';

/** Cada coisa que pesa na decisão. */
export type Reason =
  | 'folga' | 'sobra' | 'reta-final' | 'nota-boa' | 'cansado'
  | 'comeco' | 'sem-nota' | 'nota-baixa' | 'prova' | 'limite' | 'gastando-rapido' | 'duas-seguidas' | 'cara'
  | 'zerou' | 'estourou';

export type Factor = { reason: Reason; weight: number; label: string };

type Facts = {
  left: number; after: number; cost: number; used: number; limit: number;
  /** Quanto do semestre já passou (0 a 1) e quantas semanas faltam; null sem calendário. */
  progress: number | null; weeksLeft: number | null;
  /** Aulas da matéria que ainda vão acontecer. */
  remaining: number;
  avg: number | null; hasGrades: boolean;
  examIn: number | null;
  dayLessons: number;
  name: string;
};

export type Decision = { target: Target; verdict: Verdict; factors: Factor[]; main: Reason; facts: Facts };

type Ctx = { subjects: Subject[]; now: Date; aulas?: Aula[]; cal?: Calendario | null; avaliacoes?: Avaliacao[] };

export function decide(target: Target, { subjects, now, aulas, cal, avaliacoes }: Ctx): Decision {
  const s = target.subject;
  const cost = target.item.lessons;
  const left = s.limit - s.absences;
  const after = left - cost;

  const start = parseDay(cal?.data_inicio), end = parseDay(cal?.data_fim);
  const total = start && end ? daysBetween(start, end) : 0;
  const progress = total > 0 ? Math.max(0, Math.min(1, daysBetween(start!, now) / total)) : null;
  const weeksLeft = end ? Math.max(0, Math.ceil(daysBetween(now, end) / 7)) : null;
  const remaining = Math.max(0, s.workload - s.workloadDone);

  const hasGrades = s.grades.some((g) => g !== null) || s.finalAverage !== null;
  const avg = hasGrades ? currentAverage(s) : null;

  const target0 = parseDay(target.date) ?? now;
  const examIn = (avaliacoes ?? [])
    .filter((a) => a.data && ((s.sigla && a.diario?.includes(s.sigla)) || cleanName(a.diario || '').toLowerCase() === s.name.toLowerCase()))
    .map((a) => daysBetween(target0, parseDay(a.data)!))
    .filter((d) => d >= 0 && d <= 7)
    .sort((a, b) => a - b)[0] ?? null;

  const mine = (aulas ?? []).filter((a) => aulaMatchesSubject(a, s)).sort((a, b) => b.data.localeCompare(a.data));
  const missedLast = !!mine[0] && mine[0].faltas > 0;
  const dayLessons = classesOn(subjects, (parseDay(target.date) ?? now).getDay()).reduce((n, c) => n + c.lessons, 0);

  const facts: Facts = { left, after, cost, used: s.absences, limit: s.limit, progress, weeksLeft, remaining, avg, hasGrades, examIn, dayLessons, name: s.name };
  const factors: Factor[] = [];
  const add = (reason: Reason, weight: number, label: string) => factors.push({ reason, weight, label });

  if (left < 0) {
    add('estourou', -10, `${plural(-left, 'falta', 'faltas')} além do limite`);
    return { target, verdict: 'estourou', factors, main: 'estourou', facts };
  }
  if (after < 0) {
    add('zerou', -10, left === 0 ? 'nenhuma falta sobrando' : `sobra ${left}, essa custa ${cost}`);
    return { target, verdict: 'zerou', factors, main: 'zerou', facts };
  }

  const usedPct = s.limit > 0 ? s.absences / s.limit : 0;

  // Contra faltar
  if (after <= 2) add('limite', -3, `sobraria ${plural(after, 'falta', 'faltas')}`);
  if (examIn !== null) add('prova', -3, examIn === 0 ? 'avaliação no mesmo dia' : `avaliação em ${plural(examIn, 'dia', 'dias')}`);
  if (avg !== null && avg < PASS) add('nota-baixa', -2, `média ${Math.round(avg)}`);
  if (progress !== null && usedPct - progress > 0.2 && s.absences > 0) add('gastando-rapido', -2, `${Math.round(usedPct * 100)}% das faltas em ${Math.round(progress * 100)}% do semestre`);
  if (!hasGrades) add('sem-nota', -1, 'sem nota lançada');
  if (missedLast) add('duas-seguidas', -1, 'faltou a última aula');
  if (cost >= 3) add('cara', -1, `custa ${cost} faltas de uma vez`);
  if (progress !== null && progress < 0.25) add('comeco', -1, `começo do semestre (${Math.round(progress * 100)}%)`);

  // A favor
  if (left >= remaining && remaining > 0) add('sobra', 3, `${left} faltas para ${plural(remaining, 'aula restante', 'aulas restantes')}`);
  if (progress !== null && progress > 0.8 && after >= 3) add('reta-final', 2, weeksLeft !== null ? `${plural(weeksLeft, 'semana', 'semanas')} para acabar` : 'fim do semestre');
  if (after >= 6) add('folga', 2, `${left} faltas sobrando`);
  else if (after >= 3) add('folga', 1, `${left} faltas sobrando`);
  if (avg !== null && avg >= 80) add('nota-boa', 1, `média ${Math.round(avg)}`);
  if (dayLessons >= 5) add('cansado', 1, `${dayLessons} aulas no dia`);

  const score = factors.reduce((n, f) => n + f.weight, 0);
  const verdict: Verdict = score >= 1 ? 'pode' : score >= -2 ? 'depende' : 'melhor-nao';

  // O motivo principal é o que mais pesa na direção do veredito
  const pro = factors.filter((f) => f.weight > 0).sort((a, b) => b.weight - a.weight);
  const con = factors.filter((f) => f.weight < 0).sort((a, b) => a.weight - b.weight);
  const main = (verdict === 'pode' ? pro[0] : con[0] ?? pro[0])?.reason ?? 'folga';
  // No "pode", se o que mais chama atenção é um porém, ele vira o assunto ("pode, mas...")
  const caveat = verdict === 'pode' && con[0] && con[0].weight <= -1 && (pro[0]?.reason === 'folga') ? con[0].reason : null;

  factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { target, verdict, factors, main: caveat ?? main, facts };
}

// ---------- Frases e memes ----------

type Line = (f: Facts) => string;
const pct = (v: number | null) => Math.round((v ?? 0) * 100);
const em = (d: number | null) => (d === 0 ? 'no mesmo dia' : d === 1 ? 'no dia seguinte' : `em ${d} dias`);

const LINES: Record<Reason, Line[]> = {
  folga: [
    (f) => `pode. ${f.left} faltas sobrando, tá rico`,
    () => 'falta aí. ninguém vai notar, nem você notava quando ia',
    () => 'a cama venceu por w.o.',
    (f) => `${f.left} faltas no bolso. dinheiro parado não rende`,
    () => 'vai na fé. a fé de que o professor não passa nada importante hoje',
    () => 'pode faltar sim. eu não vi nada',
  ],
  sobra: [
    (f) => `restam ${f.remaining} aulas e você tem ${f.left} faltas. dá pra sumir até o fim. não tô recomendando, tô informando`,
    (f) => `${f.left} faltas pra ${f.remaining} aulas. matematicamente você já pode ir embora`,
    () => 'dá pra faltar o resto do semestre e ainda passar por frequência. o sistema tem falhas',
  ],
  'reta-final': [
    () => 'falta não acumula pro semestre que vem. gasta',
    (f) => `${plural(f.weeksLeft ?? 0, 'semana', 'semanas')} pro fim e ${f.left} faltas sobrando. vai levar pra onde?`,
    () => 'fim de semestre com falta sobrando. ir pra aula é quase desperdício',
  ],
  'nota-boa': [
    (f) => `média ${Math.round(f.avg!)} e falta sobrando. vai faltar por esporte`,
    (f) => `com média ${Math.round(f.avg!)} você vai pra aula fazer o quê, humilhar?`,
    (f) => `média ${Math.round(f.avg!)}. pode faltar, o professor até descansa`,
  ],
  cansado: [
    (f) => `${f.dayLessons} aulas no dia. uma a menos é autocuidado`,
    (f) => `${f.dayLessons} aulas no mesmo dia. faltar uma é questão de saúde pública`,
    (f) => `${f.dayLessons} aulas. quem montou esse horário te odeia, revida`,
  ],
  comeco: [
    (f) => `pode, mas o semestre tá em ${pct(f.progress)}%. vai queimar falta agora?`,
    () => 'dá. só lembra que no fim do semestre você vai querer essas faltas de volta',
    (f) => `${pct(f.progress)}% do semestre e já querendo faltar. respeito, mas guarda umas`,
    () => 'pode. mas falta no começo é igual gastar o décimo terceiro em janeiro',
  ],
  'sem-nota': [
    () => 'nem tem nota ainda. você não sabe se é gênio ou se tá ferrado. descobre antes de faltar',
    () => 'sem nota lançada. faltar agora é jogar sem ver o placar',
    () => 'pode, mas sem nota nenhuma você tá apostando no escuro',
  ],
  'nota-baixa': [
    (f) => `média ${Math.round(f.avg!)}. você não tá em posição de faltar, tá em posição de sentar na frente`,
    (f) => `com ${Math.round(f.avg!)} de média, essa aula é o que te separa da prova final`,
    (f) => `falta até sobra. o que não sobra é nota: média ${Math.round(f.avg!)}`,
    (f) => `média ${Math.round(f.avg!)} e querendo faltar. a audácia`,
  ],
  prova: [
    (f) => `tem avaliação ${em(f.examIn)}. se faltar, a revisão vai ser na base da oração`,
    (f) => `avaliação ${em(f.examIn)}. vai que o professor solta um "isso cai"`,
    (f) => `avaliação ${em(f.examIn)} e você pensando em faltar. corajoso`,
  ],
  limite: [
    (f) => (f.after === 0 ? 'se faltar essa, zera. última ficha do fliperama' : `falta essa e sobra ${f.after}. vida no fio da navalha`),
    (f) => `falta e fica com ${f.after}. depois não vem chorar`,
    (f) => `sobra ${f.after} se faltar. o você do futuro vai te odiar`,
    (f) => `tecnicamente dá. sobra ${f.after}. eu só trabalho aqui`,
  ],
  'gastando-rapido': [
    (f) => `${pct(f.limit ? f.used / f.limit : 0)}% das faltas em ${pct(f.progress)}% do semestre. nesse ritmo não chega no fim`,
    () => 'tá gastando falta igual salário no dia 5',
    (f) => `${f.used} faltas com ${pct(f.progress)}% do semestre. calma, não é corrida`,
  ],
  'duas-seguidas': [
    () => 'faltou a última também. duas seguidas já é sumiço',
    () => 'você faltou a última. mais uma e o professor acha que você trancou',
    () => 'segunda falta seguida. a turma já tá fazendo bolão se você volta',
  ],
  cara: [
    (f) => `essa custa ${f.cost} faltas de uma vez. cara, hein`,
    (f) => `${f.cost} aulas seguidas, ${f.cost} faltas numa tacada. pensa`,
  ],
  zerou: [
    () => 'não. senta lá. presença agora é igual boleto: obrigatória',
    () => 'acabou o crédito. se faltar reprova e eu vou rir',
    () => 'zero faltas sobrando. gastou tudo, agora aguenta',
    (f) => `nem pensa. ${f.name} já te deu todas as chances que tinha`,
  ],
  estourou: [
    (f) => `${plural(-f.left, 'falta', 'faltas')} além do limite. speedrun de reprovação any%`,
    () => 'você já passou do limite. tá indo por esporte agora',
    (f) => `limite? ficou ${-f.left} pra trás. vai lá ver se o professor esquece`,
  ],
};

const REASON_MEMES: Record<Reason, string[]> = {
  folga: ['falte-aula-filho', 'falte-meu-filho'],
  sobra: ['falte-meu-filho', 'baixo-em-disposicao', 'falte-aula-filho'],
  'reta-final': ['fim-esta-proximo', 'falte-aula-filho'],
  'nota-boa': ['arrogante'],
  cansado: ['to-cansado-pai', 'baixo-em-disposicao'],
  comeco: ['fim-nao-esta-proximo', 'reflita'],
  'sem-nota': ['reflita', 'fim-nao-esta-proximo'],
  'nota-baixa': ['senhor-cinema', 'caralho'],
  prova: ['reflita', 'senhor-cinema'],
  limite: ['reflita'],
  'gastando-rapido': ['caralho', 'senhor-cinema'],
  'duas-seguidas': ['reflita'],
  cara: ['reflita'],
  zerou: ['nao-sobrou-nada'],
  estourou: ['alem-do-infinito'],
};

/** Frase e meme da decisão. `roll` troca por outra opção (botão "outra"). */
export function say(d: Decision, now: Date, roll = 0): { line: string; meme: string } {
  const seed = Math.floor(now.getTime() / 86_400_000) + hash(d.target.subject.code) + roll;
  const lines = LINES[d.main];
  // "Falte amanhã" entra na roda só quando é liberado faltar e a aula é amanhã
  const memes = d.verdict === 'pode' && d.target.daysAhead === 1 && (d.main === 'folga' || d.main === 'sobra') ? ['falte-amanha', ...REASON_MEMES[d.main]] : REASON_MEMES[d.main];
  return { line: lines[seed % lines.length](d.facts), meme: memes[seed % memes.length] };
}

// ---------- Resposta ao que a pessoa decidiu ----------

export type Choice = 'faltar' | 'aula';

const REPLIES: Record<Choice, Record<'pode' | 'depende' | 'nao', string[]>> = {
  faltar: {
    pode: ['boa. descansa, guerreiro', 'decisão tomada, sem culpa', 'anotado. a falta no suap vem depois, a paz vem agora'],
    depende: ['corajoso. depois a gente conversa', 'tá bom. sem julgamento (com julgamento)', 'você que sabe. eu avisei, tá no print'],
    nao: ['coragem não te falta. falta vai faltar', 'ok. vou deixando o meme da reprovação separado', 'respeito a ousadia. não a decisão'],
  },
  aula: {
    pode: ['podia faltar e vai. exemplo de cidadão. chato, mas exemplo', 'aluno modelo. ninguém gosta, mas ok', 'vai lá. senta no fundo pelo menos'],
    depende: ['sábio. chato, mas sábio', 'escolha de adulto. parabéns, eu acho', 'boa. o você do futuro agradece'],
    nao: ['é o mínimo', 'não tinha escolha mesmo, mas valeu a atitude', 'isso. leva caderno dessa vez'],
  },
};

export function reply(choice: Choice, verdict: Verdict, salt: string): string {
  const key = verdict === 'pode' ? 'pode' : verdict === 'depende' ? 'depende' : 'nao';
  const list = REPLIES[choice][key];
  return list[hash(salt) % list.length];
}

// ---------- Plano guardado (o que a pessoa disse que ia fazer) ----------

const PLAN_KEY = 'supaco:plans';
export type Plans = Record<string, Choice>;
export const planKey = (t: Target) => `${t.subject.code}:${t.date}:${t.item.start}`;

export function loadPlans(): Plans {
  try {
    const all: Plans = JSON.parse(localStorage.getItem(PLAN_KEY) || '{}');
    const today = isoDay();
    // Planos de dias que já passaram não servem mais
    return Object.fromEntries(Object.entries(all).filter(([k]) => k.split(':')[1] >= today));
  } catch { return {}; }
}

export function savePlans(p: Plans) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(p)); } catch { /* quota */ }
}
