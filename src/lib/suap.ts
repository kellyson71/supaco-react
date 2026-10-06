// Endpoints do SUAP usados pelo app e a normalização dos dados para a UI.
import { ApiError, get, getAll, SUAP } from './api';

export { SUAP as SUAP_URL };
import { parseHorarios, shortRoom, type Slot } from './schedule';
import { TONE_ORDER, toneFor, type Tone } from './tones';
import { isoDay, parseDay } from './dates';

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

/** Nota de uma avaliação dentro da etapa (A1, A2...), antes de a etapa fechar. */
export type Parcial = { etapa: number; sigla: string; tipo: string; data: string | null; nota: number | null };
type DisciplinaRaw = { id: number; sigla: string; descricao?: string | null };
type EtapaRaw = { numero_etapa: number; avaliacoes?: { tipo: string; sigla: string; data?: string; nota?: string | number | null }[] | null };

/** Aula do diário (diarios/{id}/aulas): traz o professor que lançou, que o minhas-aulas não tem. */
export type AulaDiario = { data: string; etapa?: number | string; quantidade?: number; professor?: string; conteudo?: string };

export type Frequencia = { total_aulas: number; total_faltas: number; total_abonos: number; percentual_frequencia: number };

type PessoaRaw = { nome: string; matricula: string; foto?: string; email?: string };
type TurmaRaw = {
  professores?: PessoaRaw[];
  participantes?: PessoaRaw[];
  materiais_de_aula?: { url: string; descricao: string; data_vinculacao?: string }[];
};

export type Evento = {
  id: number; nome: string; resumo: string; imagem: string | null; local: string | null;
  inicio: string; fim: string; horaInicio: string | null; horaFim: string | null; periodo: string;
  link: string; site: string | null; inscricoes: { tipo: string; ate: string }[];
};
export type Projeto = { id: string; tipo: 'pesquisa' | 'extensao'; titulo: string; resumo: string; inicio: string | null; fim: string | null; coordenador: string };
export type CampusInfo = { campus: string; eventos: Evento[]; projetos: Projeto[] };

export type CampusStat = { campus_sigla: string; campus_nome: string; alunos_ativos: number; servidores_ativos: number };
export type Estatisticas = {
  alunos_ativos: number; servidores_ativos: number;
  projetos_extensao_em_execucao: number; projetos_pesquisa_em_execucao: number;
  estatisticas_por_campus: CampusStat[];
};

export type Pessoa = { nome: string; matricula: string; foto: string; email?: string };
export type Material = { descricao: string; url: string; data?: string };
export type Turma = { professores: Pessoa[]; colegas: Pessoa[]; materiais: Material[] };

/** Servidor do IFRN como o SUAP lista em rh/servidores (docentes, técnicos e estagiários). */
type ServidorRaw = {
  matricula: string; nome: string; setor_suap: string | null; jornada_trabalho: string | null; campus: string | null; cargo: string | null;
  funcao: string[] | null; disciplina_ingresso: string | null; categoria: string | null;
  url_foto_75x100: string | null; curriculo_lattes: string | null;
};
export type Servidor = {
  matricula: string; nome: string; campus: string; setor: string; cargo: string; jornada: string;
  /** "docente", "tecnico_administrativo" ou "estagiario" */
  categoria: string;
  /** Códigos das funções ativas, como "FUC0001 - CTAL/PF". */
  funcoes: string[];
  /** Área do concurso do docente ("Química"); vazio para os demais. */
  disciplina: string;
  foto: string; lattes: string;
};
export type Unidade = { sigla: string; nome: string };

/** Folha de um mês no Portal da Transparência. `liquido` não inclui `indenizacoes` (auxílios). */
export type Folha = {
  mes: string; bruto: number; liquido: number; irrf: number; previdencia: number; outrosDescontos: number;
  ferias: number; natalina: number; eventuais: number; indenizacoes: number;
};
/** Folha resumida de um mês, para o gráfico de evolução. */
export type FolhaMes = { mes: string; bruto: number; liquido: number };
/**
 * Cadastro e remuneração de um servidor no Portal da Transparência, dos arquivos gerados por scripts/portal.mjs.
 * Datas em "aaaa-mm-dd", `mes` em "aaaa-mm". `folhas` vai do mês mais antigo ao mais novo; `atualizado` é o dia do download.
 */
export type Transparencia =
  | { encontrado: false }
  | {
    encontrado: true; id: number; link: string; atualizado: string;
    cargo: string | null; classe: string | null; nivel: string | null; jornada: string | null; regime: string | null; situacao: string | null;
    lotacao: string | null; exercicio: string | null;
    ingressoOrgao: string | null; ingressoServico: string | null; ingressoCargo: string | null;
    funcao: { nome: string | null; atividade: string | null; unidade: string | null; desde: string | null } | null;
    afastado: boolean; afastamentos: string[];
    remuneracao: Folha | null; folhas: FolhaMes[];
  };

/** Como o servidor vem nos arquivos. `f` guarda a folha de cada mês como [bruto, após deduções, IR, previdência, outros descontos, férias, 13º, eventuais, indenizações], ou 0 se não há. */
type ServidorArquivo = Omit<Extract<Transparencia, { encontrado: true }>, 'encontrado' | 'link' | 'atualizado' | 'remuneracao' | 'folhas'> & { mat: string; f: Record<string, number[] | 0> };
type ServidoresIndex = { atualizado: string; pessoas: number };

/** Viagem a serviço paga pelo IFRN, dos arquivos gerados por scripts/viagens.mjs. */
export type Viagem = { inicio: string; fim: string; total: number; diarias: number; passagens: number; internacional: boolean; motivo: string };
/** Como a viagem vem nos arquivos: [início, fim, total, diárias, passagens, internacional, motivo]. */
type ViagemRow = [string, string, number, number, number, 0 | 1, string];
type ViagensIndex = { atualizado: string; meses: string[]; recentes: string[] };
/** Histórico de viagens de uma pessoa; `desde` e `ate` são os meses ("aaaa-mm") que o histórico cobre. */
export type Viagens = { desde: string; ate: string; viagens: Viagem[] };
/** Viagem de alguém do campus, já ligada à pessoa pela matrícula. */
export type ViagemCampus = Viagem & { matricula: string };

/** Execução do orçamento do IFRN em um ano. */
export type Orcamento = { ano: number; empenhado: number; liquidado: number; pago: number };

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
  /** Por etapa: a nota é a média das avaliações já lançadas (a etapa ainda não fechou). */
  partial?: boolean[];
  /** Dias do horário que o SUAP traz errados e o app corrigiu (ver lib/shifts.ts). */
  moved?: { from: number; to: number }[];
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

/** "José  da Silva" → "JOSE DA SILVA": o formato dos nomes no Portal da Transparência. */
export const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();

/**
 * Identificador de uma pessoa nos arquivos de viagens: um hash do nome (cyrb53, 14 dígitos hexadecimais).
 * Tem de ser idêntico ao de scripts/viagens.mjs.
 */
export function nomeHash(nome: string) {
  const s = semAcento(nome);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const viagem = ([inicio, fim, total, diarias, passagens, internacional, motivo]: ViagemRow): Viagem =>
  ({ inicio, fim, total, diarias, passagens, internacional: !!internacional, motivo });

/** O Portal mascara a matrícula ("123****"): confere só os dígitos que ele deixa à mostra (no mínimo 3). */
function sameMatricula(masked: string, matricula: string) {
  const m = masked.replace(/[^\d*]/g, '');
  const digits = matricula.replace(/\D/g, '');
  if (!digits || m.length !== digits.length) return false;
  return [...m].filter((c) => c !== '*').length >= 3 && [...m].every((c, i) => c === '*' || c === digits[i]);
}

/** Funções (/api) e arquivos (/dados) do próprio app: dado público, sem o token do SUAP. */
async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new ApiError(res.status, `${path.split('?')[0]} respondeu ${res.status}`);
  // Caminho que não existe cai no index.html do app (200 em HTML)
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new ApiError(404, `${path.split('?')[0]} não existe`);
  return res.json();
}

const servidor = (s: ServidorRaw): Servidor => ({
  matricula: s.matricula,
  nome: s.nome,
  campus: s.campus ?? '',
  setor: s.setor_suap ?? '',
  cargo: s.cargo ?? '',
  jornada: s.jornada_trabalho ?? '',
  categoria: s.categoria ?? '',
  funcoes: s.funcao ?? [],
  // O SUAP usa "-" e "None" para quem não entrou por área
  disciplina: /^(-|none)?$/i.test(s.disciplina_ingresso ?? '') ? '' : s.disciplina_ingresso!,
  foto: s.url_foto_75x100 ?? '',
  lattes: s.curriculo_lattes ?? '',
});

export const photoUrl = (foto?: string) => (!foto ? '' : foto.startsWith('http') ? foto : `${SUAP}${foto}`);

/** Uma aula do endpoint minhas-aulas pertence à matéria quando a sigla ou o nome batem. */
export const aulaMatchesSubject = (a: Aula, s: Pick<Subject, 'sigla' | 'name'>) =>
  (s.sigla && a.disciplina.includes(s.sigla)) || cleanName(a.disciplina).toLowerCase() === s.name.toLowerCase();

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
  aulas: async (ano: number, mes: number) => {
    const list = await getAll<Aula>(`/api/ensino/minhas-aulas/${ano}/${mes}/`);
    // O SUAP manda "dd/mm/aaaa"; em ISO dá para ordenar e comparar como texto
    return list.map((a) => { const d = parseDay(a.data); return d ? { ...a, data: isoDay(d) } : a; });
  },

  /**
   * Notas parciais (cada avaliação de cada etapa) por código de diário.
   * O boletim só traz a nota quando a etapa fecha; isto mostra o que já foi lançado antes disso.
   * O formato do semestre na URL não é documentado, então tenta os dois mais prováveis.
   */
  async parciais(p: Periodo, subjects: Pick<Subject, 'code' | 'sigla' | 'name'>[]): Promise<Record<string, Parcial[]>> {
    let list: DisciplinaRaw[] = [];
    for (const sem of [`${p.ano}.${p.periodo}`, `${p.ano}${p.periodo}`]) {
      try { list = await getAll<DisciplinaRaw>(`/api/ensino/disciplinas/${sem}/`); if (list.length) break; } catch { /* tenta o outro formato */ }
    }
    const out: Record<string, Parcial[]> = {};
    await Promise.all(subjects.map(async (s) => {
      const d = list.find((x) => (s.sigla && x.sigla === s.sigla) || cleanName(x.descricao ?? '').toLowerCase() === s.name.toLowerCase());
      if (!d) return;
      try {
        const etapas = await getAll<EtapaRaw>(`/api/ensino/disciplinas/${d.id}/etapas/`);
        out[s.code] = etapas.flatMap((e) => (e.avaliacoes ?? []).map((a) => ({ etapa: e.numero_etapa, sigla: a.sigla, tipo: a.tipo, data: a.data || null, nota: num(a.nota) })));
      } catch { /* matéria sem detalhamento liberado */ }
    }));
    return out;
  },

  /** Aulas do diário com o professor de cada uma (pode não estar liberado: quem chama trata o erro). */
  aulasDiario: async (code: string) => {
    const list = await getAll<AulaDiario>(`/api/ensino/diarios/${code}/aulas/`);
    return list.map((a) => { const d = parseDay(a.data); return d ? { ...a, data: isoDay(d) } : a; });
  },

  /** Eventos e projetos do campus, já filtrados pela função /api/campus. */
  campus: (sigla: string) => get<CampusInfo>(`${window.location.origin}/api/campus?campus=${encodeURIComponent(sigla)}&v=2`),
  estatisticas: async () => (await get<{ results: Estatisticas }>('/api/institucional/estatisticas/')).results,

  /** Servidores de um campus (o SUAP entrega 100 por página, em ordem alfabética). */
  servidores: async (campus: string) => (await getAll<ServidorRaw>(`/api/rh/servidores/?campus=${encodeURIComponent(campus)}`)).map(servidor),
  /** Busca por nome em todos os campi; devolve só a primeira página. */
  buscarServidores: async (nome: string) => {
    const page = await get<{ results: ServidorRaw[]; count: number }>(`/api/rh/servidores/?nome=${encodeURIComponent(nome)}`);
    return { total: page.count, lista: (page.results ?? []).map(servidor) };
  },
  servidor: async (matricula: string) => {
    const page = await get<{ results: ServidorRaw[] }>(`/api/rh/servidores/?matricula=${encodeURIComponent(matricula)}`);
    const found = page.results?.find((s) => s.matricula === matricula);
    return found ? servidor(found) : null;
  },
  unidades: async (): Promise<Unidade[]> =>
    (await getAll<Unidade>('/api/rh/unidades-organizacionais/')).map((u) => ({ sigla: u.sigla, nome: u.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),

  /**
   * Cadastro e folhas do servidor no Portal da Transparência, dos arquivos gerados por scripts/portal.mjs (o Portal
   * não é consultado daqui). Falha, sem ir para o cache, enquanto os arquivos não forem gerados.
   */
  transparencia: async (p: Pick<Pessoa, 'nome' | 'matricula'>): Promise<Transparencia> => {
    const index = await publicGet<ServidoresIndex>('/dados/servidores/index.json');
    if (!index.pessoas) throw new ApiError(404, 'Os arquivos do Portal da Transparência ainda não foram gerados');
    const hash = nomeHash(p.nome);
    const bucket = await publicGet<Record<string, ServidorArquivo[]>>(`/dados/servidores/p/${hash.slice(-2)}.json`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return {} as Record<string, ServidorArquivo[]>;
      throw e;
    });
    // Só aceita nome idêntico (o hash); entre homônimos, a matrícula mascarada desempata. Na dúvida, ninguém.
    const same = bucket[hash] ?? [];
    const found = same.length === 1 ? same[0] : (() => { const m = same.filter((e) => sameMatricula(e.mat, p.matricula)); return m.length === 1 ? m[0] : null; })();
    if (!found) return { encontrado: false };

    const { mat: _mat, f, ...rest } = found;
    void _mat;
    const rows = Object.entries(f).filter((e): e is [string, number[]] => !!e[1]).sort(([a], [b]) => a.localeCompare(b));
    const folha = ([mes, r]: [string, number[]]): Folha => ({
      mes, bruto: r[0], liquido: r[1], irrf: r[2], previdencia: r[3], outrosDescontos: r[4], ferias: r[5], natalina: r[6], eventuais: r[7], indenizacoes: r[8],
    });
    return {
      encontrado: true, ...rest, atualizado: index.atualizado,
      link: `https://portaldatransparencia.gov.br/servidores/${found.id}`,
      remuneracao: rows.length ? folha(rows[rows.length - 1]) : null,
      folhas: rows.map(([mes, r]) => ({ mes, bruto: r[0], liquido: r[1] })),
    };
  },

  /** Quanto o IFRN empenhou, liquidou e pagou nos últimos anos (arquivo gerado por scripts/portal.mjs). */
  orcamento: async () => (await publicGet<{ anos: Orcamento[] }>('/dados/orcamento.json')).anos,

  /** Histórico de viagens a serviço de uma pessoa. Falha (sem ir para o cache) enquanto os arquivos não forem gerados. */
  viagens: async (nome: string): Promise<Viagens> => {
    const index = await publicGet<ViagensIndex>('/dados/viagens/index.json');
    if (!index.meses.length) throw new ApiError(404, 'Os arquivos de viagens ainda não foram gerados');
    const hash = nomeHash(nome);
    // Arquivo que não existe é só um final de hash sem ninguém
    const bucket = await publicGet<Record<string, ViagemRow[]>>(`/dados/viagens/p/${hash.slice(-2)}.json`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return {} as Record<string, ViagemRow[]>;
      throw e;
    });
    return { desde: index.meses[0], ate: index.meses[index.meses.length - 1], viagens: (bucket[hash] ?? []).map(viagem) };
  },
  /** Viagens do IFRN inteiro nos `n` meses mais recentes com dados, cada uma com o hash do nome de quem viajou. */
  viagensRecentes: async (n = 3) => {
    const index = await publicGet<ViagensIndex>('/dados/viagens/index.json');
    const meses = index.recentes.slice(-n);
    const pages = await Promise.all(meses.map((mes) => publicGet<[string, ...ViagemRow][]>(`/dados/viagens/m/${mes}.json`)));
    return { meses, viagens: pages.flat().map(([hash, ...row]) => ({ hash, ...viagem(row) })) };
  },

  avaliacoes: () => getAll<Avaliacao>('/api/ensino/minhas-proximas-avaliacoes/'),
  frequencia: (p: Periodo) => get<Frequencia>(`/api/ensino/frequencia-periodo-letivo/${p.ano}/${p.periodo}/`),
  calendario: (p: Periodo) => get<Calendario | null>(`/api/ensino/meu-calendario-academico/${p.ano}/${p.periodo}/`),

  mensagens: async () => {
    const res = await get<{ results: Mensagem[]; count: number }>('/api/ensino/mensagens/entrada/todas/?page=1');
    return res.results ?? [];
  },
  marcarLida: (id: number) => get<void>(`/api/ensino/mensagens/registro-leitura/${id}/`, { method: 'POST' }),

  /** Professores, colegas e materiais de um diário numa chamada só. */
  async turma(code: string): Promise<Turma> {
    const t = await get<TurmaRaw>(`/api/ensino/minha-turma-virtual/${code}/`);
    const pessoa = (p: PessoaRaw, withEmail: boolean): Pessoa => ({
      nome: p.nome, matricula: p.matricula, foto: photoUrl(p.foto), ...(withEmail && p.email ? { email: p.email } : {}),
    });
    return {
      professores: (t.professores ?? []).map((p) => pessoa(p, true)),
      // E-mail de colega não é exibido, então nem vai para o cache local
      colegas: (t.participantes ?? []).map((p) => pessoa(p, false)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      materiais: (t.materiais_de_aula ?? []).filter((x) => x.url).map((x) => ({ descricao: x.descricao, url: photoUrl(x.url), data: x.data_vinculacao })),
    };
  },
};

const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** "ADRYAN ERYK DE OLIVEIRA" → "Adryan Eryk de Oliveira" */
export const titleCase = (name: string) =>
  name.toLowerCase().split(/\s+/).filter(Boolean)
    .map((w, i) => (i > 0 && PARTICLES.has(w) ? w : w[0].toUpperCase() + w.slice(1))).join(' ');

/** Primeiro e último nome, já normalizados. */
export const shortName = (name: string) => {
  const parts = titleCase(name).split(' ').filter((w) => !PARTICLES.has(w));
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] ?? '';
};

export const initials = (name: string) => shortName(name).split(' ').map((w) => w[0]).join('');

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
