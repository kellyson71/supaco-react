// Endpoints do SUAP usados pelo app e a normalização dos dados para a UI.
import { get, getAll, SUAP } from './api';

export { SUAP as SUAP_URL };
import { parseHorarios, shortRoom, type Slot } from './schedule';
import { TONE_ORDER, toneFor, type Tone } from './tones';

// ---------- Tipos crus da API (subset do openapi) ----------

type NotaEtapa = { nota: number | string | null; faltas: number | null } | null;

export type BoletimRaw = {
  codigo_diario: string;
  disciplina: string;
  carga_horaria: number;
  carga_horaria_cumprida: number;
  numero_faltas: number;
  percentual_carga_horaria_frequentada: number;
  situacao: string;
  quantidade_avaliacoes: number;
  nota_etapa_1: NotaEtapa;
  nota_etapa_2: NotaEtapa;
  nota_etapa_3: NotaEtapa;
  nota_etapa_4: NotaEtapa;
  nota_avaliacao_final: NotaEtapa;
  media_disciplina: number | string | null;
  media_final_disciplina: number | string | null;
};

type TurmaVirtualRaw = {
  id: string;
  sigla: string;
  descricao: string;
  observacao: string | null;
  locais_de_aula: string[];
  horarios_de_aula: string;
};

export type Eu = {
  identificacao: string;
  nome_usual: string;
  nome: string;
  primeiro_nome: string;
  email: string;
  email_academico: string;
  email_google_classroom: string;
  campus: string;
  foto: string;
  tipo_usuario: string;
};

export type DadosAluno = {
  ingresso: string;
  curso: string;
  matriz: string;
  ira: string;
  situacao: string;
  periodo_referencia: number;
  qtd_periodos: number;
  email_academico: string;
};

export type Periodo = { ano: number; periodo: number; label: string };

export type Avaliacao = {
  id: number | null;
  tipo: string;
  sigla: string;
  descricao: string;
  data: string | null;
  nota_maxima: number;
  peso: number | null;
  diario: string;
  etapa: string | null;
};

export type Mensagem = {
  id: number;
  remetente: { nome: string; email: string };
  assunto: string;
  conteudo: string;
  data_envio: string;
  registro_leitura: boolean;
};

export type Calendario = {
  descricao: string;
  data_inicio: string;
  data_fim: string;
  qtd_etapas: number;
  data_inicio_prova_final: string;
  data_fim_prova_final: string;
} & { [K in `data_${'inicio' | 'fim'}_etapa_${1 | 2 | 3 | 4}`]: string | null };

export type Aula = { id: number; etapa: string; conteudo: string; data: string; qtd_aulas: number; faltas: number; disciplina: string };

export type Frequencia = { total_aulas: number; total_faltas: number; total_abonos: number; percentual_frequencia: number };

type CH = { ch_esperada: number; ch_cumprida: number; ch_pendente: number };
export type Requisitos = { percentual_cumprida: number; totais: CH } & Record<string, CH | number>;

// ---------- Modelos da UI ----------

export type Subject = {
  code: string;
  name: string;
  sigla: string;
  status: string;
  stages: number;
  grades: (number | null)[]; // N1..N4 conforme quantidade de etapas
  finalExam: number | null;
  average: number | null;
  finalAverage: number | null;
  absences: number;
  workload: number;
  workloadDone: number;
  attendance: number;
  limit: number;
  rooms: string[];
  slots: Slot[];
  tone?: Tone;
};

export const subjectTone = (s: Pick<Subject, 'code' | 'tone'>) => s.tone ?? toneFor(s.code);

// ---------- Helpers ----------

export const cleanName = (raw: string) =>
  raw.replace(/^[A-Z]+\.\d+\s*-\s*/, '').replace(/\s*\((Curso\s*\d+|NCT|[^)]*)\)\s*$/i, '').trim();

const siglaOf = (raw: string) => raw.match(/^([A-Z]+\.\d+)/)?.[1] ?? '';

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const photoUrl = (foto?: string) => (!foto ? '' : foto.startsWith('http') ? foto : `${SUAP}${foto}`);

// ---------- Endpoints ----------

export const api = {
  eu: () => get<Eu>('/api/rh/eu/'),
  aluno: () => get<DadosAluno>('/api/ensino/meus-dados-aluno/'),
  requisitos: () => get<Requisitos>('/api/ensino/requisitos-conclusao/'),

  async periodos(): Promise<Periodo[]> {
    const list = await getAll<{ ano_letivo: number; periodo_letivo: number }>('/api/ensino/meus-periodos-letivos/');
    const seen = new Set<string>();
    return list
      .map((p) => ({ ano: p.ano_letivo, periodo: p.periodo_letivo, label: `${p.ano_letivo}.${p.periodo_letivo}` }))
      .filter((p) => !seen.has(p.label) && seen.add(p.label))
      .sort((a, b) => b.ano - a.ano || b.periodo - a.periodo);
  },

  async disciplinas(p: Periodo): Promise<Subject[]> {
    const [boletim, turmas] = await Promise.all([
      getAll<BoletimRaw>(`/api/ensino/meu-boletim/${p.ano}/${p.periodo}/`),
      getAll<TurmaVirtualRaw>(`/api/ensino/minhas-turmas-virtuais/${p.ano}/${p.periodo}/`).catch(() => [] as TurmaVirtualRaw[]),
    ]);
    return mergeSubjects(boletim, turmas);
  },

  /** Aulas registradas no mês (conteúdo e faltas por dia). */
  aulas: (ano: number, mes: number) => getAll<Aula>(`/api/ensino/minhas-aulas/${ano}/${mes}/`),

  avaliacoes: () => getAll<Avaliacao>('/api/ensino/minhas-proximas-avaliacoes/'),
  frequencia: (p: Periodo) => get<Frequencia>(`/api/ensino/frequencia-periodo-letivo/${p.ano}/${p.periodo}/`),
  calendario: (p: Periodo) => get<Calendario | null>(`/api/ensino/meu-calendario-academico/${p.ano}/${p.periodo}/`),

  mensagens: async () => {
    const res = await get<{ results: Mensagem[]; count: number }>('/api/ensino/mensagens/entrada/todas/?page=1');
    return res.results ?? [];
  },
  marcarLida: (id: number) => get<void>(`/api/ensino/mensagens/registro-leitura/${id}/`, { method: 'POST' }),
};

function mergeSubjects(boletim: BoletimRaw[], turmas: TurmaVirtualRaw[]): Subject[] {
  const bySigla = new Map(turmas.map((t) => [t.sigla, t]));
  const byName = new Map(turmas.map((t) => [cleanName(t.descricao).toLowerCase(), t]));

  return boletim.map((b) => {
    const sigla = siglaOf(b.disciplina);
    const name = cleanName(b.disciplina);
    const turma = bySigla.get(sigla) ?? byName.get(name.toLowerCase());
    const stages = [1, 2, 4].includes(b.quantidade_avaliacoes) ? b.quantidade_avaliacoes : 2;
    const etapas = [b.nota_etapa_1, b.nota_etapa_2, b.nota_etapa_3, b.nota_etapa_4];
    const rooms = (turma?.locais_de_aula ?? []).map(shortRoom);
    const average = num(b.media_disciplina);
    const finalExam = num(b.nota_avaliacao_final?.nota);
    // media_final_disciplina às vezes vem na escala 0–10 ("7,5") e só vale depois da prova final
    let finalAverage = finalExam !== null ? num(b.media_final_disciplina) : null;
    if (finalAverage !== null && finalAverage <= 10 && (average ?? 0) > 10) finalAverage *= 10;

    return {
      code: b.codigo_diario,
      name,
      sigla,
      status: b.situacao || '',
      stages,
      grades: etapas.slice(0, stages).map((e) => num(e?.nota)),
      finalExam,
      average,
      finalAverage,
      absences: b.numero_faltas || 0,
      workload: b.carga_horaria || 0,
      workloadDone: b.carga_horaria_cumprida || 0,
      attendance: b.percentual_carga_horaria_frequentada ?? 100,
      limit: Math.floor((b.carga_horaria || 0) * 0.25),
      rooms,
      slots: parseHorarios(turma?.horarios_de_aula, rooms[0] ?? ''),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((s, i) => ({ ...s, tone: TONE_ORDER[i % TONE_ORDER.length] }));
}
