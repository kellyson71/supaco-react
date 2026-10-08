// WebMCP: ferramentas que o assistente do navegador pode chamar nesta página, em vez de ler e clicar na tela.
// As calculadoras ficam sempre disponíveis; as que leem o SUAP só existem com alguém logado e respondem com
// os dados daquela pessoa, direto do aparelho dela. Nenhuma ferramenta entrega a senha ou o token.
// Especificação: https://webmachinelearning.github.io/webmcp/
import { onSessionChange, session } from './api';
import { live } from './agent';
import { absenceAnswer, gradeAnswer, parseGrade } from './calc';
import { buildDeadlines } from './agenda';
import type { Task } from './classroom';
import { isoDay, relativeDay } from './dates';
import { currentAverage, outlook, outlookText, weightsFor, withPartials } from './grades';
import { canSkip } from './insights';
import { navigate } from './router';
import { classesOn, nowMin, toMin, WEEKDAYS } from './schedule';
import { SITE_URL } from './seo';
import { peek } from './store';
import { api, titleCase, type Avaliacao, type Parcial, type Periodo, type Subject } from './suap';

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => unknown;
};
type ModelContext = { registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => unknown };

// A especificação atual põe a API no documento; as primeiras versões do Chrome, no navigator
const modelContext = () =>
  (document as { modelContext?: ModelContext }).modelContext ?? (navigator as { modelContext?: ModelContext }).modelContext;

// ---------- Entrada (vem do modelo, então nada é confiado) ----------

const int = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? undefined : Math.min(max, Math.max(min, Math.round(n)));
};

const DIAS = ['hoje', 'amanha', 'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const dia = { type: 'string', enum: DIAS, description: 'Dia a consultar. Sem informar, vale hoje.' };

/** "amanha", "terça"... → dia da semana (0 = domingo). */
function weekday(v: unknown) {
  const key = String(v ?? 'hoje').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/-feira$/, '');
  const today = new Date().getDay();
  if (key === 'amanha') return (today + 1) % 7;
  const i = DIAS.indexOf(key) - 2;
  return i >= 0 ? i : today;
}

// ---------- Dados de quem está logado ----------

function requireLogin() {
  if (!session.isLoggedIn) throw new Error(`Ninguém entrou no Supaco neste navegador. Peça para a pessoa entrar com a conta do SUAP em ${SITE_URL}/ e tente de novo.`);
}

/** Matérias do período atual: as que a tela já mostra, ou o cache do aparelho, ou o SUAP. */
async function subjects(): Promise<Subject[]> {
  requireLogin();
  if (live.subjects) return live.subjects;
  const period = (peek<Periodo[]>('periodos') ?? await api.periodos())[0];
  if (!period) throw new Error('O SUAP não devolveu nenhum período letivo para esta conta.');
  const raw = peek<Subject[]>(`disciplinas:${period.label}`) ?? await api.disciplinas(period);
  const parciais = peek<Record<string, Parcial[]>>(`parciais:${period.label}`);
  return parciais ? withPartials(raw, parciais) : raw;
}

const page = (path: string) => SITE_URL + path;

const TELAS: Record<string, string> = {
  hoje: '/', materias: '/disciplinas', horario: '/horario', agenda: '/agenda', servidores: '/servidores', campus: '/campus',
  retrospectiva: '/retrospectiva', mensagens: '/mensagens', voce: '/voce', calculadora: '/calculadora', faltas: '/faltas',
};

// ---------- Ferramentas abertas ----------

const OPEN: Tool[] = [
  {
    name: 'calcular_nota_ifrn',
    title: 'Calculadora de notas do IFRN',
    description: 'Calcula quanto um estudante do IFRN precisa tirar para passar em uma disciplina, com os pesos das etapas (2 e 3 em disciplinas de 2 etapas; 2, 2, 3 e 3 nas de 4) e a regra da prova final. Use quando a pessoa informar as notas. Não precisa de login.',
    inputSchema: {
      type: 'object',
      properties: {
        etapas: { type: 'integer', enum: [2, 4], description: 'Número de etapas da disciplina: 2 (semestral) ou 4 (anual).' },
        notas: {
          type: 'array', maxItems: 4,
          items: { type: ['number', 'null'], minimum: 0, maximum: 100 },
          description: 'Notas de 0 a 100 na ordem das etapas (N1, N2...). Use null para etapa que ainda não tem nota.',
        },
      },
      required: ['etapas', 'notas'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const etapas = int(input.etapas, 1, 4) === 4 ? 4 : 2;
      const notas = (Array.isArray(input.notas) ? input.notas : []).slice(0, etapas).map((n) => parseGrade(n as number | string | null));
      const a = gradeAnswer(etapas, notas);
      return {
        resposta: a.text,
        situacao: a.outlook.kind,
        media_ate_agora: a.average === null ? null : Math.round(a.average * 10) / 10,
        nota_necessaria: 'needed' in a.outlook ? a.outlook.needed : null,
        pesos: a.weights,
        media_para_passar: 60,
        pagina: page('/calculadora'),
      };
    },
  },
  {
    name: 'calcular_faltas_ifrn',
    title: 'Calculadora de faltas do IFRN',
    description: 'Calcula o limite de faltas de uma disciplina do IFRN (25% da carga horária), quantas ainda sobram e quantos dias inteiros isso dá. Use quando a pessoa informar a carga horária. Não precisa de login.',
    inputSchema: {
      type: 'object',
      properties: {
        carga_horaria: { type: 'integer', minimum: 1, maximum: 999, description: 'Carga horária da disciplina, em aulas, como aparece no boletim do SUAP.' },
        faltas: { type: 'integer', minimum: 0, description: 'Faltas que a pessoa já tem. Padrão: 0.' },
        aulas_por_dia: { type: 'integer', minimum: 1, maximum: 6, description: 'Quantas aulas dessa disciplina a pessoa tem num mesmo dia, para converter faltas em dias.' },
      },
      required: ['carga_horaria'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const carga = int(input.carga_horaria, 0, 999);
      if (!carga) throw new Error('Informe carga_horaria (em aulas), um número maior que zero.');
      const a = absenceAnswer(carga, int(input.faltas, 0, 999) ?? 0, int(input.aulas_por_dia, 1, 6) ?? 0);
      return {
        resposta: a.text,
        limite_de_faltas: a.limit,
        faltas_que_ainda_pode_ter: a.left,
        dias_inteiros_que_ainda_pode_faltar: a.days,
        frequencia_atual_pct: Math.round(a.attendance * 10) / 10,
        frequencia_minima_pct: 75,
        pagina: page('/faltas'),
      };
    },
  },
  {
    name: 'abrir_tela',
    title: 'Abrir uma tela do Supaco',
    description: 'Leva a pessoa para uma tela do Supaco nesta aba. As calculadoras abrem sem login; as outras telas mostram os dados de quem entrou com a conta do SUAP.',
    inputSchema: {
      type: 'object',
      properties: { tela: { type: 'string', enum: Object.keys(TELAS) } },
      required: ['tela'],
    },
    execute: (input) => {
      const path = TELAS[String(input.tela)];
      if (!path) throw new Error(`Tela desconhecida. Use uma destas: ${Object.keys(TELAS).join(', ')}.`);
      navigate(path);
      const open = path === '/calculadora' || path === '/faltas';
      return { aberta: page(path), aviso: open || session.isLoggedIn ? null : 'Ninguém está logado: a tela pede o login do SUAP antes de mostrar os dados.' };
    },
  },
];

// ---------- Ferramentas de quem está logado ----------

const PRIVATE: Tool[] = [
  {
    name: 'minhas_materias',
    title: 'Notas e faltas das matérias',
    description: 'Lista as matérias do período atual do estudante logado, com as notas de cada etapa, a média, quanto falta tirar para passar, as faltas e o limite de faltas. Use para perguntas como "como estão minhas notas?", "em que matéria estou em risco?" ou "quanto preciso em Física?".',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => (await subjects()).map((s) => {
      const media = currentAverage(s);
      return {
        materia: s.name,
        notas: Object.fromEntries(s.grades.map((g, i) => [`N${i + 1}`, g])),
        pesos: weightsFor(s.stages),
        prova_final: s.finalExam,
        media: media === null ? null : Math.round(media * 10) / 10,
        situacao: outlookText(outlook(s), s),
        faltas: s.absences,
        limite_de_faltas: s.limit,
        faltas_que_ainda_pode_ter: s.limit - s.absences,
        pagina: page(`/disciplinas/${encodeURIComponent(s.code)}`),
      };
    }),
  },
  {
    name: 'posso_faltar',
    title: 'Posso faltar?',
    description: 'Simula o estudante logado faltar um dia inteiro de aula e diz se alguma matéria passaria do limite de faltas. Use para "posso faltar hoje?", "dá para faltar amanhã?" ou "e na sexta?".',
    inputSchema: { type: 'object', properties: { dia } },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      const day = weekday(input.dia);
      const { verdict, items } = canSkip(await subjects(), day);
      const resposta = {
        noclass: 'Não tem aula nesse dia.',
        yes: 'Pode faltar: nenhuma matéria do dia fica perto do limite de faltas.',
        tight: 'Dá para faltar, mas fica apertado: alguma matéria do dia fica com 2 faltas ou menos de folga.',
        no: 'Melhor não faltar: alguma matéria do dia passaria do limite de faltas.',
      }[verdict];
      return {
        dia: WEEKDAYS[day],
        resposta,
        materias: items.map((x) => ({ materia: x.s.name, aulas_no_dia: x.lessons, faltas_ate_agora: x.s.absences, limite_de_faltas: x.s.limit, folga_se_faltar: x.leftAfter })),
      };
    },
  },
  {
    name: 'aulas_do_dia',
    title: 'Aulas do dia',
    description: 'Mostra as aulas do estudante logado em um dia, com horário e sala. Para hoje, marca qual aula está acontecendo agora e quais já terminaram. Use para "qual minha próxima aula?", "que aula tenho agora?" ou "qual meu horário de quinta?".',
    inputSchema: { type: 'object', properties: { dia } },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      const day = weekday(input.dia);
      const today = day === new Date().getDay();
      const now = nowMin();
      const aulas = classesOn(await subjects(), day).map((c) => ({
        materia: c.subject, inicio: c.start, fim: c.end, aulas: c.lessons, sala: c.room || null,
        ...(today ? { status: now >= toMin(c.end) ? 'terminou' : now >= toMin(c.start) ? 'agora' : 'depois' } : {}),
      }));
      return { dia: WEEKDAYS[day], aulas, resposta: aulas.length ? null : 'Não tem aula nesse dia.' };
    },
  },
  {
    name: 'proximos_prazos',
    title: 'Próximas provas e tarefas',
    description: 'Lista as próximas avaliações do estudante logado no SUAP (provas, trabalhos, seminários) e, se o Google Classroom estiver conectado no Supaco, as tarefas pendentes. Use para "tenho prova essa semana?" ou "o que tenho para entregar?".',
    inputSchema: { type: 'object', properties: {} },
    // Títulos e descrições são escritos por professores: texto de terceiros
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => {
      requireLogin();
      const avaliacoes = peek<Avaliacao[]>('avaliacoes') ?? await api.avaliacoes();
      const today = isoDay();
      const prazos = buildDeadlines(avaliacoes, peek<Task[]>('classroom') ?? [])
        .filter((d) => !d.date || isoDay(d.date) >= today || d.late)
        .slice(0, 30)
        .map((d) => ({
          tipo: d.kind, titulo: d.title, materia: d.subject, data: d.date ? isoDay(d.date) : null, quando: d.date ? relativeDay(d.date) : 'sem data',
          origem: d.source === 'classroom' ? 'Google Classroom' : 'SUAP', atrasada: !!d.late, link: d.link ?? null,
        }));
      return { prazos, resposta: prazos.length ? null : 'Nenhuma avaliação ou tarefa pendente.', pagina: page('/agenda') };
    },
  },
  {
    name: 'buscar_servidor',
    title: 'Buscar servidor do IFRN',
    description: 'Procura um professor ou técnico do IFRN pelo nome, em todos os campi, e devolve cargo, campus e setor. Precisa de alguém logado, porque a busca é feita no SUAP com a conta da pessoa.',
    inputSchema: {
      type: 'object',
      properties: { nome: { type: 'string', minLength: 3, description: 'Nome ou parte do nome.' } },
      required: ['nome'],
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      requireLogin();
      const nome = String(input.nome ?? '').trim().slice(0, 80);
      if (nome.length < 3) throw new Error('Informe pelo menos 3 letras do nome.');
      const { total, lista } = await api.buscarServidores(nome).catch(() => { throw new Error('Não deu para consultar o SUAP agora. Tente de novo em instantes.'); });
      return {
        total,
        servidores: lista.slice(0, 10).map((s) => ({
          nome: titleCase(s.nome), cargo: s.cargo, categoria: s.categoria, campus: s.campus, setor: s.setor, area: s.disciplina || null,
          pagina: page(`/servidores/${encodeURIComponent(s.matricula)}`),
        })),
      };
    },
  },
];

function register(mc: ModelContext, tool: Tool, signal?: AbortSignal) {
  // Nome repetido ou navegador com uma versão antiga da API: a ferramenta só deixa de existir
  try { void Promise.resolve(mc.registerTool(tool, signal ? { signal } : undefined)).catch(() => {}); } catch { /* idem */ }
}

/** Registra as ferramentas no navegador que tem WebMCP. As que leem o SUAP entram e saem junto com o login. */
export function startWebMCP() {
  const mc = modelContext();
  if (!mc) return;
  OPEN.forEach((t) => register(mc, t));

  let logged: AbortController | null = null;
  const sync = () => {
    if (session.isLoggedIn === !!logged) return;
    if (logged) { logged.abort(); logged = null; return; }
    logged = new AbortController();
    PRIVATE.forEach((t) => register(mc, t, logged!.signal));
  };
  sync();
  onSessionChange(sync);
}
