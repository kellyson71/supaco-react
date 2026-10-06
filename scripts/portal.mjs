// Baixa do Portal da Transparência os dados públicos dos servidores do IFRN e do orçamento do órgão e os grava como
// arquivos estáticos em public/dados. O app só lê esses arquivos: nenhuma requisição ao Portal sai do navegador nem do
// servidor, então o limite da chave (400 por minuto, e quem passa é bloqueado, não recebe 429) só importa aqui.
//
//   npm run portal                  até 3000 chamadas por execução, depois para e diz quanto falta
//   npm run portal -- --lote 8000   outro limite de chamadas por execução
//   npm run portal -- --meses 6     quantos meses de folha guardar (o padrão é 12)
//   npm run portal -- --cadastro    refaz o cadastro mesmo que seja recente
//
// Cada passo continua de onde parou e pode ser interrompido com Ctrl+C. Uma execução depois da outra completa o
// trabalho; com tudo em dia ela só confere se saiu uma folha nova (poucas chamadas). As viagens têm script próprio
// (npm run viagens).
//
// Passos: 1) cadastro de todos os servidores, 2) orçamento do órgão, 3) folha mês a mês de cada servidor, do mês mais
// novo para o mais antigo (assim a folha atual de todo mundo fica pronta antes do histórico).
//
// Arquivos: public/dados/servidores/p/<2 hex>.json (por pessoa, agrupadas pelos dois últimos dígitos do hash do nome),
// public/dados/servidores/index.json e public/dados/orcamento.json.
// A chave vem de PORTAL_TRANSPARENCIA_KEY (ambiente ou .env.local).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = process.env.DADOS_DIR ?? join(import.meta.dirname, '..', 'public', 'dados');
const DIR = join(DATA, 'servidores');
const PORTAL = process.env.PORTAL_URL ?? 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Código do IFRN no SIAPE (servidores) e no SIAFI (orçamento). */
const IFRN = '26435';
const PAGE = 15;
/**
 * Cada consulta espera 700 ms antes de sair e o Portal leva cerca de 1 s para responder. Com 3 consultas em paralelo
 * isso dá de 150 a 240 por minuto, abaixo do limite de 400 (o cadastro e o orçamento são sequenciais: ~40 por minuto).
 */
const PAUSE_MS = Number(process.env.PORTAL_PAUSA_MS ?? 700);
const PARALLEL = Number(process.env.PORTAL_PARALELO ?? 3);
const CADASTRO_DIAS = 30;
const ORCAMENTO_DIAS = 7;
const ORCAMENTO_ANOS = 5;
/** Meses para trás a procurar a folha mais recente publicada (ela sai com dois a três meses de atraso). */
const PROBE_MONTHS = 8;
const SAVE_EVERY = 150;

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BUDGET = Number(arg('lote', 3000));
const MESES = Number(arg('meses', 12));
const FORCE_CADASTRO = process.argv.includes('--cadastro');

const key = process.env.PORTAL_TRANSPARENCIA_KEY
  ?? (existsSync('.env.local') ? readFileSync('.env.local', 'utf8').match(/^PORTAL_TRANSPARENCIA_KEY=(\S+)/m)?.[1] : undefined);
if (!key) { console.error('Falta a chave: defina PORTAL_TRANSPARENCIA_KEY no ambiente ou no .env.local.'); process.exit(1); }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, '0');
const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => (iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : Infinity);

/** "José  da Silva" → "JOSE DA SILVA" (o mesmo que semAcento em src/lib/suap.ts). */
const semAcento = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();

/** Mesmo hash de nomeHash em src/lib/suap.ts e de scripts/viagens.mjs (cyrb53, 14 dígitos hexadecimais). */
function nomeHash(nome) {
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

/** "12.345,67" → 12345.67 */
const brl = (s) => Number(String(s ?? '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
/** "31/01/2015" → "2015-01-31" */
const iso = (s) => { const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
/** O Portal usa "Sem informação", "-1" e afins no lugar de vazio. */
const text = (s) => (s && !/^(sem informa|-\d|inv[aá]lido)/i.test(String(s).trim()) ? String(s).trim() : null);

class Blocked extends Error {}
/** O Portal recusou esta consulta em particular (400), mas a chave está boa. */
class BadQuery extends Error {}
class OutOfBudget extends Error {}

let calls = 0;
const started = Date.now();

async function api(path, params) {
  if (calls >= BUDGET) throw new OutOfBudget();
  await sleep(PAUSE_MS);
  calls++;
  const r = await fetch(`${PORTAL}${path}?${new URLSearchParams(params)}`, { headers: { Accept: 'application/json', 'chave-api-dados': key } });
  const body = await r.text();
  if (/bloqueado/i.test(body) || r.status === 401 || r.status === 429) throw new Blocked(body.slice(0, 200));
  if (r.status === 400) throw new BadQuery(body.slice(0, 120));
  if (!r.ok) throw new Error(`O Portal respondeu ${r.status} em ${path}: ${body.slice(0, 120)}`);
  return JSON.parse(body);
}

// ---------- Estado em disco ----------

/** Pessoas por id do Portal. `h` é o hash do nome; `f` as folhas por mês ("aaaa-mm" → linha, ou 0 se não há). */
let people = new Map();
let meta = { atualizado: '', cadastro: '', orcamento: '', ultimoMes: '', meses: [], pessoas: 0 };

function load() {
  const dir = join(DIR, 'p');
  if (existsSync(join(DIR, 'index.json'))) meta = { ...meta, ...JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) };
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    for (const [h, list] of Object.entries(JSON.parse(readFileSync(join(dir, file), 'utf8')))) {
      for (const { f, ...rest } of list) people.set(rest.id, { ...rest, h, f: f ?? {} });
    }
  }
}

function save() {
  mkdirSync(join(DIR, 'p'), { recursive: true });
  const buckets = new Map();
  for (const { h, ...person } of people.values()) {
    const b = buckets.get(h.slice(-2)) ?? {};
    (b[h] ??= []).push(person);
    buckets.set(h.slice(-2), b);
  }
  // Apaga só os arquivos que ficaram sem ninguém (o resto é reescrito)
  for (const file of readdirSync(join(DIR, 'p'))) if (!buckets.has(file.slice(0, 2))) writeFileSync(join(DIR, 'p', file), '{}');
  for (const [prefix, b] of buckets) writeFileSync(join(DIR, 'p', `${prefix}.json`), JSON.stringify(b));
  meta = { ...meta, atualizado: today(), pessoas: people.size };
  writeFileSync(join(DIR, 'index.json'), `${JSON.stringify(meta)}\n`);
}

// ---------- 1. Cadastro ----------

const fichaOf = (c) => c.fichasCargoEfetivo?.[0] ?? c.fichasDemaisSituacoes?.[0];

function cadastro(c) {
  const f = fichaOf(c), fn = c.fichasFuncao?.[0];
  return {
    id: c.servidor.idServidorAposentadoPensionista,
    mat: c.servidor.codigoMatriculaFormatado ?? f?.matriculaDescaracterizada ?? '',
    cargo: text(f?.cargo), classe: [text(f?.classeCargo), text(f?.padraoCargo)].filter(Boolean).join(' ') || null, nivel: text(f?.nivelCargo),
    jornada: text(f?.jornadaTrabalho), regime: text(f?.regimeJuridico), situacao: text(f?.situacaoServidor) ?? text(c.servidor.situacao),
    lotacao: text(f?.uorgLotacao), exercicio: text(f?.uorgExercicio),
    ingressoOrgao: iso(f?.dataIngressoOrgao), ingressoServico: iso(f?.dataIngressoServicoPublico), ingressoCargo: iso(f?.dataIngressoCargo),
    funcao: fn && text(fn.funcao) ? { nome: text(fn.funcao), atividade: text(fn.atividade), unidade: text(fn.uorgExercicio), desde: iso(fn.dataIngressoFuncao) } : null,
    afastado: !!c.servidor.flagAfastado, afastamentos: (f?.afastamentos ?? []).slice(0, 5),
  };
}

async function passoCadastro() {
  if (!FORCE_CADASTRO && people.size && daysSince(meta.cadastro) < CADASTRO_DIAS) { console.log(`Cadastro: ${people.size} servidores, de ${meta.cadastro} (refaz depois de ${CADASTRO_DIAS} dias).`); return; }
  console.log('Cadastro: lendo os servidores do IFRN (lotação e exercício)…');
  const fresh = new Map();
  for (const filtro of ['orgaoServidorLotacao', 'orgaoServidorExercicio']) {
    for (let pagina = 1; pagina <= 500; pagina++) {
      const list = await api('/servidores', { [filtro]: IFRN, pagina: String(pagina) });
      for (const c of list) {
        const id = c.servidor?.idServidorAposentadoPensionista, nome = c.servidor?.pessoa?.nome;
        // Quem tem cargo e função vem repetido na lista, com o mesmo id: é uma pessoa só
        if (id && nome && !fresh.has(id)) fresh.set(id, { ...cadastro(c), h: nomeHash(nome) });
      }
      if (pagina % 20 === 0) console.log(`  ${filtro}: página ${pagina}, ${fresh.size} servidores`);
      if (list.length < PAGE) break;
    }
  }
  // Quem saiu do IFRN some; quem ficou mantém as folhas já baixadas
  people = new Map([...fresh].map(([id, p]) => [id, { ...p, f: people.get(id)?.f ?? {} }]));
  meta.cadastro = today();
  save();
  console.log(`Cadastro: ${people.size} servidores.`);
}

// ---------- 2. Orçamento ----------

async function passoOrcamento() {
  const file = join(DATA, 'orcamento.json');
  if (existsSync(file) && daysSince(JSON.parse(readFileSync(file, 'utf8')).atualizado) < ORCAMENTO_DIAS) { console.log('Orçamento: em dia.'); return; }
  console.log('Orçamento: lendo as despesas do IFRN por ano…');
  const current = new Date().getUTCFullYear(), anos = [];
  for (let ano = current - ORCAMENTO_ANOS + 1; ano <= current; ano++) {
    const list = await api('/despesas/por-orgao', { ano: String(ano), orgao: IFRN, pagina: '1' });
    // O órgão pode vir em mais de uma linha (uma por órgão superior): soma tudo
    const sum = (pick) => list.reduce((a, d) => a + brl(pick(d)), 0);
    const row = { ano, empenhado: sum((d) => d.empenhado), liquidado: sum((d) => d.liquidado), pago: sum((d) => d.pago) };
    if (row.empenhado > 0) anos.push(row);
  }
  mkdirSync(DATA, { recursive: true });
  writeFileSync(file, `${JSON.stringify({ atualizado: today(), anos })}\n`);
  console.log(`Orçamento: ${anos.length} anos.`);
}

// ---------- 3. Folhas ----------

const monthsAgo = (n) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - n); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };

/** Linha da folha: [bruto, após deduções, IR, previdência, outros descontos, férias, 13º, eventuais, indenizações]. */
function folhaRow(list) {
  const p = list.flatMap((x) => x.remuneracoesDTO ?? []).find((r) => r.existeValorMes !== false && brl(r.remuneracaoBasicaBruta) > 0);
  if (!p) return 0;
  return [brl(p.remuneracaoBasicaBruta), brl(p.valorTotalRemuneracaoAposDeducoes), Math.abs(brl(p.impostoRetidoNaFonte)), Math.abs(brl(p.previdenciaOficial)),
    Math.abs(brl(p.outrasDeducoesObrigatorias)), brl(p.ferias), brl(p.gratificacaoNatalina), brl(p.outrasRemuneracoesEventuais), brl(p.verbasIndenizatorias)];
}

let recusadas = 0;
async function fetchFolha(id, mes) {
  // Algumas consultas dão 400 no Portal ("Erro ao executar a consulta"): tenta de novo uma vez e, se persistir, trata como sem folha
  for (let tentativa = 1; ; tentativa++) {
    try {
      return folhaRow(await api('/servidores/remuneracao', { id: String(id), mesAno: mes.replace('-', ''), pagina: '1' }));
    } catch (e) {
      if (!(e instanceof BadQuery)) throw e;
      if (tentativa === 2) { recusadas++; console.log(`  o Portal recusou a folha de ${mes} do servidor ${id}; seguindo sem ela`); return 0; }
    }
  }
}

/** O mês mais recente com folha publicada, procurando em poucas pessoas. */
async function ultimoMes() {
  const sample = [...people.values()].filter((p) => !p.ingressoOrgao || p.ingressoOrgao < monthsAgo(PROBE_MONTHS)).slice(0, 3);
  for (let back = 1; back <= PROBE_MONTHS; back++) {
    const mes = monthsAgo(back);
    for (const p of sample) {
      // Não guarda o resultado: um mês vazio hoje (ainda não publicado) pode ter folha na próxima execução
      if (await fetchFolha(p.id, mes)) return mes;
    }
  }
  return null;
}

async function passoFolhas() {
  if (!people.size) return;
  const last = await ultimoMes();
  if (!last) { console.log('Folhas: nenhuma folha publicada nos últimos meses.'); return; }
  const [y, m] = last.split('-').map(Number);
  const target = Array.from({ length: MESES }, (_, i) => { const d = new Date(Date.UTC(y, m - 1 - i, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; });
  meta.ultimoMes = last;
  meta.meses = [...target].reverse();

  // Do mês mais novo para o mais antigo; quem ainda não tinha entrado no IFRN naquele mês não precisa de chamada
  const todo = [];
  for (const mes of target) {
    for (const p of people.values()) {
      if (p.f[mes] !== undefined) continue;
      if (p.ingressoOrgao && p.ingressoOrgao.slice(0, 7) > mes) p.f[mes] = 0;
      else todo.push([p, mes]);
    }
  }
  const total = people.size * MESES;
  if (!todo.length) { console.log(`Folhas: em dia (${last}, ${MESES} meses, ${people.size} pessoas).`); return; }
  console.log(`Folhas: ${todo.length} consultas a fazer para ${target.at(-1)} a ${last} (de ${total}).`);

  let done = 0, next = 0, failure = null;
  const worker = async () => {
    while (next < todo.length && !failure) {
      const [p, mes] = todo[next++];
      // Quem não tem folha no mês mais recente (inativo, pensionista) não tem as mais antigas: poupa a chamada
      if (mes !== last && p.f[last] === 0) { p.f[mes] = 0; continue; }
      try {
        p.f[mes] = await fetchFolha(p.id, mes);
      } catch (e) {
        failure ??= e;
        return;
      }
      done++;
      if (done % SAVE_EVERY === 0) {
        const rate = Math.round(calls / ((Date.now() - started) / 60_000));
        console.log(`  ${done}/${todo.length} (${calls} chamadas, ${rate}/min, mês ${mes})`);
        save();
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  if (failure) throw failure;
  console.log(`Folhas: ${done} consultas feitas, tudo em dia.`);
}

// ---------- Execução ----------

load();
process.on('SIGINT', () => { console.log('\nInterrompendo…'); save(); process.exit(130); });

try {
  await passoCadastro();
  await passoOrcamento();
  await passoFolhas();
} catch (e) {
  if (e instanceof OutOfBudget) console.log(`\nLimite de ${BUDGET} chamadas desta execução. Rode de novo para continuar de onde parou.`);
  else if (e instanceof Blocked) { console.error(`\nA chave está bloqueada ou foi recusada pelo Portal: ${e.message}\nO desbloqueio é pelo e-mail cadastrado. O que já foi baixado fica salvo.`); process.exitCode = 1; }
  else { console.error(`\nParei por um erro: ${e.message}\nO que já foi baixado fica salvo; rode de novo para continuar.`); process.exitCode = 1; }
}
if (people.size) save();
const left = [...people.values()].reduce((a, p) => a + (p.f[meta.ultimoMes] === 0 ? 0 : (meta.meses ?? []).filter((mes) => p.f[mes] === undefined).length), 0);
if (recusadas) console.log(`\n${recusadas} consultas recusadas pelo Portal (tratadas como sem folha).`);
console.log(`\n${calls} chamadas em ${Math.round((Date.now() - started) / 1000)} s. ${people.size} servidores salvos${left ? `; faltam ${left} consultas de folha (cerca de ${Math.ceil(left / 85)} minutos).` : ', folhas em dia.'}`);
