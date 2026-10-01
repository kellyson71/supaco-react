import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useAulas, useDisciplinas, useParciais, usePeriod } from '../lib/data';
import { WEEKDAYS_SHORT } from '../lib/schedule';
import { absenceLevel, currentAverage, gradeTone, outlook, stageProgress, type GradeOutlook } from '../lib/grades';
import { aulaMatchesSubject, subjectTone, type Aula, type Parcial, type Subject } from '../lib/suap';
import { parseDay, relativeDay } from '../lib/dates';
import { TONES } from '../lib/tones';
import { AbsenceMeter, Card, levelColor, Chip, cx, EMPHASIZED, Empty, ErrorNote, Icon, Item, Ring, Segmented, Skeleton, Stagger, Tap, TopTitle } from '../components/ui';
import { PeriodSelect } from '../components/PeriodSelect';

type Sort = 'nome' | 'faltas' | 'media';
type Filter = 'todas' | 'risco' | 'final' | 'ok';

const isRisk = (s: Subject) => { const l = absenceLevel(s); return l === 'critical' || l === 'over' || l === 'caution'; };

export function Subjects() {
  const { period } = usePeriod();
  const { data, error, loading, refresh } = useDisciplinas(period);
  const { data: aulas } = useAulas(period);
  const { data: parciais } = useParciais(period);
  const [sort, setSort] = useState<Sort>('nome');
  const [filter, setFilter] = useState<Filter>('todas');

  const counts = useMemo(() => {
    const l = data ?? [];
    return {
      risco: l.filter(isRisk).length,
      final: l.filter((s) => { const o = outlook(s); return o.kind === 'final' || (o.kind === 'needs' && o.needed > 100); }).length,
      ok: l.filter((s) => { const o = outlook(s); return o.kind === 'passed' || o.kind === 'secured'; }).length,
    };
  }, [data]);

  const list = useMemo(() => {
    let l = [...(data ?? [])];
    if (filter === 'risco') l = l.filter(isRisk);
    if (filter === 'final') l = l.filter((s) => { const o = outlook(s); return o.kind === 'final' || (o.kind === 'needs' && o.needed > 100); });
    if (filter === 'ok') l = l.filter((s) => { const o = outlook(s); return o.kind === 'passed' || o.kind === 'secured'; });
    if (sort === 'faltas') l.sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));
    if (sort === 'media') l.sort((a, b) => (currentAverage(a) ?? 101) - (currentAverage(b) ?? 101));
    return l;
  }, [data, sort, filter]);

  return (
    <>
      <TopTitle title="Matérias" sub={data ? `${data.length} neste período` : ' '} right={<PeriodSelect />} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <Chip label="Todas" selected={filter === 'todas'} onClick={() => setFilter('todas')} />
          <Chip label={`Faltas em risco · ${counts.risco}`} icon="warning" selected={filter === 'risco'} onClick={() => setFilter('risco')} />
          <Chip label={`Rumo à final · ${counts.final}`} icon="edit_note" selected={filter === 'final'} onClick={() => setFilter('final')} />
          <Chip label={`Garantidas · ${counts.ok}`} icon="verified" selected={filter === 'ok'} onClick={() => setFilter('ok')} />
        </div>
        <Segmented<Sort> value={sort} onChange={setSort} className="self-start"
          options={[{ value: 'nome', label: 'A–Z' }, { value: 'faltas', label: 'Faltas' }, { value: 'media', label: 'Média' }]} />
      </div>

      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44" />)}</div>}
      {data && list.length === 0 && <Card className="rounded-2xl"><Empty icon="school" title={data.length ? 'Nenhuma matéria nesse filtro' : 'Nenhuma matéria neste período'} /></Card>}

      {list.length > 0 && (
        <Stagger key={sort + filter + (period?.label ?? '')} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <Item key={s.code}><SubjectCard s={s} last={aulas?.find((a) => aulaMatchesSubject(a, s))} parciais={parciais?.[s.code]} /></Item>)}
        </Stagger>
      )}
    </>
  );
}

export function outlookLabel(o: GradeOutlook): { text: string; tone: string; icon: string } {
  switch (o.kind) {
    case 'passed': return { text: 'Aprovado', tone: 'text-success', icon: 'verified' };
    case 'failed': return { text: 'Reprovado', tone: 'text-error', icon: 'cancel' };
    case 'final': return { text: 'Prova final', tone: 'text-warning', icon: 'edit_note' };
    case 'secured': return { text: 'Média garantida', tone: 'text-success', icon: 'verified' };
    case 'needs': return o.needed > 100
      ? { text: 'Vai para a final', tone: 'text-error', icon: 'trending_down' }
      : { text: `Precisa de ${o.needed} ${o.stagesLeft > 1 ? 'por etapa' : 'na próxima'}`, tone: o.needed > 75 ? 'text-warning' : 'text-on-surface-variant', icon: 'target' };
    default: return { text: 'Sem notas ainda', tone: 'text-on-surface-variant', icon: 'hourglass_empty' };
  }
}

function SubjectCard({ s, last, parciais }: { s: Subject; last?: Aula; parciais?: Parcial[] }) {
  const [open, setOpen] = useState(false);
  const lastDay = parseDay(last?.data);
  const t = TONES[subjectTone(s)];
  const lvl = absenceLevel(s);
  const o = outlook(s);
  const stage = stageProgress(parciais);
  const official = (s.finalAverage ?? s.average) !== null;
  const closed = currentAverage(s);
  // Sem etapa fechada, a média das avaliações já lançadas dá a noção
  const avg = closed ?? stage?.avg ?? null;
  const partialOnly = closed === null && avg !== null;
  const label = partialOnly
    ? { text: stage?.needed != null ? `Parcial · precisa de ${stage.needed} na ${stage.next}` : 'Média parcial', tone: stage?.needed != null && stage.needed > 75 ? 'text-warning' : 'text-on-surface-variant', icon: 'target' }
    : outlookLabel(o);
  const left = s.limit - s.absences;
  const stages = [...new Set((parciais ?? []).map((x) => x.etapa))].sort((a, b) => a - b);
  const slots = s.slots.map((sl) => `${WEEKDAYS_SHORT[sl.day]} ${sl.start}–${sl.end}`).join(' · ');

  return (
    <div className="flex h-full flex-col rounded-2xl bg-surface-container">
    <Tap to={`/disciplinas/${s.code}`} className="flex flex-1 flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', t.container, t.onContainer)}>
          {s.name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || s.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{s.name}</p>
          <p className={cx('mt-0.5 flex items-center gap-1 text-sm', label.tone)}><Icon name={label.icon} size={16} />{label.text}</p>
        </div>
        {avg !== null ? (
          <Ring value={avg / 100} size={52} stroke={5} color={t.varColor} track={t.varContainer}>
            <span className="flex flex-col items-center leading-none">
              <span className={cx('text-base font-semibold tabular', gradeTone(avg))}>{Math.round(avg)}</span>
              {partialOnly && <span className="mt-0.5 text-[8px] font-medium tracking-wide text-on-surface-variant uppercase">parcial</span>}
            </span>
          </Ring>
        ) : (
          // Sem nota ainda: o anel mostra as faltas que sobram, para o card não ficar vazio
          <Ring value={s.limit ? Math.max(left, 0) / s.limit : 0} size={52} stroke={5} color={levelColor[lvl].bar} track={t.varContainer}>
            <span className="flex flex-col items-center leading-none">
              <span className={cx('text-base font-semibold tabular', levelColor[lvl].text)}>{Math.max(left, 0)}</span>
              <span className="mt-0.5 text-[8px] font-medium tracking-wide text-on-surface-variant uppercase">livres</span>
            </span>
          </Ring>
        )}
      </div>
      {last && (
        <div className="flex items-start gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
          <Icon name="history_edu" size={18} className={cx('mt-px shrink-0', last.faltas > 0 ? 'text-error' : 'text-on-surface-variant')} />
          <p className="min-w-0 flex-1">
            <span className="text-on-surface-variant">{lastDay ? relativeDay(lastDay) : ''}{last.faltas > 0 && <span className="text-error"> · {last.faltas} {last.faltas === 1 ? 'falta' : 'faltas'}</span>}: </span>
            <span className="line-clamp-2 inline">{last.conteudo || 'conteúdo não informado'}</span>
          </p>
        </div>
      )}
      <div className="flex gap-1.5">
        {s.grades.map((g, i) => {
          // Etapa ainda aberta: mostra a média das avaliações já lançadas nela
          const part = g === null && stage?.etapa === i + 1 ? stage.avg : null;
          return (
            <div key={i} className={cx('flex-1 rounded-md py-1.5 text-center', g === null ? 'border border-dashed border-outline-variant' : 'bg-surface-container-highest')}>
              <p className="text-[10px] font-medium text-on-surface-variant">N{i + 1}{part !== null && ` · ${stage!.done}/${stage!.total}`}</p>
              <p className={cx('text-sm font-semibold tabular', gradeTone(g ?? part), part !== null && 'opacity-75')}>{g ?? (part !== null ? `~${Math.round(part)}` : '–')}</p>
            </div>
          );
        })}
        {s.finalExam !== null && (
          <div className="flex-1 rounded-md bg-warning-container py-1.5 text-center text-on-warning-container">
            <p className="text-[10px] font-medium">Final</p>
            <p className="text-sm font-semibold tabular">{s.finalExam}</p>
          </div>
        )}
      </div>
      <div className="mt-auto"><AbsenceMeter used={s.absences} limit={s.limit} level={lvl} /></div>
      {!official && avg !== null && <span className="sr-only">Média parcial</span>}
    </Tap>

      {/* Detalhes sem sair da lista: notas de cada avaliação, horário e carga horária */}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="state flex items-center gap-2 rounded-b-2xl border-t border-outline-variant/50 px-4 py-2.5 text-left text-sm font-medium text-on-surface-variant">
        <Icon name="grade" size={18} />
        <span className="flex-1">{stages.length ? 'Notas parciais e detalhes' : 'Detalhes'}</span>
        <m.span animate={{ rotate: open ? 180 : 0 }} className="inline-flex"><Icon name="expand_more" size={20} /></m.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }} className="overflow-hidden">
            <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
              {stages.map((n) => {
                const items = parciais!.filter((x) => x.etapa === n);
                return (
                  <div key={n}>
                    <p className="mb-1 text-xs font-medium text-on-surface-variant">{n}ª etapa</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((x, i) => (
                        <span key={i} title={x.tipo} className={cx('flex items-center gap-1.5 rounded-md px-2 py-1', x.nota === null ? 'border border-dashed border-outline-variant' : 'bg-surface-container-highest')}>
                          <span className="text-xs text-on-surface-variant">{x.sigla}</span>
                          <span className={cx('font-semibold tabular', gradeTone(x.nota))}>{x.nota ?? '–'}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!stages.length && <p className="text-on-surface-variant">Nenhuma avaliação detalhada no SUAP ainda.</p>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-on-surface-variant">
                {slots && <><dt>Horário</dt><dd className="text-on-surface">{slots}</dd></>}
                {s.rooms[0] && <><dt>Sala</dt><dd className="text-on-surface">{s.rooms[0]}</dd></>}
                <dt>Aulas</dt><dd className="text-on-surface tabular">{s.workloadDone} de {s.workload} dadas · frequência {Math.round(s.attendance)}%</dd>
                <dt>Faltas</dt><dd className="text-on-surface tabular">{s.absences} de {s.limit} · {left >= 0 ? `sobram ${left}` : `${-left} além do limite`}</dd>
                {s.status && <><dt>Situação</dt><dd className="text-on-surface">{s.status}</dd></>}
              </dl>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
