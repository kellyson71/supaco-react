import { useEffect, useMemo, useState } from 'react';
import { useEu, useServidores, useUnidades } from '../lib/data';
import { api, semAcento, titleCase, type Servidor } from '../lib/suap';
import { campusNome, CATEGORIAS, funcaoLabel, ocupacao } from '../lib/staff';
import { Link } from './Link';
import { Face, SeeDetails } from './Turma';
import { Badge, Button, Card, Chip, Empty, ErrorNote, Icon, Skeleton } from './ui';

const PAGE = 60;
const ALL = '*';

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

  useEffect(() => setShown(PAGE), [campus, filter, term]);

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
        <label className="state relative inline-flex h-12 items-center gap-2 self-start rounded-full border border-outline-variant pr-3 pl-4 text-sm font-medium md:self-auto">
          <Icon name="apartment" size={20} className="text-primary" />
          <span className="sr-only">Campus</span>
          <select value={campus} onChange={(e) => { setPicked(e.target.value); setFilter('todos'); }}
            className="max-w-64 cursor-pointer appearance-none truncate bg-transparent pr-6 text-on-surface outline-none">
            {!campi.some((u) => u.sigla === campus) && !everywhere && <option value={campus}>{campus || 'Campus'}</option>}
            {campi.map((u) => <option key={u.sigla} value={u.sigla}>{campusNome(u.nome)}{u.sigla === mine ? ' (seu campus)' : ''}</option>)}
            <option value={ALL}>Todo o IFRN</option>
          </select>
          <Icon name="arrow_drop_down" size={20} className="pointer-events-none absolute right-2" />
        </label>
      </div>

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
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, shown).map((s) => <li key={s.matricula}><StaffCard s={s} showCampus={everywhere} /></li>)}
          </ul>
          {list.length > shown && (
            <Button variant="tonal" icon="expand_more" onClick={() => setShown(shown + PAGE)} className="self-center">Mostrar mais {Math.min(PAGE, list.length - shown)}</Button>
          )}
        </>
      )}
    </div>
  );
}

/** Cartão de uma pessoa do diretório: o cartão inteiro leva à página dela, com o "Ver detalhes" surgindo no hover. */
export function StaffCard({ s, showCampus }: { s: Servidor; showCampus?: boolean }) {
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
        {(s.setor || funcao || showCampus) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showCampus && s.campus && <Badge>{s.campus}</Badge>}
            {s.setor && !showCampus && <Badge className="tabular">{s.setor}</Badge>}
            {funcao && <Badge tone="primary"><Icon name="workspace_premium" size={13} fill />{funcao.tipo}</Badge>}
          </span>
        )}
      </span>
      <SeeDetails className="absolute top-1/2 right-3.5 -translate-y-1/2" />
    </Link>
  );
}
