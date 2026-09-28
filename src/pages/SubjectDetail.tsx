import { useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useDisciplinas, usePeriod } from '../lib/data';
import { absenceLevel, FINAL_MIN, gradeTone, neededFinal, outlook, PASS, weightsFor, type GradeOutlook } from '../lib/grades';
import { WEEKDAYS } from '../lib/schedule';
import { back } from '../lib/router';
import type { Subject } from '../lib/suap';
import { Badge, Card, cx, Empty, Eyebrow, levelText, Skeleton, Tally } from '../components/ui';

export function SubjectDetail({ code }: { code: string }) {
  const { period } = usePeriod();
  const { data, loading } = useDisciplinas(period);
  const s = data?.find((x) => x.code === code);

  return (
    <div className="rise">
      <button onClick={() => back('/disciplinas')} className="-ml-2 mb-4 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> Disciplinas
      </button>
      {loading && <Skeleton className="h-80" />}
      {data && !s && <Card><Empty title="Disciplina não encontrada neste período" /></Card>}
      {s && <Detail s={s} />}
    </div>
  );
}

function Detail({ s }: { s: Subject }) {
  const o = outlook(s);
  const status = s.status && !/cursando/i.test(s.status) ? s.status : null;

  return (
    <>
      <header className="mb-6">
        <p className="font-mono text-xs text-muted">{s.sigla}</p>
        <h1 className="mt-1 font-display text-[28px] leading-tight font-semibold tracking-tight md:text-4xl">{s.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {status && <Badge tone={/aprovad/i.test(status) ? 'brand' : /reprovad/i.test(status) ? 'bad' : 'muted'}>{status}</Badge>}
          <Badge>{s.workload} aulas no total</Badge>
          <Badge>{s.stages} {s.stages === 1 ? 'etapa' : 'etapas'}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GradesCard s={s} o={o} />
        <AbsencesCard s={s} />
      </div>

      {s.slots.length > 0 && (
        <div className="mt-6">
          <Eyebrow>Horários</Eyebrow>
          <Card className="divide-y divide-line">
            {s.slots.map((sl, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <span className="w-16 shrink-0 font-medium">{WEEKDAYS[sl.day]}</span>
                <span className="shrink-0 font-mono text-sm whitespace-nowrap">{sl.start}–{sl.end}</span>
                <span className="ml-auto flex min-w-0 items-center gap-1 truncate text-sm text-muted">
                  {sl.room && <><MapPin size={13} />{sl.room}</>}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </>
  );
}

function verdict(o: GradeOutlook, s: Subject): string {
  switch (o.kind) {
    case 'passed': return `Aprovado com média ${Math.round(o.average)}.`;
    case 'failed': return o.average !== null && o.average < FINAL_MIN ? 'Média abaixo de 20: sem direito à prova final.' : 'Reprovado nesta disciplina.';
    case 'secured': return 'Média 60 já garantida, mesmo tirando zero no que falta.';
    case 'empty': return `Sem notas lançadas ainda. Para passar direto, a média precisa chegar a ${PASS}.`;
    case 'needs': {
      const which = o.stagesLeft === 1 ? `na N${s.grades.findIndex((g) => g === null) + 1}` : `em cada uma das ${o.stagesLeft} etapas restantes`;
      return o.needed > 100
        ? `Mesmo com 100 ${which} não dá para fechar 60. Você deve ir para a prova final.`
        : `Você precisa de ${o.needed} ${which} para passar direto.`;
    }
    case 'final': return o.needed !== null ? `Média ${Math.round(o.average)}: vai para a prova final e precisa de ${o.needed} nela.` : `Média ${Math.round(o.average)}: prova final.`;
  }
}

function GradesCard({ s, o }: { s: Subject; o: GradeOutlook }) {
  const w = weightsFor(s.stages);
  const [sim, setSim] = useState<Record<number, string>>({});
  const missing = s.grades.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0);
  const simGrades = s.grades.map((g, i) => (g ?? (sim[i] !== undefined && sim[i] !== '' ? Math.min(100, Number(sim[i])) : null)));
  const simComplete = simGrades.every((g) => g !== null);
  const simAvg = simComplete ? simGrades.reduce<number>((a, g, i) => a + g! * w[i], 0) / w.reduce((a, b) => a + b, 0) : null;
  const avg = s.finalAverage ?? s.average;

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Notas</h2>
        <span className="text-xs text-muted">passa com {PASS}</span>
      </div>
      <div className="mt-4 flex items-end gap-5">
        {avg === null && o.kind === 'needs' && o.needed <= 100 ? (
          <div>
            <p className="font-mono text-6xl leading-none font-semibold text-ink/70 tabular">{o.needed}</p>
            <p className="mt-1 text-xs text-muted">precisa{o.stagesLeft > 1 ? ' por etapa' : ` na N${s.grades.indexOf(null) + 1}`}</p>
          </div>
        ) : (
          <div>
            <p className={cx('font-mono text-6xl leading-none font-semibold tabular', gradeTone(avg))}>{avg ?? '–'}</p>
            <p className="mt-1 text-xs text-muted">{s.finalAverage !== null ? 'média final' : 'média'}</p>
          </div>
        )}
        <div className="grid flex-1 grid-cols-4 gap-2">
          {s.grades.map((g, i) => (
            <div key={i} className="rounded-xl bg-surface-2 px-2 py-2 text-center">
              <p className="text-[10px] text-muted">N{i + 1} <span className="opacity-70">×{w[i]}</span></p>
              <p className={cx('font-mono text-lg font-semibold tabular', gradeTone(g))}>{g ?? '–'}</p>
            </div>
          ))}
          {s.finalExam !== null && (
            <div className="rounded-xl bg-surface-2 px-2 py-2 text-center">
              <p className="text-[10px] text-muted">Final</p>
              <p className={cx('font-mono text-lg font-semibold tabular', gradeTone(s.finalExam))}>{s.finalExam}</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 text-[15px] leading-snug">{verdict(o, s)}</p>

      {missing.length > 0 && o.kind !== 'passed' && o.kind !== 'failed' && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-medium text-muted">Simular notas que faltam</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {missing.map((i) => (
              <label key={i} className="flex items-center gap-1.5 text-sm">
                <span className="text-muted">N{i + 1}</span>
                <input
                  type="number" min={0} max={100} inputMode="numeric"
                  value={sim[i] ?? ''}
                  onChange={(e) => setSim({ ...sim, [i]: e.target.value })}
                  className="w-20 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono outline-none focus:border-brand"
                  placeholder="nota"
                />
              </label>
            ))}
            {simAvg !== null && (
              <span className={cx('ml-auto font-mono text-sm font-semibold', simAvg >= PASS ? 'text-brand' : simAvg >= FINAL_MIN ? 'text-warn' : 'text-bad')}>
                média {Math.round(simAvg)}
                {simAvg < PASS && simAvg >= FINAL_MIN && ` · final ${neededFinal({ ...s, grades: simGrades })}`}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function AbsencesCard({ s }: { s: Subject }) {
  const lvl = absenceLevel(s);
  const left = s.limit - s.absences;
  // Aulas por dia da semana para traduzir "faltar um dia" em número de faltas
  const perDay = new Map<number, number>();
  s.slots.forEach((sl) => perDay.set(sl.day, (perDay.get(sl.day) ?? 0) + sl.lessons));
  const avgPerDay = perDay.size ? [...perDay.values()].reduce((a, b) => a + b, 0) / perDay.size : 0;

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Faltas</h2>
        <span className="text-xs text-muted">limite {s.limit} (25%)</span>
      </div>
      <div className="mt-4 flex items-end gap-3">
        <p className={cx('font-mono text-6xl leading-none font-semibold tabular', levelText[lvl])}>{Math.max(left, 0)}</p>
        <p className="mb-1 text-sm text-muted">{left < 0 ? `faltas acima do limite (${-left})` : left === 1 ? 'falta livre' : 'faltas livres'}</p>
      </div>
      <div className="mt-5"><Tally used={s.absences} limit={s.limit} level={lvl} /></div>
      <p className="mt-3 text-sm text-muted">{s.absences} de {s.limit} usadas · frequência {Math.round(s.attendance)}%</p>

      {avgPerDay > 0 && left >= 0 && (
        <p className="mt-5 border-t border-line pt-4 text-[15px] leading-snug">
          {Math.floor(left / avgPerDay) === 0
            ? <>Faltar <b className="font-semibold">mais um dia</b> dessa disciplina já passa do limite.</>
            : <>Dá para faltar mais <b className="font-semibold">{Math.floor(left / avgPerDay)} {Math.floor(left / avgPerDay) === 1 ? 'dia' : 'dias'}</b> dessa disciplina.</>}
          <span className="mt-1 block text-sm text-muted">
            {[...perDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => `${WEEKDAYS[d].toLowerCase()} = ${n} ${n === 1 ? 'falta' : 'faltas'}`).join(' · ')}
          </span>
        </p>
      )}

      {s.workload > 0 && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted"><span>Aulas dadas</span><span className="font-mono">{s.workloadDone}/{s.workload}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-ink/40" style={{ width: `${Math.min(100, (s.workloadDone / s.workload) * 100)}%` }} />
          </div>
        </div>
      )}
    </Card>
  );
}
