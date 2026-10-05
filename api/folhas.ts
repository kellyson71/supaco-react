// Função serverless (Vercel): as últimas folhas publicadas de um servidor no Portal da Transparência,
// para o gráfico de evolução da remuneração. O `id` é o que /api/servidor devolve.
// São até 15 chamadas ao Portal, então o app só pede isto quando a pessoa toca em "Ver evolução".

const PORTAL = 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Quantas folhas o gráfico mostra. */
const MONTHS = 12;
/** A folha sai com dois a três meses de atraso: os primeiros meses consultados vêm vazios. */
const LAG = 3;
/**
 * Pausa entre uma chamada e outra. O Portal aceita 400 requisições por minuto e bloqueia a chave de quem passa
 * disso; com a pausa, cada consulta fica perto de 100 por minuto.
 */
const PAUSE_MS = 400;
export const maxDuration = 30;

const DAY = 86_400;

type Remuneracao = { existeValorMes?: boolean; remuneracaoBasicaBruta?: string; valorTotalRemuneracaoAposDeducoes?: string };

class Upstream extends Error {
  constructor(public status: number) { super(`Portal da Transparência respondeu ${status}`); }
}

/** "12.345,67" → 12345.67 */
const brl = (s: string | undefined) => Number((s ?? '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

/** AAAAMM de `back` meses atrás. */
function mesAno(back: number) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - back);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function folha(id: string, mes: string, key: string) {
  const r = await fetch(`${PORTAL}/servidores/remuneracao?${new URLSearchParams({ id, mesAno: mes, pagina: '1' })}`, {
    headers: { Accept: 'application/json', 'chave-api-dados': key },
  });
  if (!r.ok) throw new Upstream(r.status);
  // Chave bloqueada responde com um aviso em texto puro, não com 429
  if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Upstream(429);
  const list: { remuneracoesDTO?: Remuneracao[] }[] = await r.json();
  const pay = list.flatMap((x) => x.remuneracoesDTO ?? []).find((p) => p.existeValorMes !== false && brl(p.remuneracaoBasicaBruta) > 0);
  return pay ? { mes: `${mes.slice(0, 4)}-${mes.slice(4)}`, bruto: brl(pay.remuneracaoBasicaBruta), liquido: brl(pay.valorTotalRemuneracaoAposDeducoes) } : null;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^\d{1,12}$/.test(id)) return Response.json({ detail: 'id inválido' }, { status: 400 });

  const key = process.env.PORTAL_TRANSPARENCIA_KEY;
  if (!key) return Response.json({ detail: 'PORTAL_TRANSPARENCIA_KEY não configurada' }, { status: 503 });

  try {
    const folhas: NonNullable<Awaited<ReturnType<typeof folha>>>[] = [];
    for (let back = 1; back <= MONTHS + LAG && folhas.length < MONTHS; back++) {
      if (back > 1) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      const f = await folha(id, mesAno(back), key);
      if (f) folhas.push(f);
      // Depois da primeira folha, um mês vazio é o começo do vínculo: não há mais o que buscar
      else if (folhas.length) break;
    }
    return Response.json({ folhas: folhas.reverse() }, {
      headers: { 'Cache-Control': `public, s-maxage=${7 * DAY}, stale-while-revalidate=${30 * DAY}` },
    });
  } catch (e) {
    const status = e instanceof Upstream && (e.status === 429 || e.status === 401) ? 429 : 502;
    return Response.json({ detail: 'Falha ao consultar o Portal da Transparência' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
