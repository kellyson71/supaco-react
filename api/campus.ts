// Função serverless (Vercel): busca eventos e projetos do SUAP no servidor, filtra pelo campus
// e devolve só o essencial. O SUAP não filtra por campus e cada página tem ~250 KB.

import he from 'he';

const SUAP = 'https://suap.ifrn.edu.br/api';
const EVENT_PAGES = 3;
const PROJECT_PAGES = 2;

type EventoRaw = {
  id: number; nome: string; apresentacao?: string; imagem?: string | null; local?: string;
  data_inicio: string; hora_inicio?: string | null; data_fim?: string | null; hora_fim?: string | null;
  periodo_formatado?: string; campus_sigla?: string | null; link_suap: string; site?: string | null;
  estah_em_periodo_inscricao?: boolean | null; situacao?: string | null;
  periodos_inscricoes?: { tipo_participacao: string; data_fim: string; hora_fim?: string }[];
};

type ProjetoRaw = {
  id: number; titulo: string; resumo?: string; dt_inicio?: string | null; dt_final?: string | null;
  campus_sigla?: string | null; nome_coordenador?: string;
};

class Unauthorized extends Error {}

async function pages<T>(path: string, auth: string, n: number): Promise<T[]> {
  const lists = await Promise.all(Array.from({ length: n }, async (_, i) => {
    const r = await fetch(`${SUAP}${path}?page=${i + 1}`, { headers: { Accept: 'application/json', Authorization: auth } });
    if (r.status === 401) throw new Unauthorized();
    if (!r.ok) return [];
    return ((await r.json()) as { results?: T[] }).results ?? [];
  }));
  return lists.flat();
}

/** O SUAP guarda resumos como HTML colado do Word; vira texto puro. */
const plain = (s: string | undefined) =>
  he.decode((s ?? '').replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

const clip = (s: string | undefined, n: number) => {
  const t = plain(s);
  return t.length > n ? `${t.slice(0, n).replace(/\s\S*$/, '')}…` : t;
};

/** "AVALIAÇÃO DA QUALIDADE" → "Avaliação da qualidade" (só quando vem tudo em maiúsculas). */
const title = (s: string) => {
  const t = plain(s);
  return t === t.toUpperCase() && /\p{L}{4}/u.test(t) ? t.charAt(0) + t.slice(1).toLocaleLowerCase('pt-BR') : t;
};

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);

/** Data de hoje no fuso do RN, no formato yyyy-mm-dd. */
const todayRN = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campus = (url.searchParams.get('campus') ?? '').toUpperCase();
  const auth = request.headers.get('authorization') ?? '';
  if (!/^[A-Z]{1,8}$/.test(campus)) return Response.json({ detail: 'campus inválido' }, { status: 400 });
  if (!/^Bearer [\w.-]+$/.test(auth)) return Response.json({ detail: 'Unauthorized' }, { status: 401 });

  try {
    const [eventos, extensao, pesquisa] = await Promise.all([
      pages<EventoRaw>('/midia/eventos/ativos-deferidos/', auth, EVENT_PAGES),
      pages<ProjetoRaw>('/extensao/projetos/', auth, PROJECT_PAGES),
      pages<ProjetoRaw>('/pesquisa/projetos/', auth, PROJECT_PAGES),
    ]);
    const today = todayRN();
    const seen = new Set<number>();

    const events = eventos
      .filter((e) => e.campus_sigla === campus && (e.data_fim ?? e.data_inicio) >= today && !seen.has(e.id) && seen.add(e.id))
      .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
      .map((e) => ({
        id: e.id,
        nome: title(e.nome),
        resumo: clip(e.apresentacao, 600),
        imagem: e.imagem || null,
        local: plain(e.local) || null,
        inicio: e.data_inicio,
        fim: e.data_fim ?? e.data_inicio,
        horaInicio: hhmm(e.hora_inicio),
        horaFim: hhmm(e.hora_fim),
        periodo: e.periodo_formatado ?? '',
        link: e.link_suap,
        site: e.site || null,
        inscricoes: e.estah_em_periodo_inscricao
          ? (e.periodos_inscricoes ?? []).filter((p) => p.data_fim >= today).map((p) => ({ tipo: p.tipo_participacao, ate: p.data_fim }))
          : [],
      }));

    const projetos = [
      ...extensao.map((p) => ({ ...p, tipo: 'extensao' as const })),
      ...pesquisa.map((p) => ({ ...p, tipo: 'pesquisa' as const })),
    ]
      .filter((p) => p.campus_sigla === campus)
      .sort((a, b) => (b.dt_final ?? '').localeCompare(a.dt_final ?? ''))
      .slice(0, 40)
      .map((p) => ({
        id: `${p.tipo}-${p.id}`,
        tipo: p.tipo,
        titulo: title(p.titulo),
        resumo: clip(p.resumo, 700),
        inicio: p.dt_inicio ?? null,
        fim: p.dt_final ?? null,
        coordenador: plain(p.nome_coordenador),
      }));

    return Response.json({ campus, eventos: events, projetos }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    if (e instanceof Unauthorized) return Response.json({ detail: 'Unauthorized' }, { status: 401 });
    return Response.json({ detail: 'Falha ao consultar o SUAP' }, { status: 502 });
  }
}
