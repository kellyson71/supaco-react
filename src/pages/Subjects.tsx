import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useDisciplinas, usePeriod } from '../lib/data';
import { absenceLevel, gradeTone, outlook, type GradeOutlook } from '../lib/grades';
import type { Subject } from '../lib/suap';
import { Card, cx, Empty, ErrorNote, levelText, PageHeader, Segmented, Skeleton, Tally } from '../components/ui';
import { PeriodSelect } from '../components/PeriodSelect';
import { Link } from '../components/Shell';

type Sort = 'nome' | 'faltas' | 'media';

export function Subjects() {
  const { period } = usePeriod();
  const { data, error, loading, refresh } = useDisciplinas(period);
  const [sort, setSort] = useState<Sort>('nome');

  const list = useMemo(() => {
    const l = [...(data ?? [])];
    if (sort === 'faltas') l.sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));
    if (sort === 'media') l.sort((a, b) => ((a.finalAverage ?? a.average) ?? 101) - ((b.finalAverage ?? b.average) ?? 101));
    return l;
  }, [data, sort]);

  return (
    <div className="rise">
      <PageHeader title="Disciplinas" subtitle={data ? `${data.length} no período` : undefined} right={<PeriodSelect />} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented<Sort>
          value={sort}
          onChange={setSort}
          options={[{ value: 'nome', label: 'A–Z' }, { value: 'faltas', label: 'Faltas' }, { value: 'media', label: 'Média' }]}
        />
        <p className="hidden text-xs text-muted sm:block">Cada traço é uma falta permitida</p>
      </div>

      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <div className="flex flex-col gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {data && data.length === 0 && <Card><Empty title="Nenhuma disciplina neste período" /></Card>}

      {list.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {list.map((s) => <SubjectRow key={s.code} s={s} />)}
        </Card>
      )}
    </div>
  );
}

export function outlookLabel(o: GradeOutlook): { text: string; tone: string } {
  switch (o.kind) {
    case 'passed': return { text: 'aprovado', tone: 'text-brand' };
    case 'failed': return { text: 'reprovado', tone: 'text-bad' };
    case 'final': return { text: 'prova final', tone: 'text-warn' };
    case 'secured': return { text: 'média garantida', tone: 'text-brand' };
    case 'needs': return { text: o.needed > 100 ? 'vai à final' : `precisa ${o.needed}`, tone: o.needed > 100 ? 'text-bad' : o.needed > 75 ? 'text-warn' : 'text-muted' };
    default: return { text: 'sem notas', tone: 'text-muted' };
  }
}

function SubjectRow({ s }: { s: Subject }) {
  const lvl = absenceLevel(s);
  const o = outlook(s);
  const label = outlookLabel(o);
  const avg = s.finalAverage ?? s.average;
  const left = s.limit - s.absences;

  return (
    <Link to={`/disciplinas/${s.code}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{s.name}</p>
        <div className="mt-1.5 flex items-center gap-2.5 font-mono text-[13px] tabular">
          {s.grades.map((g, i) => (
            <span key={i} className="flex items-baseline gap-1">
              <span className="text-[10px] text-muted">N{i + 1}</span>
              <span className={cx('font-medium', gradeTone(g))}>{g ?? '–'}</span>
            </span>
          ))}
          {s.finalExam !== null && (
            <span className="flex items-baseline gap-1"><span className="text-[10px] text-muted">NAF</span><span className={gradeTone(s.finalExam)}>{s.finalExam}</span></span>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <Tally used={s.absences} limit={s.limit} level={lvl} size="sm" />
          <span className={cx('text-xs font-medium whitespace-nowrap', lvl === 'safe' ? 'text-muted' : levelText[lvl])}>
            {left < 0 ? `${-left} acima` : `${left} ${left === 1 ? 'livre' : 'livres'}`}
          </span>
        </div>
      </div>
      <div className="w-20 shrink-0 text-right">
        {avg === null && o.kind === 'needs' && o.needed <= 100 ? (
          <>
            <p className={cx('font-mono text-[28px] leading-none font-semibold tabular', label.tone === 'text-muted' ? 'text-ink/70' : label.tone)}>{o.needed}</p>
            <p className="mt-1.5 text-[11px] font-semibold text-muted">precisa{o.stagesLeft > 1 ? ' por etapa' : ` na N${s.grades.indexOf(null) + 1}`}</p>
          </>
        ) : (
          <>
            <p className={cx('font-mono text-[28px] leading-none font-semibold tabular', gradeTone(avg))}>{avg ?? '–'}</p>
            <p className={cx('mt-1.5 text-[11px] font-semibold', label.tone)}>{label.text}</p>
          </>
        )}
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
