import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useAvaliacoes, useCampus, useCurrentSubjects, useEu, useHolidays, useMensagens, usePeriod, useTasks, useTurmas } from '../lib/data';
import { buildDeadlines } from '../lib/agenda';
import { classroom } from '../lib/classroom';
import { session } from '../lib/api';
import { currentAverage, hasPartial } from '../lib/grades';
import { classesOn, nowMin, toMin, WEEKDAYS_SHORT } from '../lib/schedule';
import { daysBetween, longDate, parseDay, relativeDay, shortDate } from '../lib/dates';
import { navigate } from '../lib/router';
import { refreshAll } from '../lib/store';
import { toggleDark } from '../lib/theme';
import { aulaMatchesSubject, shortName, subjectTone, titleCase, type Aula, type Pessoa, type Subject } from '../lib/suap';
import { buildIndex, completion, GROUP_LABEL, loadRecent, matchRanges, pushRecent, search, type SearchGroup, type SearchItem } from '../lib/search';
import { TONES } from '../lib/tones';
import { cx, EMPHASIZED, Icon, spring } from './ui';
import { LessonSheet } from './LessonSheet';
import { PersonSheet, type Role } from './PersonSheet';
import { personPhoto } from './Turma';

// ---------- Abrir / fechar de qualquer lugar ----------

let isOpen = false;
const subs = new Set<() => void>();
const setOpen = (v: boolean) => { if (isOpen !== v) { isOpen = v; subs.forEach((fn) => fn()); } };
export const openSearch = () => setOpen(true);
const closeSearch = () => setOpen(false);
export const useSearchOpen = () => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => isOpen);

// Detalhe de aula aberto a partir de um resultado (fica fora da busca, que fecha ao escolher)
type OpenLesson = { aula: Aula; aulas: Aula[]; subjects: Subject[] };
let lesson: OpenLesson | null = null;
const lessonSubs = new Set<() => void>();
const setLesson = (l: OpenLesson | null) => { lesson = l; lessonSubs.forEach((fn) => fn()); };

let person: { p: Pessoa; role: Role } | null = null;
const personSubs = new Set<() => void>();
const setPerson = (v: typeof person) => { person = v; personSubs.forEach((fn) => fn()); };

const wide = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null;
/** Telas médias e grandes usam a barra do topo; no celular a busca entra na barra superior. */
export const useIsWide = () => useSyncExternalStore((cb) => { wide?.addEventListener('change', cb); return () => wide?.removeEventListener('change', cb); }, () => !!wide?.matches);

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

const HINTS = ['matérias', 'aulas e conteúdos', 'professores e colegas', 'provas e prazos', 'mensagens', 'materiais'];

/** Dica que vai trocando dentro da barra fechada. */
function RotatingHint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % HINTS.length), 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative h-6 flex-1 overflow-hidden">
      <AnimatePresence initial={false}>
        <m.span key={i} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ duration: 0.4, ease: EMPHASIZED }}
          className="absolute inset-0 truncate leading-6">{HINTS[i]}</m.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Barra de busca do topo (telas médias e grandes). Ao focar, a própria barra cresce para baixo
 * com os resultados, sem cobrir a tela: clicar fora ou Esc recolhe.
 */
export function SearchBar() {
  const open = useSearchOpen();
  const isWide = useIsWide();
  const root = useRef<HTMLDivElement>(null);
  const shown = open && isWide;

  useEffect(() => {
    if (!shown) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) closeSearch(); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [shown]);

  return (
    <div ref={root} className="relative h-14 w-full max-w-3xl">
      <m.div initial={false} animate={{ height: shown ? 'auto' : 56 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        className={cx('absolute inset-x-0 top-0 overflow-hidden rounded-xl bg-surface-container-high transition-shadow duration-200', shown && 'shadow-[0_8px_28px_rgb(0_0_0/0.22)] ring-1 ring-outline-variant/50')}>
        {shown ? <SearchPanel variant="dock" /> : (
          <button onClick={openSearch} aria-label="Buscar" className="state flex h-14 w-full items-center gap-3 pr-4 pl-5 text-left text-on-surface-variant">
            <Icon name="search" size={24} className="text-on-surface" />
            <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-base">Buscar<RotatingHint /></span>
            <Kbd>{isMac ? '⌘' : 'Ctrl'} K</Kbd>
          </button>
        )}
      </m.div>
    </div>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md border border-outline-variant bg-surface px-1.5 py-0.5 font-sans text-[11px] font-medium text-on-surface-variant">{children}</kbd>
);

// ---------- Índice: tudo que dá para achar ----------

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function useItems(): { items: SearchItem[]; now: SearchItem | null } {
  const { current } = usePeriod();
  const { data: subjects } = useCurrentSubjects();
  const { data: aulas } = useAulas(current);
  const { data: turmas } = useTurmas(subjects?.map((s) => s.code));
  const { data: msgs } = useMensagens();
  const { data: avaliacoes } = useAvaliacoes();
  const { data: tasks } = useTasks(classroom.linked && classroom.tokenValid);
  const { data: eu } = useEu();
  const { data: campus } = useCampus(eu?.campus);
  const { data: holidays } = useHolidays();

  return useMemo(() => {
    const today = new Date();
    const items: SearchItem[] = [
      { id: 'p:hoje', group: 'paginas', title: 'Hoje', sub: 'Aula de agora, posso faltar e resumo do dia', icon: 'today', to: '/', keywords: 'início home agora' },
      { id: 'p:materias', group: 'paginas', title: 'Matérias', sub: 'Notas, faltas e médias', icon: 'school', to: '/disciplinas', keywords: 'disciplinas boletim notas' },
      { id: 'p:horario', group: 'paginas', title: 'Horário', sub: 'Grade da semana', icon: 'calendar_view_week', to: '/horario', keywords: 'semana grade aulas' },
      { id: 'p:agenda', group: 'paginas', title: 'Agenda', sub: 'Provas, trabalhos e eventos', icon: 'event_note', to: '/agenda', keywords: 'calendário prazos classroom' },
      { id: 'p:voce', group: 'paginas', title: 'Você', sub: 'Perfil, presença e conclusão do curso', icon: 'person', to: '/voce', keywords: 'perfil conta ira tema aparência' },
      { id: 'p:mensagens', group: 'paginas', title: 'Mensagens', sub: 'Caixa de entrada do SUAP', icon: 'mail', to: '/mensagens', keywords: 'recados avisos inbox' },
      { id: 'p:campus', group: 'paginas', title: 'Campus', sub: 'Eventos e projetos', icon: 'apartment', to: '/campus', keywords: 'ifrn pesquisa extensão' },
      { id: 'p:retro', group: 'paginas', title: 'Retrospectiva', sub: 'Seu semestre em números', icon: 'auto_awesome', to: '/retrospectiva', keywords: 'resumo wrapped semestre' },
      { id: 'p:diag', group: 'paginas', title: 'Diagnóstico', sub: 'Conexão com o SUAP', icon: 'troubleshoot', to: '/diagnostico', keywords: 'erro problema status' },
      {
        id: 'a:faltar', group: 'acoes', title: 'Posso faltar?', sub: 'Veja se dá para faltar hoje ou nos próximos dias', icon: 'help', keywords: 'faltas limite',
        run: () => { navigate('/'); setTimeout(() => document.getElementById('posso-faltar')?.scrollIntoView({ behavior: 'smooth' }), 400); },
      },
      { id: 'a:tema', group: 'acoes', title: 'Trocar tema claro/escuro', icon: 'dark_mode', keywords: 'dark light modo noturno aparência', run: toggleDark },
      { id: 'a:sync', group: 'acoes', title: 'Atualizar dados do SUAP', icon: 'sync', keywords: 'sincronizar recarregar refresh', run: () => { refreshAll(); } },
    ];

    // Matérias
    (subjects ?? []).forEach((s) => {
      const avg = currentAverage(s);
      const left = s.limit - s.absences;
      const slots = s.slots.map((sl) => `${WEEKDAYS_SHORT[sl.day]} ${sl.start}–${sl.end}`).join(' · ');
      const profs = turmas?.[s.code]?.professores.map((p) => shortName(p.nome)).join(', ');
      items.push({
        id: `s:${s.code}`, group: 'materias', title: s.name, sub: [s.sigla, profs].filter(Boolean).join(' · '), keywords: `${s.status} ${slots}`,
        icon: 'school', tone: subjectTone(s), to: `/disciplinas/${s.code}`,
        meta: avg !== null ? `média ${hasPartial(s) ? '~' : ''}${Math.round(avg)}` : `${s.absences}/${s.limit} faltas`,
        metaTone: left <= 0 ? 'error' : left <= 2 ? 'warning' : undefined,
        preview: {
          rows: [
            { icon: 'grade', label: 'Média', value: avg !== null ? String(Math.round(avg)) : 'sem notas ainda' },
            { icon: 'event_busy', label: 'Faltas', value: `${s.absences} de ${s.limit} (${left > 0 ? `sobram ${left}` : 'no limite'})` },
            { icon: 'how_to_reg', label: 'Frequência', value: `${Math.round(s.attendance)}%` },
            ...(slots ? [{ icon: 'schedule', label: 'Horário', value: slots }] : []),
            ...(s.rooms[0] ? [{ icon: 'location_on', label: 'Sala', value: s.rooms[0] }] : []),
            ...(profs ? [{ icon: 'person', label: 'Professor', value: profs }] : []),
          ],
        },
      });
    });

    // Prazos (SUAP, Classroom e eventos do campus)
    buildDeadlines(avaliacoes, tasks, campus?.eventos)
      .filter((d) => d.source !== 'campus' && (!d.date || daysBetween(today, d.date) >= (d.late ? -14 : 0)))
      .forEach((d) => {
        const n = d.date ? daysBetween(today, d.date) : null;
        items.push({
          id: `d:${d.id}`, group: 'prazos', title: d.title, sub: d.subject, keywords: `prova trabalho avaliação tarefa ${d.detail ?? ''}`,
          icon: d.source === 'classroom' ? 'assignment' : 'event', href: d.link, to: d.link ? undefined : '/agenda',
          meta: d.date ? relativeDay(d.date, today) : 'sem data', metaTone: d.late ? 'error' : n !== null && n <= 1 ? 'warning' : undefined,
          boost: n !== null && n >= 0 && n <= 7 ? 6 : 0,
          preview: { text: d.detail, rows: [{ icon: 'event', label: 'Data', value: d.date ? longDate(d.date) : 'sem data' }, { icon: 'school', label: 'Matéria', value: d.subject }] },
        });
      });

    // Aulas lançadas (busca pelo conteúdo)
    if (subjects && aulas) {
      aulas.forEach((a) => {
        const content = a.conteudo?.trim();
        if (!content) return;
        const s = subjects.find((x) => aulaMatchesSubject(a, x));
        const d = parseDay(a.data);
        items.push({
          id: `l:${a.id}`, group: 'aulas', title: clip(content, 90), sub: [s?.name, d && shortDate(d)].filter(Boolean).join(' · '), keywords: content.length > 90 ? content : undefined,
          icon: 'history_edu', tone: s ? subjectTone(s) : undefined,
          meta: a.faltas > 0 ? `${a.faltas} ${a.faltas === 1 ? 'falta' : 'faltas'}` : undefined, metaTone: a.faltas > 0 ? 'error' : undefined,
          run: () => setLesson({ aula: a, aulas, subjects }),
          preview: {
            text: content,
            rows: [
              { icon: 'event', label: 'Data', value: d ? longDate(d) : a.data },
              { icon: 'flag', label: 'Etapa', value: a.etapa || '—' },
              { icon: 'how_to_reg', label: 'Presença', value: a.faltas > 0 ? `${a.faltas} de ${a.qtd_aulas} em falta` : 'presente' },
            ],
          },
        });
      });
    }

    // Pessoas e materiais das turmas
    if (subjects && turmas) {
      const people = new Map<string, { nome: string; foto: string; email?: string; teacher: boolean; in: Subject[] }>();
      subjects.forEach((s) => {
        const t = turmas[s.code];
        if (!t) return;
        [...t.professores.map((p) => ({ p, teacher: true })), ...t.colegas.map((p) => ({ p, teacher: false }))].forEach(({ p, teacher }) => {
          if (p.matricula === session.user) return;
          const e = people.get(p.matricula) ?? { nome: p.nome, foto: p.foto, email: p.email, teacher, in: [] };
          e.teacher ||= teacher;
          e.in.push(s);
          people.set(p.matricula, e);
        });
        t.materiais.forEach((x, i) => {
          const d = parseDay(x.data);
          items.push({
            id: `m:${s.code}:${i}`, group: 'materiais', title: x.descricao || 'Material', sub: [s.name, d && shortDate(d)].filter(Boolean).join(' · '),
            icon: 'description', tone: subjectTone(s), href: x.url, keywords: 'arquivo slide pdf material',
          });
        });
      });
      people.forEach((p, matricula) => {
        items.push({
          id: `u:${matricula}`, group: 'pessoas', title: titleCase(p.nome), keywords: `${matricula} ${p.teacher ? 'professor docente' : 'colega aluno'}`,
          sub: `${p.teacher ? 'Docente' : 'Colega'} · ${p.in.length === 1 ? p.in[0].name : `${p.in.length} matérias com você`}`,
          icon: p.teacher ? 'person' : 'groups', photo: p.foto || undefined, boost: p.teacher ? 4 : 0,
          run: () => setPerson({ p: { nome: p.nome, matricula, foto: p.foto, ...(p.email ? { email: p.email } : {}) }, role: p.teacher ? 'teacher' : 'student' }),
          preview: {
            rows: [
              { icon: 'badge', label: 'Matrícula', value: matricula },
              ...(p.email ? [{ icon: 'mail', label: 'E-mail', value: p.email }] : []),
              ...p.in.map((s) => ({ icon: 'school', label: p.teacher ? 'Dá aula em' : 'Com você em', value: s.name })),
            ],
          },
        });
      });
    }

    // Mensagens
    (msgs ?? []).forEach((x) => {
      const d = parseDay(x.data_envio);
      const body = stripHtml(x.conteudo ?? '');
      items.push({
        id: `g:${x.id}`, group: 'mensagens', title: x.assunto || 'Sem assunto', sub: [shortName(x.remetente?.nome ?? ''), d && shortDate(d)].filter(Boolean).join(' · '),
        keywords: clip(body, 600), icon: 'mail', to: '/mensagens', meta: x.registro_leitura ? undefined : 'nova', metaTone: x.registro_leitura ? undefined : 'warning',
        boost: x.registro_leitura ? 0 : 5, preview: { text: clip(body, 420) },
      });
    });

    // Campus
    (campus?.eventos ?? []).forEach((e) => items.push({
      id: `e:${e.id}`, group: 'campus', title: e.nome, sub: [e.periodo, e.local].filter(Boolean).join(' · '), keywords: `evento ${e.resumo ?? ''}`,
      icon: 'celebration', href: e.link, preview: { text: clip(e.resumo ?? '', 420) },
    }));
    (campus?.projetos ?? []).forEach((p) => items.push({
      id: `j:${p.id}`, group: 'campus', title: p.titulo, sub: `Projeto de ${p.tipo === 'pesquisa' ? 'pesquisa' : 'extensão'} · ${shortName(p.coordenador)}`,
      keywords: `projeto ${p.resumo ?? ''}`, icon: 'science', to: '/campus', preview: { text: clip(p.resumo ?? '', 420) },
    }));

    // Feriados que ainda vêm
    (holidays ?? []).forEach((h) => {
      const d = parseDay(h.date);
      if (!d || daysBetween(today, d) < 0) return;
      items.push({ id: `h:${h.date}`, group: 'feriados', title: h.name, sub: longDate(d), keywords: 'feriado folga', icon: 'beach_access', to: '/agenda', meta: relativeDay(d, today) });
    });

    // Atalho do momento: a aula que está rolando ou a próxima de hoje
    let now: SearchItem | null = null;
    if (subjects) {
      const mm = nowMin(today);
      const list = classesOn(subjects, today.getDay());
      const live = list.find((c) => toMin(c.start) <= mm && mm < toMin(c.end));
      const next = live ?? list.find((c) => toMin(c.start) > mm);
      const s = next && subjects.find((x) => x.code === next.code);
      if (next && s) {
        now = {
          id: `s:${s.code}`, group: 'materias', title: s.name, sub: `${live ? 'Aula agora' : 'Próxima aula'} · ${next.start} – ${next.end}${next.room ? ` · ${next.room}` : ''}`,
          icon: live ? 'play_arrow' : 'schedule', tone: subjectTone(s), to: `/disciplinas/${s.code}`, meta: live ? 'agora' : next.start,
          preview: items.find((x) => x.id === `s:${s.code}`)?.preview,
        };
      }
    }
    return { items, now };
  }, [subjects, aulas, turmas, msgs, avaliacoes, tasks, campus, holidays]);
}

// ---------- Paleta ----------

const SCOPES: { key: SearchGroup | 'tudo'; label: string }[] = [
  { key: 'tudo', label: 'Tudo' }, { key: 'materias', label: 'Matérias' }, { key: 'aulas', label: 'Aulas' },
  { key: 'pessoas', label: 'Pessoas' }, { key: 'prazos', label: 'Prazos' }, { key: 'mensagens', label: 'Mensagens' }, { key: 'materiais', label: 'Materiais' },
];

type Section = { label: string; items: SearchItem[] };

function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = matchRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={i} className="rounded-[3px] bg-primary/20 font-semibold text-inherit">{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

function ItemIcon({ item, size = 40 }: { item: SearchItem; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (item.photo && !failed) {
    return <img src={item.photo} alt="" width={size} height={size} onError={() => setFailed(true)} style={{ width: size, height: size }} className="relative shrink-0 rounded-full object-cover object-top" />;
  }
  const t = item.tone ? TONES[item.tone] : null;
  return (
    <span style={{ width: size, height: size }} className={cx('relative flex shrink-0 items-center justify-center rounded-xl', t ? cx(t.container, t.onContainer) : 'bg-surface-container-highest text-on-surface-variant')}>
      <Icon name={item.icon} size={Math.round(size * 0.52)} fill={!!t} />
    </span>
  );
}

const META = { error: 'text-error', warning: 'text-warning', success: 'text-success' };

/**
 * Campo e resultados. `dock`: dentro da barra do topo, que cresce para baixo.
 * `mobile`: o campo ocupa a barra superior e os resultados ficam logo abaixo dela.
 */
export function SearchPanel({ variant }: { variant: 'dock' | 'mobile' }) {
  const dock = variant === 'dock';
  const { items, now } = useItems();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchGroup | 'tudo'>('tudo');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const index = useMemo(() => buildIndex(items), [items]);
  const q = query.trim();

  const results = useMemo(() => search(index, q), [index, q]);
  const ghost = query.length <= 44 ? completion(results, query) : '';

  const counts = useMemo(() => {
    const c: Partial<Record<SearchGroup, number>> = {};
    results.forEach((r) => { c[r.item.group] = (c[r.item.group] ?? 0) + 1; });
    return c;
  }, [results]);

  const sections = useMemo<Section[]>(() => {
    if (!q) {
      // Antes de digitar: o que importa agora, o que você abriu por último e os atalhos
      const byId = new Map(items.map((x) => [x.id, x]));
      const recent = loadRecent().map((id) => byId.get(id)).filter((x): x is SearchItem => !!x && x.id !== now?.id).slice(0, 3);
      const pick = (g: SearchGroup, n: number) => items.filter((x) => x.group === g).slice(0, n);
      if (scope !== 'tudo') return [{ label: GROUP_LABEL[scope], items: pick(scope, 30) }].filter((s) => s.items.length);
      return [
        { label: 'Agora', items: now ? [now] : [] },
        { label: 'Recentes', items: recent },
        { label: 'Ações', items: pick('acoes', 3) },
      ].filter((s) => s.items.length);
    }
    const scoped = scope === 'tudo' ? results : results.filter((r) => r.item.group === scope);
    const per = scope === 'tudo' ? 4 : 30;
    const groups = new Map<SearchGroup, SearchItem[]>();
    for (const { item } of scoped) {
      const list = groups.get(item.group) ?? [];
      if (list.length < per) list.push(item);
      groups.set(item.group, list);
    }
    // Map mantém a ordem de inserção: o grupo do melhor resultado vem primeiro
    return [...groups].map(([g, list]) => ({ label: GROUP_LABEL[g], items: list }));
  }, [q, scope, results, items, now]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const current = flat[Math.min(active, flat.length - 1)];

  useEffect(() => { setActive(0); listRef.current?.scrollTo({ top: 0 }); }, [q, scope]);

  useEffect(() => {
    inputRef.current?.focus();
    if (dock) return;
    // No celular os resultados cobrem a página, então ela não deve rolar por baixo
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [dock]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: SearchItem) => {
    pushRecent(item.id);
    closeSearch();
    if (item.run) item.run();
    else if (item.href) window.open(item.href, '_blank', 'noopener');
    else if (item.to) navigate(item.to);
  };

  const accept = () => { setQuery(query + ghost); };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const atEnd = el.selectionStart === query.length && el.selectionEnd === query.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (flat.length ? (i + 1) % flat.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (current) choose(current); }
    else if (e.key === 'Tab') { e.preventDefault(); if (ghost && !e.shiftKey) accept(); }
    else if (e.key === 'ArrowRight' && ghost && atEnd) { e.preventDefault(); accept(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (query) setQuery(''); else closeSearch(); }
  };

  const suggestions = useMemo(() => {
    const names = items.filter((x) => x.group === 'materias').slice(0, 3).map((x) => x.title.split(' ').slice(0, 2).join(' '));
    return [...names, 'prova', 'professor'];
  }, [items]);

  let n = -1;

  const field = (
    <div className={cx('flex shrink-0 items-center gap-2', dock ? 'h-14 pr-3 pl-5' : 'h-full min-w-0 flex-1')}>
      {dock
        ? <Icon name="search" size={24} className="shrink-0 text-primary" />
        : <button onClick={closeSearch} aria-label="Fechar busca" className="state flex size-10 shrink-0 items-center justify-center rounded-full"><Icon name="arrow_back" /></button>}
      <div className={cx('relative h-full min-w-0 flex-1', dock ? 'ml-1 text-base' : 'text-base')}>
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre">
          <span className="invisible">{query}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            {ghost && <m.span key={ghost} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 0.45, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>{ghost}</m.span>}
          </AnimatePresence>
        </div>
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Buscar matérias, aulas, pessoas, prazos…" aria-label="Buscar" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search"
          role="combobox" aria-expanded aria-controls="search-results" aria-activedescendant={current ? `sr-${active}` : undefined}
          className="relative size-full bg-transparent outline-none placeholder:text-on-surface-variant/70" />
      </div>
      <AnimatePresence initial={false}>
        {ghost && (
          <m.button key="tab" onClick={() => { accept(); inputRef.current?.focus(); }} aria-label="Completar" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={spring}
            className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium text-on-secondary-container">
            <Icon name="keyboard_tab" size={16} />{dock && 'Tab'}
          </m.button>
        )}
        {query && (
          <m.button key="clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Limpar" initial={{ opacity: 0, scale: 0.6, rotate: -90 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring}
            className="state flex size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant"><Icon name="close" size={18} /></m.button>
        )}
      </AnimatePresence>
      {dock && !query && <Kbd>esc</Kbd>}
    </div>
  );

  // Filtros só aparecem quando há o que filtrar
  const filters = q && results.length > 0 && (
    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: EMPHASIZED }} className="shrink-0 overflow-hidden">
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pt-2">
        {SCOPES.filter((s) => s.key === 'tudo' || counts[s.key] || scope === s.key).map((s) => {
          const on = scope === s.key;
          return (
            <button key={s.key} onClick={() => { setScope(s.key); inputRef.current?.focus(); }}
              className={cx('relative flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors', on ? 'text-on-secondary-container' : 'text-on-surface-variant')}>
              {on && <m.span layoutId="search-scope" transition={spring} className="absolute inset-0 rounded-full bg-secondary-container" />}
              <span className="relative">{s.label}</span>
              <span className="relative text-xs tabular opacity-70">{s.key === 'tudo' ? results.length : counts[s.key] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </m.div>
  );

  const list = (
    <div ref={listRef} id="search-results" role="listbox" className={cx('overflow-y-auto overscroll-contain px-2 pt-1', dock ? 'max-h-[min(62vh,520px)] pb-2' : 'min-h-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]')}>
      {!q && (
        <div className="flex flex-wrap gap-1.5 px-2 pt-2 pb-1">
          {suggestions.map((s, i) => (
            <m.button key={s} onClick={() => { setQuery(s); inputRef.current?.focus(); }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 + i * 0.03, duration: 0.25, ease: EMPHASIZED }}
              className="state flex h-7 items-center gap-1 rounded-full border border-outline-variant px-2.5 text-[13px] text-on-surface-variant">
              <Icon name="search" size={14} />{s}
            </m.button>
          ))}
        </div>
      )}

      {flat.length === 0 ? (
        <m.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 px-3 py-5 text-sm text-on-surface-variant">
          <m.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.5 }} className="inline-flex"><Icon name="search_off" size={22} /></m.span>
          <span>Nada encontrado{q && <> para “{clip(q, 30)}”</>}. {scope !== 'tudo' ? 'Tente em Tudo.' : 'Tente uma matéria, um professor ou um conteúdo de aula.'}</span>
        </m.div>
      ) : sections.map((sec) => (
        <div key={sec.label}>
          <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-on-surface-variant uppercase">{sec.label}</p>
          <AnimatePresence mode="popLayout" initial={false}>
            {sec.items.map((item) => {
              n += 1;
              const i = n;
              const on = i === active;
              return (
                <m.button key={item.id} id={`sr-${i}`} data-i={i} role="option" aria-selected={on} layout="position"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EMPHASIZED, delay: Math.min(i, 8) * 0.015 }}
                  onClick={() => choose(item)} onMouseMove={() => active !== i && setActive(i)}
                  className={cx('relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left', on && 'text-on-secondary-container')}>
                  {on && <m.span layoutId="search-active" transition={{ type: 'spring', stiffness: 520, damping: 40 }} className="absolute inset-0 rounded-2xl bg-secondary-container" />}
                  <ItemIcon item={item} size={36} />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium"><Highlight text={item.title} query={q} /></span>
                    {item.sub && <span className={cx('block truncate text-[13px]', on ? 'opacity-80' : 'text-on-surface-variant')}>{item.sub}</span>}
                  </span>
                  {item.meta && <span className={cx('relative shrink-0 text-xs font-medium tabular', item.metaTone ? META[item.metaTone] : on ? 'opacity-80' : 'text-on-surface-variant')}>{item.meta}</span>}
                  <Icon name={item.href ? 'open_in_new' : 'keyboard_return'} size={16} className={cx('relative shrink-0 transition-opacity', on ? 'opacity-70' : 'opacity-0')} />
                </m.button>
              );
            })}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );

  if (dock) {
    return (
      <>
        {field}
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.05 }} className="border-t border-outline-variant/50">
          <AnimatePresence initial={false}>{filters}</AnimatePresence>
          {list}
        </m.div>
      </>
    );
  }
  return (
    <>
      {field}
      {createPortal(
        <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EMPHASIZED }}
          className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-surface text-on-surface">
          <AnimatePresence initial={false}>{filters}</AnimatePresence>
          {list}
        </m.div>,
        document.body,
      )}
    </>
  );
}

/** Monta uma vez no app: atalhos de teclado da busca e o detalhe de aula aberto por ela. */
export function GlobalSearch() {
  const open = useSyncExternalStore((cb) => { lessonSubs.add(cb); return () => { lessonSubs.delete(cb); }; }, () => lesson);
  const who = useSyncExternalStore((cb) => { personSubs.add(cb); return () => { personSubs.delete(cb); }; }, () => person);
  const closePerson = useCallback(() => setPerson(null), []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(!isOpen); }
      else if (e.key === '/' && !typing && !isOpen) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <AnimatePresence>
        {who && <PersonSheet key={who.p.matricula} p={who.p} role={who.role} photo={personPhoto(who.p, who.role)} onClose={closePerson} />}
      </AnimatePresence>
      <AnimatePresence>
      {open && <LessonSheet key={open.aula.id} date={open.aula.data} only={open.aula} aulas={open.aulas} subjects={open.subjects} onClose={() => setLesson(null)} />}
      </AnimatePresence>
    </>
  );
}
