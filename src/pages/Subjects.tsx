import { useMemo, useState } from 'react';
import { useDisciplinas, usePeriod } from '../lib/data';
import { absenceLevel, currentAverage, gradeTone, outlook, type GradeOutlook } from '../lib/grades';
import { subjectTone, type Subject } from '../lib/suap';
import { TONES } from '../lib/tones';
import { AbsenceMeter, Card, Chip, cx, Empty, ErrorNote, Icon, Item, Ring, Segmented, Skeleton, Stagger, Tap, TopTitle } from '../components/ui';
import { PeriodSelect } from '../components/PeriodSelect';

type Sort = 'nome' | 'faltas' | 'media';
type Filter = 'todas' | 'risco' | 'final' | 'ok';

const isRisk = (s: Subject) => { const l = absenceLevel(s); return l === 'critical' || l === 'over' || l === 'caution'; };

export function Subjects() {
  const { period } = usePeriod();
  const { data, error, loading, refresh } = useDisciplinas(period);
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
          {list.map((s) => <Item key={s.code}><SubjectCard s={s} /></Item>)}
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

function SubjectCard({ s }: { s: Subject }) {
  const t = TONES[subjectTone(s)];
  const lvl = absenceLevel(s);
  const o = outlook(s);
  const label = outlookLabel(o);
  const avg = currentAverage(s);
  const official = (s.finalAverage ?? s.average) !== null;

  return (
    <Tap to={`/disciplinas/${s.code}`} className="flex h-full flex-col gap-4 rounded-2xl bg-surface-container p-4">
      <div className="flex items-start gap-3">
        <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', t.container, t.onContainer)}>
          {s.name.split(' ').filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || s.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{s.name}</p>
          <p className={cx('mt-0.5 flex items-center gap-1 text-sm', label.tone)}><Icon name={label.icon} size={16} />{label.text}</p>
        </div>
        <Ring value={(avg ?? 0) / 100} size={52} stroke={5} color={t.varColor} track={t.varContainer}>
          <span className={cx('text-base font-semibold tabular', gradeTone(avg))}>{avg !== null ? Math.round(avg) : '–'}</span>
        </Ring>
      </div>
      <div className="flex gap-1.5">
        {s.grades.map((g, i) => (
          <div key={i} className={cx('flex-1 rounded-md py-1.5 text-center', g === null ? 'border border-dashed border-outline-variant' : 'bg-surface-container-highest')}>
            <p className="text-[10px] font-medium text-on-surface-variant">N{i + 1}</p>
            <p className={cx('text-sm font-semibold tabular', gradeTone(g))}>{g ?? '–'}</p>
          </div>
        ))}
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
  );
}
