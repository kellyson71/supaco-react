// Gera o histórico de viagens a serviço do IFRN (Portal da Transparência) como arquivos estáticos em
// public/dados/viagens. O Portal só lista viagens por órgão e mês, umas 14 páginas por mês: fazer isso com o
// app no ar estouraria o limite da chave (400 requisições por minuto, e quem passa é bloqueado, não recebe 429).
// Aqui a varredura roda fora do ar, devagar, e o app só lê os arquivos.
//
//   npm run viagens                    confere os meses que faltam e refaz os três mais recentes
//   npm run viagens -- --desde 2019-01 começa de outro mês (o padrão é 2011-01, onde o Portal começa)
//
// A chave vem de PORTAL_TRANSPARENCIA_KEY (ambiente ou .env.local). Pode interromper com Ctrl+C: o que já foi
// conferido fica salvo e a próxima execução continua dali.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.VIAGENS_DIR ?? join(import.meta.dirname, '..', 'public', 'dados', 'viagens');
const PORTAL = process.env.PORTAL_URL ?? 'https://api.portaldatransparencia.gov.br/api-de-dados';
/** Código do IFRN no SIAFI. */
const IFRN = '26435';
const PAGE = 15;
/** Uma chamada a cada 700 ms dá perto de 85 por minuto, longe do limite de 400. */
const PAUSE_MS = Number(process.env.PORTAL_PAUSA_MS ?? 700);
/** Meses recentes que o Portal ainda atualiza: sempre conferidos de novo. */
const OPEN_MONTHS = 3;
/** Meses com arquivo próprio, para o resumo de viagens do campus. */
const RECENT_MONTHS = 12;
const SAVE_EVERY = 6;

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const FROM = arg('desde', '2011-01');

const key = process.env.PORTAL_TRANSPARENCIA_KEY
  ?? (existsSync('.env.local') ? readFileSync('.env.local', 'utf8').match(/^PORTAL_TRANSPARENCIA_KEY=(\S+)/m)?.[1] : undefined);
if (!key) { console.error('Falta a chave: defina PORTAL_TRANSPARENCIA_KEY no ambiente ou no .env.local.'); process.exit(1); }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, '0');
const br = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

/** "José  da Silva" → "JOSE DA SILVA" (o mesmo que semAcento em src/lib/suap.ts). */
const semAcento = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();

/**
 * Identificador da pessoa nos arquivos: um hash do nome, para o repositório não virar uma lista de nomes.
 * Tem de ser idêntico a nomeHash em src/lib/suap.ts (cyrb53, 14 dígitos hexadecimais).
 */
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

class Blocked extends Error {}

let calls = 0;
const started = Date.now();

async function page(params) {
  await sleep(PAUSE_MS);
  calls++;
  const r = await fetch(`${PORTAL}/viagens?${new URLSearchParams(params)}`, { headers: { Accept: 'application/json', 'chave-api-dados': key } });
  const text = await r.text();
  if (/bloqueado/i.test(text) || r.status === 401 || r.status === 429) throw new Blocked(text.slice(0, 200));
  if (!r.ok) throw new Error(`O Portal respondeu ${r.status}: ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

/** Todas as páginas de uma consulta; o Portal aceita no máximo um mês em cada intervalo. */
async function consulta(ida, volta) {
  const out = [];
  for (let pagina = 1; pagina <= 80; pagina++) {
    const list = await page({ dataIdaDe: br(ida[0]), dataIdaAte: br(ida[1]), dataRetornoDe: br(volta[0]), dataRetornoAte: br(volta[1]), codigoOrgao: IFRN, pagina: String(pagina) });
    out.push(...list);
    if (list.length < PAGE) break;
  }
  return out;
}

/** Linha de uma viagem: [hash, início, fim, total, diárias, passagens, internacional, motivo]. */
const row = (v) => [
  nomeHash(v.beneficiario?.nome ?? ''),
  v.dataInicioAfastamento ?? '',
  v.dataFimAfastamento ?? '',
  v.valorTotalViagem ?? 0,
  v.valorTotalDiarias ?? 0,
  v.valorTotalPassagem ?? 0,
  /internacional/i.test(v.tipoViagem ?? '') ? 1 : 0,
  (v.viagem?.motivo ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
];

async function mes(ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), last = new Date(Date.UTC(y, m, 0));
  const nextFirst = new Date(Date.UTC(y, m, 1)), nextLast = new Date(Date.UTC(y, m + 1, 0));
  // Quem saiu no mês e voltou no mesmo mês, e depois quem saiu no mês e só voltou no seguinte
  const list = [...await consulta([first, last], [first, last]), ...await consulta([first, last], [nextFirst, nextLast])];
  return list.filter((v) => v.beneficiario?.nome && v.dataInicioAfastamento).map(row);
}

// ---------- Leitura e escrita dos arquivos ----------

/** Viagens já publicadas, por mês de início. */
function load() {
  const byMonth = new Map();
  if (!existsSync(join(OUT, 'index.json'))) return byMonth;
  const index = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'));
  for (const ym of index.meses ?? []) byMonth.set(ym, []);
  const dir = join(OUT, 'p');
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    for (const [hash, rows] of Object.entries(JSON.parse(readFileSync(join(dir, file), 'utf8')))) {
      for (const r of rows) byMonth.get(r[0].slice(0, 7))?.push([hash, ...r]);
    }
  }
  return byMonth;
}

function save(byMonth) {
  const meses = [...byMonth.keys()].sort();
  const all = meses.flatMap((ym) => byMonth.get(ym)).sort((a, b) => b[1].localeCompare(a[1]));

  // Por pessoa: um arquivo para cada começo de hash, com o histórico inteiro de quem cai nele
  const buckets = new Map();
  for (const [hash, ...rest] of all) {
    const b = buckets.get(hash.slice(0, 2)) ?? {};
    (b[hash] ??= []).push(rest);
    buckets.set(hash.slice(0, 2), b);
  }
  rmSync(join(OUT, 'p'), { recursive: true, force: true });
  rmSync(join(OUT, 'm'), { recursive: true, force: true });
  mkdirSync(join(OUT, 'p'), { recursive: true });
  mkdirSync(join(OUT, 'm'), { recursive: true });
  for (const [prefix, b] of buckets) writeFileSync(join(OUT, 'p', `${prefix}.json`), JSON.stringify(b));

  // Por mês: só os mais recentes, para o resumo do campus
  const recentes = meses.slice(-RECENT_MONTHS);
  for (const ym of recentes) writeFileSync(join(OUT, 'm', `${ym}.json`), JSON.stringify(byMonth.get(ym)));

  writeFileSync(join(OUT, 'index.json'), `${JSON.stringify({ atualizado: new Date().toISOString().slice(0, 10), meses, recentes, viagens: all.length })}\n`);
  return all.length;
}

// ---------- Varredura ----------

const now = new Date();
const monthsAgo = (n) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };

const byMonth = load();
const open = new Set(Array.from({ length: OPEN_MONTHS }, (_, i) => monthsAgo(i + 1)));
const todo = [];
for (let n = 1; monthsAgo(n) >= FROM; n++) {
  const ym = monthsAgo(n);
  if (!byMonth.has(ym) || open.has(ym)) todo.push(ym);
}

if (!todo.length) { console.log('Nada a conferir: o histórico já está completo.'); process.exit(0); }
console.log(`${todo.length} ${todo.length === 1 ? 'mês' : 'meses'} a conferir (${todo.at(-1)} a ${todo[0]}), do mais recente para o mais antigo.`);
console.log(`Cerca de ${Math.ceil(todo.length * 15 * PAUSE_MS / 60_000)} minutos. Ctrl+C interrompe sem perder o que já foi feito.\n`);

let interrupted = false;
process.on('SIGINT', () => { interrupted = true; console.log('\nInterrompendo depois deste mês…'); });

let done = 0;
try {
  for (const ym of todo) {
    if (interrupted) break;
    const rows = await mes(ym);
    byMonth.set(ym, rows);
    done++;
    const rate = Math.round(calls / ((Date.now() - started) / 60_000));
    console.log(`${ym}: ${String(rows.length).padStart(3)} viagens   (${done}/${todo.length}, ${calls} chamadas, ${rate}/min)`);
    if (done % SAVE_EVERY === 0) save(byMonth);
  }
} catch (e) {
  if (e instanceof Blocked) console.error(`\nA chave está bloqueada ou foi recusada pelo Portal: ${e.message}\nO desbloqueio é pelo e-mail cadastrado. O que já foi conferido fica salvo.`);
  else console.error(`\nParei por um erro: ${e.message}\nO que já foi conferido fica salvo; rode de novo para continuar.`);
  process.exitCode = 1;
}

if (done) console.log(`\n${save(byMonth)} viagens em ${byMonth.size} meses salvas em public/dados/viagens.`);
