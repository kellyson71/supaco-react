import { useEffect, useMemo, useState } from 'react';
import { useEu, useServidores, useUnidades } from '../lib/data';
import { api, nomeHash, semAcento, titleCase, type Servidor } from '../lib/suap';
import { campusNome, CATEGORIAS, funcaoLabel, ocupacao } from '../lib/staff';
import { Link } from './Link';
import { Face, SeeDetails } from './Turma';
import { Badge, Button, Card, Chip, cx, Empty, ErrorNote, Icon, Select, Skeleton } from './ui';

const PAGE = 60;
const ALL = '*';

type Sort = 'nome' | 'salario' | 'liquido' | 'viagens' | 'gasto' | 'casa';
/** `first` descreve a ordem natural; `last`, a invertida (botão ao lado do seletor). */
const SORTS: Record<Sort, { label: string; first: string; last: string }> = {
  nome: { label: 'Nome', first: 'A–Z', last: 'Z–A' },
  salario: { label: 'Salário bruto', first: 'Maior primeiro', last: 'Menor primeiro' },
  liquido: { label: 'Salário líquido', first: 'Maior primeiro', last: 'Menor primeiro' },
  viagens: { label: 'Número de viagens', first: 'Mais primeiro', last: 'Menos primeiro' },
  gasto: { label: 'Gasto em viagens', first: 'Maior primeiro', last: 'Menor primeiro' },
  casa: { label: 'Tempo de casa', first: 'Mais antigos primeiro', last: 'Mais recentes primeiro' },
};
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Filtros avançados; tudo em texto para o campo poder ficar vazio. Salário é o bruto do mês mais recente. */
type Adv = { setor: string; jornada: string; salMin: string; salMax: string; viagensMin: string; casaMin: string };
const NO_ADV: Adv = { setor: '', jornada: '', salMin: '', salMax: '', viagensMin: '', casaMin: '' };
const num = (v: string) => { const n = parseFloat(v.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

const PREF_KEY = 'supaco:staff-sort';
function loadPref(): { sort: Sort; reverse: boolean } {
  try {
    const { sort, reverse } = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return { sort: sort in SORTS ? sort : 'nome', reverse: reverse === true };
  } catch { return { sort: 'nome', reverse: false }; }
}

type Filter = 'todos' | 'docente' | 'tecnico_administrativo' | 'estagiario' | 'gestao';

// Só o próprio campus vai para o cache do aparelho (useServidores). Os outros campi e as buscas ficam
// em memória enquanto o app está aberto: cada lista tem centenas de pessoas e encheria o armazenamento.
const memo = new Map<string, Promise<unknown>>();

function useSession<T>(key: string | null, fn: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: Error }>();
  useEffect(() => {
    if (!key) return;
    let alive = true;
    let pending = memo.get(key) as Promise<T> | undefined;
    if (!pending) {
      pending = fn();
      memo.set(key, pending);
      pending.catch(() => memo.delete(key));
    }
    pending.then((data) => { if (alive) setState({ key, data }); }, (error: Error) => { if (alive) setState({ key, error }); });
    return () => { alive = false; };
  }, [key]);
  const current = state?.key === key ? state : undefined;
  return { data: current?.data, error: current?.error, loading: !!key && !current };
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Diretório de servidores do IFRN: o campus da pessoa por padrão, com busca e filtro por categoria. */
export function StaffDirectory() {
  const { data: eu } = useEu();
  const { data: unidades } = useUnidades();
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [pref, setPref] = useState(loadPref);
  const { sort, reverse } = pref;
  const [adv, setAdv] = useState<Adv>(NO_ADV);
  const [advOpen, setAdvOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const mine = eu?.campus;
  const campus = picked ?? mine ?? '';
  const everywhere = campus === ALL;
  const term = semAcento(q);
  const remoteTerm = useDebounced(q.trim(), 350);

  const own = useServidores(campus === mine ? mine : undefined);
  const other = useSession(campus && !everywhere && campus !== mine ? `campus:${campus}` : null, () => api.servidores(campus));
  const search = useSession(everywhere && remoteTerm.length >= 3 ? `busca:${remoteTerm.toLowerCase()}` : null, () => api.buscarServidores(remoteTerm));

  const source = everywhere ? { data: search.data?.lista, loading: search.loading, error: search.error } : campus === mine ? own : other;
  const base = source.data;

  const haystack = useMemo(() => new Map((base ?? []).map((s) => [s.matricula, semAcento(`${s.nome} ${s.setor} ${s.cargo} ${s.disciplina}`)])), [base]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: base?.length ?? 0, docente: 0, tecnico_administrativo: 0, estagiario: 0, gestao: 0 };
    base?.forEach((s) => {
      if (s.categoria in c) c[s.categoria as Filter]++;
      if (s.funcoes.length) c.gestao++;
    });
    return c;
  }, [base]);

  const list = useMemo(() => (base ?? []).filter((s) =>
    (filter === 'todos' || (filter === 'gestao' ? s.funcoes.length > 0 : s.categoria === filter))
    // Em "todos os campi" a busca já foi feita pelo SUAP
    && (everywhere || !term || haystack.get(s.matricula)!.includes(term))), [base, filter, term, everywhere, haystack]);

  const salMin = num(adv.salMin), salMax = num(adv.salMax), viagensMin = num(adv.viagensMin), casaMin = num(adv.casaMin);
  // Os arquivos de folha e de viagens são grandes: só baixam quando uma ordem ou um filtro precisa deles
  const needFolhas = sort === 'salario' || sort === 'liquido' || sort === 'casa' || salMin != null || salMax != null || casaMin != null;
  const needViagens = sort === 'viagens' || sort === 'gasto' || viagensMin != null;
  const folhas = useSession(needFolhas ? 'rank:folhas' : null, () => api.folhasRecentes());
  const viagens = useSession(needViagens ? 'rank:viagens' : null, () => api.viagensPorPessoa());

  /** Dados do Portal e das viagens de uma pessoa; cada campo é undefined enquanto o arquivo não chegou ou se ela não consta nele. */
  const info = (s: Servidor) => {
    const hash = nomeHash(s.nome);
    const all = folhas.data?.get(hash) ?? [];
    const d = s.matricula.replace(/\D/g, '');
    const f = all.length === 1 ? all[0] : all.find((e) => { const m = e.mat.replace(/[^\d*]/g, ''); return m.length === d.length && [...m].every((c, i) => c === '*' || c === d[i]); });
    const v = viagens.data ? (viagens.data.get(hash) ?? { n: 0, total: 0 }) : undefined;
    const anos = f?.ingresso ? Math.floor((Date.now() - Date.parse(f.ingresso)) / 31557600000) : undefined;
    return { f, v, anos };
  };

  /** Valor pelo qual `s` é ordenado e o texto do selo no cartão. */
  const metric = (s: Servidor): { value: number; label: string } | undefined => {
    const { f, v, anos } = info(s);
    switch (sort) {
      case 'salario': return f && { value: f.bruto, label: brl(f.bruto) };
      case 'liquido': return f && { value: f.liquido, label: brl(f.liquido) };
      case 'viagens': return v && { value: v.n, label: `${v.n} ${v.n === 1 ? 'viagem' : 'viagens'}` };
      case 'gasto': return v && { value: v.total, label: brl(v.total) };
      case 'casa': return f?.ingresso && anos != null ? { value: -Date.parse(f.ingresso), label: anos < 1 ? 'menos de 1 ano de casa' : `${anos} ${anos === 1 ? 'ano' : 'anos'} de casa` } : undefined;
      default: return undefined;
    }
  };

  const setores = useMemo(() => [...new Set((base ?? []).map((s) => s.setor).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [base]);
  const jornadas = useMemo(() => [...new Set((base ?? []).map((s) => s.jornada).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [base]);
  const advCount = Object.values(adv).filter(Boolean).length;
  const waiting = (needFolhas && folhas.loading) || (needViagens && viagens.loading);

  const sorted = useMemo(() => {
    const keep = list.filter((s) => {
      if (adv.setor && s.setor !== adv.setor) return false;
      if (adv.jornada && s.jornada !== adv.jornada) return false;
      if (salMin == null && salMax == null && viagensMin == null && casaMin == null) return true;
      const { f, v, anos } = info(s);
      // Enquanto o arquivo carrega, ninguém é cortado; depois, quem não consta nele sai
      if ((salMin != null || salMax != null) && folhas.data && (!f || (salMin != null && f.bruto < salMin) || (salMax != null && f.bruto > salMax))) return false;
      if (casaMin != null && folhas.data && (anos == null || anos < casaMin)) return false;
      if (viagensMin != null && v && v.n < viagensMin) return false;
      return true;
    });
    const rows = keep.map((s) => ({ s, m: metric(s) }));
    const dir = reverse ? -1 : 1;
    if (sort === 'nome') return rows.sort((a, b) => dir * a.s.nome.localeCompare(b.s.nome, 'pt-BR'));
    if (waiting) return rows;
    // Quem não aparece nos arquivos vai para o fim, qualquer que seja o sentido
    return rows.sort((a, b) => {
      if (!a.m || !b.m) return a.m ? -1 : b.m ? 1 : 0;
      return dir * (b.m.value - a.m.value);
    });
  }, [list, adv, sort, reverse, folhas.data, viagens.data, waiting]);

  useEffect(() => setShown(PAGE), [campus, filter, term, sort, reverse, adv]);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch { /* armazenamento bloqueado */ } }, [pref]);

  const campi = useMemo(() => (unidades ?? []).filter((u) => !/^(conselho|col[eé]gio)/i.test(u.nome)), [unidades]);
  const campusLabel = everywhere ? 'todo o IFRN' : campusNome(campi.find((u) => u.sigla === campus)?.nome ?? campus);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-surface-container-high px-4 transition-shadow focus-within:ring-2 focus-within:ring-primary">
          <Icon name="search" className="text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={everywhere ? 'Nome do servidor (3 letras ou mais)' : 'Buscar por nome, setor ou cargo'} aria-label="Buscar servidor"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-on-surface-variant" />
          {q && <button onClick={() => setQ('')} aria-label="Limpar busca" className="text-on-surface-variant"><Icon name="close" size={20} /></button>}
        </label>
        <Select label="Campus" icon="apartment" value={campus} className="self-start md:max-w-64 md:self-auto" onChange={(v) => { setPicked(v); setFilter('todos'); }}
          options={[
            ...(!campi.some((u) => u.sigla === campus) && !everywhere ? [{ value: campus, label: campus || 'Campus' }] : []),
            ...campi.map((u) => ({ value: u.sigla, label: campusNome(u.nome), hint: u.sigla === mine ? 'seu campus' : undefined })),
            { value: ALL, label: 'Todo o IFRN' },
          ]} />
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Select label="Ordenar por" icon="sort" value={sort} onChange={(v) => setPref({ ...pref, sort: v })}
            options={(Object.keys(SORTS) as Sort[]).map((k) => ({ value: k, label: SORTS[k].label }))} />
          <button onClick={() => setPref({ ...pref, reverse: !reverse })} aria-label={`Sentido da ordem: ${reverse ? SORTS[sort].last : SORTS[sort].first}. Tocar para inverter`}
            title={reverse ? SORTS[sort].last : SORTS[sort].first}
            className="state relative flex h-12 shrink-0 items-center gap-1 rounded-full border border-outline-variant px-3 text-sm font-medium text-on-surface">
            <Icon name={reverse ? 'arrow_upward' : 'arrow_downward'} size={20} className="text-primary" />
            <span className="hidden whitespace-nowrap sm:inline">{reverse ? SORTS[sort].last : SORTS[sort].first}</span>
          </button>
          <button onClick={() => setAdvOpen((o) => !o)} aria-expanded={advOpen} aria-label="Filtros avançados"
            className={cx('state relative flex h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium',
              advOpen || advCount ? 'border-transparent bg-secondary-container text-on-secondary-container' : 'border-outline-variant text-on-surface')}>
            <Icon name="tune" size={20} className={advOpen || advCount ? undefined : 'text-primary'} />
            Filtros{advCount > 0 && <span className="tabular grid size-5 place-items-center rounded-full bg-primary text-xs text-on-primary">{advCount}</span>}
          </button>
        </div>
      </div>

      {advOpen && (
        <Card className="rounded-2xl p-4" variant="filled">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Setor"><Select label="Setor" value={adv.setor} onChange={(v) => setAdv({ ...adv, setor: v })} menuClassName="max-h-64"
              options={[{ value: '', label: 'Todos os setores' }, ...setores.map((x) => ({ value: x, label: x }))]} /></Field>
            <Field label="Jornada"><Select label="Jornada" value={adv.jornada} onChange={(v) => setAdv({ ...adv, jornada: v })}
              options={[{ value: '', label: 'Todas as jornadas' }, ...jornadas.map((x) => ({ value: x, label: x }))]} /></Field>
            <Field label="Salário bruto (R$)">
              <div className="flex items-center gap-2">
                <NumInput label="Salário bruto mínimo" placeholder="Mín." value={adv.salMin} onChange={(v) => setAdv({ ...adv, salMin: v })} />
                <span className="text-on-surface-variant">–</span>
                <NumInput label="Salário bruto máximo" placeholder="Máx." value={adv.salMax} onChange={(v) => setAdv({ ...adv, salMax: v })} />
              </div>
            </Field>
            <Field label="Viagens (mínimo)"><NumInput label="Mínimo de viagens" placeholder="Ex.: 3" value={adv.viagensMin} onChange={(v) => setAdv({ ...adv, viagensMin: v })} /></Field>
            <Field label="Tempo de casa (anos, mínimo)"><NumInput label="Mínimo de anos de casa" placeholder="Ex.: 10" value={adv.casaMin} onChange={(v) => setAdv({ ...adv, casaMin: v })} /></Field>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant">Salário, viagens e tempo de casa vêm do Portal da Transparência; quem não consta nele sai da lista quando o filtro está ligado.</p>
            {advCount > 0 && <Button variant="text" icon="close" onClick={() => setAdv(NO_ADV)} className="shrink-0">Limpar</Button>}
          </div>
        </Card>
      )}

      {base && base.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip label={`Todos (${counts.todos})`} selected={filter === 'todos'} onClick={() => setFilter('todos')} />
          {(['docente', 'tecnico_administrativo', 'estagiario'] as const).filter((c) => counts[c] > 0).map((c) => (
            <Chip key={c} label={`${CATEGORIAS[c].plural} (${counts[c]})`} icon={CATEGORIAS[c].icon} selected={filter === c} onClick={() => setFilter(c)} />
          ))}
          {counts.gestao > 0 && <Chip label={`Com função (${counts.gestao})`} icon="workspace_premium" selected={filter === 'gestao'} onClick={() => setFilter('gestao')} />}
        </div>
      )}

      {everywhere && remoteTerm.length < 3 ? (
        <Card className="rounded-2xl"><Empty icon="search" title="Busque em todo o IFRN">Digite ao menos três letras do nome. Para ver a lista completa, escolha um campus.</Empty></Card>
      ) : source.loading || !campus ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-2xl" />)}</div>
      ) : source.error && !base ? (
        <ErrorNote error={source.error} />
      ) : list.length === 0 ? (
        <Card className="rounded-2xl"><Empty icon="search_off" title="Ninguém encontrado">Confira a grafia ou procure em outro campus.</Empty></Card>
      ) : (
        <>
          <p className="px-1 text-sm text-on-surface-variant">
            {list.length} {list.length === 1 ? 'pessoa' : 'pessoas'} em {campusLabel}
            {everywhere && search.data && search.data.total > list.length && ` (de ${search.data.total}: refine a busca para ver o resto)`}
          </p>
          {waiting && <p className="px-1 text-sm text-on-surface-variant">Carregando dados do Portal da Transparência…</p>}
          {folhas.error && needFolhas && <ErrorNote error={folhas.error} />}
          {viagens.error && needViagens && <ErrorNote error={viagens.error} />}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.slice(0, shown).map(({ s, m }) => <li key={s.matricula}><StaffCard s={s} showCampus={everywhere} extra={m?.label} /></li>)}
          </ul>
          {list.length > shown && (
            <Button variant="tonal" icon="expand_more" onClick={() => setShown(shown + PAGE)} className="self-center">Mostrar mais {Math.min(PAGE, list.length - shown)}</Button>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><span className="px-1 text-xs font-medium text-on-surface-variant">{label}</span>{children}</div>;
}

function NumInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder={placeholder} aria-label={label}
      className="tabular h-12 w-full min-w-0 rounded-full border border-outline-variant bg-transparent px-4 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary" />
  );
}

/** Cartão de uma pessoa do diretório: o cartão inteiro leva à página dela, com o "Ver detalhes" surgindo no hover. */
export function StaffCard({ s, showCampus, extra }: { s: Servidor; showCampus?: boolean; extra?: string }) {
  const funcao = s.funcoes[0] ? funcaoLabel(s.funcoes[0]) : null;
  return (
    <Link to={`/servidores/${s.matricula}`} label={`Ver detalhes de ${titleCase(s.nome)}`}
      className="group relative flex h-full items-center gap-3.5 rounded-2xl bg-surface-container p-3.5 pr-14 transition-[background-color,box-shadow,transform] duration-300 ease-emphasized hover:-translate-y-0.5 hover:bg-surface-container-high hover:shadow-[0_6px_20px_rgb(0_0_0/0.16)]">
      <span className="shrink-0 transition-transform duration-500 ease-emphasized group-hover:scale-110">
        <Face p={{ nome: s.nome, matricula: s.matricula, foto: s.foto }} size={56} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{titleCase(s.nome)}</span>
        <span className="block truncate text-sm text-on-surface-variant">{ocupacao(s)}</span>
        {(s.setor || funcao || showCampus || extra) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showCampus && s.campus && <Badge>{s.campus}</Badge>}
            {s.setor && !showCampus && <Badge className="tabular">{s.setor}</Badge>}
            {extra && <Badge tone="primary" className="tabular">{extra}</Badge>}
            {funcao && <Badge tone="primary"><Icon name="workspace_premium" size={13} fill />{funcao.tipo}</Badge>}
          </span>
        )}
      </span>
      <SeeDetails className="absolute top-1/2 right-3.5 -translate-y-1/2" />
    </Link>
  );
}
