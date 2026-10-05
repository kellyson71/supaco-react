// Função serverless (Vercel): viagens a serviço pagas pelo IFRN num mês, pelo Portal da Transparência.
// O Portal não busca viagens por nome (só por CPF completo), então a função devolve o mês inteiro do órgão,
// enxuto, e o app filtra pela pessoa. Mês fechado não muda mais: fica um mês no cache da CDN.

const PORTAL = 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Código do IFRN no SIAFI. */
const IFRN = '26435';
const PAGE = 15;
/**
 * Pausa entre uma página e outra. O Portal aceita 400 requisições por minuto e bloqueia a chave de quem passa
 * disso; com a pausa, cada consulta fica perto de 90 por minuto e várias pessoas ao mesmo tempo ainda cabem.
 */
const PAUSE_MS = 500;
/** Um mês do IFRN são umas 14 páginas: com as pausas, a função leva perto de 10 segundos. */
export const maxDuration = 30;
/** O IFRN faz perto de 200 viagens por mês (umas 13 páginas); o teto só evita laço infinito. */
const MAX_PAGES = 40;

const DAY = 86_400;

type ViagemRaw = {
  id: number;
  viagem?: { motivo?: string };
  situacao?: string;
  tipoViagem?: string;
  beneficiario?: { nome?: string };
  cargo?: { descricao?: string };
  dataInicioAfastamento?: string;
  dataFimAfastamento?: string;
  valorTotalDiarias?: number;
  valorTotalPassagem?: number;
  valorTotalViagem?: number;
};

class Upstream extends Error {
  constructor(public status: number) { super(`Portal da Transparência respondeu ${status}`); }
}

/**
 * Quem passa do limite por minuto não recebe 429: a chave é bloqueada (o desbloqueio vai por e-mail) e a API
 * passa a responder 200 com um aviso em texto puro. Trata como limite estourado.
 */
async function body<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Upstream(r.status);
  if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Upstream(429);
  return r.json();
}

const br = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

/** Todas as páginas de uma consulta; o Portal aceita no máximo um mês em cada intervalo. */
async function viagens(ida: [Date, Date], volta: [Date, Date], key: string): Promise<ViagemRaw[]> {
  const out: ViagemRaw[] = [];
  for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
    const params = new URLSearchParams({
      dataIdaDe: br(ida[0]), dataIdaAte: br(ida[1]), dataRetornoDe: br(volta[0]), dataRetornoAte: br(volta[1]),
      codigoOrgao: IFRN, pagina: String(pagina),
    });
    const page = await body<ViagemRaw[]>(await fetch(`${PORTAL}/viagens?${params}`, { headers: { Accept: 'application/json', 'chave-api-dados': key } }));
    out.push(...page);
    if (page.length < PAGE) break;
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  return out;
}

export async function GET(request: Request) {
  const mes = new URL(request.url).searchParams.get('mes') ?? '';
  const m = mes.match(/^(20\d{2})-(0[1-9]|1[0-2])$/);
  if (!m) return Response.json({ detail: 'mes inválido (use AAAA-MM)' }, { status: 400 });

  const key = process.env.PORTAL_TRANSPARENCIA_KEY;
  if (!key) return Response.json({ detail: 'PORTAL_TRANSPARENCIA_KEY não configurada' }, { status: 503 });

  const first = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
  const last = new Date(Date.UTC(+m[1], +m[2], 0));
  const nextFirst = new Date(Date.UTC(+m[1], +m[2], 1));
  const nextLast = new Date(Date.UTC(+m[1], +m[2] + 1, 0));
  if (first.getTime() > Date.now()) return Response.json({ mes, viagens: [] }, { headers: { 'Cache-Control': 'no-store' } });

  try {
    // Quem saiu no mês e voltou no mesmo mês, e depois quem saiu no mês e só voltou no seguinte
    const list = [...await viagens([first, last], [first, last], key), ...await viagens([first, last], [nextFirst, nextLast], key)];
    const body = {
      mes,
      viagens: list.map((v) => ({
        id: v.id,
        nome: v.beneficiario?.nome ?? '',
        cargo: v.cargo?.descricao ?? '',
        motivo: (v.viagem?.motivo ?? '').replace(/\s+/g, ' ').trim().slice(0, 400),
        inicio: v.dataInicioAfastamento ?? '',
        fim: v.dataFimAfastamento ?? '',
        diarias: v.valorTotalDiarias ?? 0,
        passagens: v.valorTotalPassagem ?? 0,
        total: v.valorTotalViagem ?? 0,
        internacional: /internacional/i.test(v.tipoViagem ?? ''),
        situacao: v.situacao ?? '',
      })),
    };
    // Os dois meses mais recentes ainda recebem viagens novas; dali para trás, o mês está fechado
    const closed = Date.now() - nextFirst.getTime() > 60 * DAY * 1000;
    return Response.json(body, {
      headers: { 'Cache-Control': `public, s-maxage=${(closed ? 30 : 1) * DAY}, stale-while-revalidate=${60 * DAY}` },
    });
  } catch (e) {
    const status = e instanceof Upstream && e.status === 429 ? 429 : 502;
    return Response.json({ detail: 'Falha ao consultar o Portal da Transparência' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
