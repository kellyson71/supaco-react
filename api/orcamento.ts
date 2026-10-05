// Função serverless (Vercel): quanto o IFRN empenhou, liquidou e pagou em cada um dos últimos anos,
// pelas despesas por órgão do Portal da Transparência. Uma chamada por ano; a resposta fica um dia na CDN.

const PORTAL = 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Código do IFRN no SIAFI. */
const IFRN = '26435';
const YEARS = 5;
/** Pausa entre uma chamada e outra, para ficar longe do limite de 400 por minuto da chave. */
const PAUSE_MS = 400;

const DAY = 86_400;

type Despesa = { ano?: number; empenhado?: string; liquidado?: string; pago?: string };

class Upstream extends Error {
  constructor(public status: number) { super(`Portal da Transparência respondeu ${status}`); }
}

/** "1.234.567,89" → 1234567.89 */
const brl = (s: string | undefined) => Number((s ?? '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

async function ano(year: number, key: string) {
  const r = await fetch(`${PORTAL}/despesas/por-orgao?${new URLSearchParams({ ano: String(year), orgao: IFRN, pagina: '1' })}`, {
    headers: { Accept: 'application/json', 'chave-api-dados': key },
  });
  if (!r.ok) throw new Upstream(r.status);
  // Chave bloqueada responde com um aviso em texto puro, não com 429
  if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Upstream(429);
  const list: Despesa[] = await r.json();
  // O órgão pode vir em mais de uma linha (uma por órgão superior): soma tudo
  const sum = (pick: (d: Despesa) => string | undefined) => list.reduce((a, d) => a + brl(pick(d)), 0);
  return { ano: year, empenhado: sum((d) => d.empenhado), liquidado: sum((d) => d.liquidado), pago: sum((d) => d.pago) };
}

export async function GET() {
  const key = process.env.PORTAL_TRANSPARENCIA_KEY;
  if (!key) return Response.json({ detail: 'PORTAL_TRANSPARENCIA_KEY não configurada' }, { status: 503 });

  try {
    const current = new Date().getUTCFullYear();
    const anos: Awaited<ReturnType<typeof ano>>[] = [];
    for (let y = current - YEARS + 1; y <= current; y++) {
      if (anos.length) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      anos.push(await ano(y, key));
    }
    return Response.json({ anos: anos.filter((a) => a.empenhado > 0) }, {
      headers: { 'Cache-Control': `public, s-maxage=${DAY}, stale-while-revalidate=${30 * DAY}` },
    });
  } catch (e) {
    const status = e instanceof Upstream && (e.status === 429 || e.status === 401) ? 429 : 502;
    return Response.json({ detail: 'Falha ao consultar o Portal da Transparência' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
