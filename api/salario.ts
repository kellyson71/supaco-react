// Função serverless (Vercel): remuneração de um docente do IFRN no Portal da Transparência.
// A API do Portal exige uma chave pessoal (gratuita), que fica só no servidor, em PORTAL_TRANSPARENCIA_KEY.
// Não pede o token do SUAP: o dado é público e, sem Authorization, a resposta fica no cache da CDN
// e serve a todos os alunos daquele professor, poupando o limite de requisições da chave.

const PORTAL = 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Código do IFRN no SIAPE. */
const IFRN = '26435';
/** A folha sai com dois a três meses de atraso: procura do mês passado para trás, com folga. */
const MONTHS_BACK = 6;

const DAY = 86_400;

type Ficha = {
  matriculaDescaracterizada?: string; cargo?: string; classeCargo?: string; padraoCargo?: string;
  jornadaTrabalho?: string; situacaoServidor?: string; dataIngressoOrgao?: string;
};

type Cadastro = {
  servidor?: {
    idServidorAposentadoPensionista?: number;
    pessoa?: { nome?: string };
    situacao?: string;
    codigoMatriculaFormatado?: string;
  };
  fichasCargoEfetivo?: Ficha[];
  fichasDemaisSituacoes?: Ficha[];
};

type Remuneracao = {
  mesAno?: string; existeValorMes?: boolean;
  remuneracaoBasicaBruta?: string; valorTotalRemuneracaoAposDeducoes?: string;
};

class Upstream extends Error {
  constructor(public status: number) { super(`Portal da Transparência respondeu ${status}`); }
}

async function portal<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const r = await fetch(`${PORTAL}${path}?${new URLSearchParams({ ...params, pagina: '1' })}`, {
    headers: { Accept: 'application/json', 'chave-api-dados': key },
  });
  if (!r.ok) throw new Upstream(r.status);
  return r.json();
}

/** "José  da Silva" → "JOSE DA SILVA", para comparar com o nome do Portal. */
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** "12.345,67" → 12345.67 */
const brl = (s: string | undefined) => Number((s ?? '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

/** O Portal mascara a matrícula ("123****"): confere só os dígitos que ele deixa à mostra. */
function sameMatricula(masked: string | undefined, matricula: string) {
  const m = (masked ?? '').replace(/[^\d*]/g, '');
  if (!matricula || m.length !== matricula.length) return false;
  const shown = [...m].filter((c) => c !== '*').length;
  return shown >= 3 && [...m].every((c, i) => c === '*' || c === matricula[i]);
}

const fichaOf = (c: Cadastro) => c.fichasCargoEfetivo?.[0] ?? c.fichasDemaisSituacoes?.[0];

/** Só aceita nome idêntico; entre homônimos, a matrícula desempata. Na dúvida, não devolve ninguém. */
async function find(nome: string, matricula: string, key: string): Promise<Cadastro | null> {
  for (const filtro of ['orgaoServidorLotacao', 'orgaoServidorExercicio']) {
    const list = await portal<Cadastro[]>('/servidores', { nome, [filtro]: IFRN }, key);
    // Quem tem cargo e função vem repetido na lista, com o mesmo id: é uma pessoa só
    const ids = new Set<number>();
    const same = list.filter((c) => {
      const id = c.servidor?.idServidorAposentadoPensionista;
      return !!id && norm(c.servidor?.pessoa?.nome ?? '') === nome && !ids.has(id) && !!ids.add(id);
    });
    if (same.length === 1) return same[0];
    const byMatricula = same.filter((c) =>
      sameMatricula(c.servidor?.codigoMatriculaFormatado, matricula) || sameMatricula(fichaOf(c)?.matriculaDescaracterizada, matricula));
    if (byMatricula.length === 1) return byMatricula[0];
    if (same.length > 1) return null;
  }
  return null;
}

/** AAAAMM de `back` meses atrás. */
function mesAno(back: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - back);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Folha mais recente já publicada para o servidor. */
async function latestPay(id: number, key: string) {
  for (let back = 1; back <= MONTHS_BACK; back++) {
    const mes = mesAno(back);
    const list = await portal<{ remuneracoesDTO?: Remuneracao[] }[]>('/servidores/remuneracao', { id: String(id), mesAno: mes }, key);
    const pay = list.flatMap((x) => x.remuneracoesDTO ?? []).find((r) => r.existeValorMes !== false && brl(r.remuneracaoBasicaBruta) > 0);
    if (pay) return { mes: `${mes.slice(0, 4)}-${mes.slice(4)}`, bruto: brl(pay.remuneracaoBasicaBruta), liquido: brl(pay.valorTotalRemuneracaoAposDeducoes) };
  }
  return null;
}

const json = (body: unknown, maxAge: number) => Response.json(body, {
  headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${30 * DAY}` },
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nome = norm(url.searchParams.get('nome') ?? '');
  const matricula = (url.searchParams.get('matricula') ?? '').replace(/\D/g, '').slice(0, 12);
  if (!/^[A-Z][A-Z' .-]{4,119}$/.test(nome)) return Response.json({ detail: 'nome inválido' }, { status: 400 });

  const key = process.env.PORTAL_TRANSPARENCIA_KEY;
  if (!key) return Response.json({ detail: 'PORTAL_TRANSPARENCIA_KEY não configurada' }, { status: 503 });

  try {
    const found = await find(nome, matricula, key);
    const id = found?.servidor?.idServidorAposentadoPensionista;
    const pay = id ? await latestPay(id, key) : null;
    if (!found || !id || !pay) return json({ encontrado: false }, DAY);

    const ficha = fichaOf(found);
    return json({
      encontrado: true,
      ...pay,
      cargo: ficha?.cargo || null,
      classe: [ficha?.classeCargo, ficha?.padraoCargo].filter(Boolean).join(' ') || null,
      jornada: ficha?.jornadaTrabalho || null,
      situacao: ficha?.situacaoServidor || found.servidor?.situacao || null,
      link: `https://portaldatransparencia.gov.br/servidores/${id}`,
    }, 7 * DAY);
  } catch (e) {
    // Limite da chave estourado: o app tenta de novo depois
    const status = e instanceof Upstream && e.status === 429 ? 429 : 502;
    return Response.json({ detail: 'Falha ao consultar o Portal da Transparência' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
