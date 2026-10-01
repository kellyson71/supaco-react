import { useMemo, useState } from 'react';
import { useAulas, useDisciplinas, usePeriod } from '../lib/data';
import { absenceLevel, currentAverage, FINAL_MIN, gradeTone, neededFinal, outlook, PASS, weightsFor, type GradeOutlook } from '../lib/grades';
import { WEEKDAYS } from '../lib/schedule';
import { back } from '../lib/router';
import { aulaMatchesSubject, subjectTone, type Aula, type Subject } from '../lib/suap';
import { TONES } from '../lib/tones';
import { parseDay } from '../lib/dates';
import { Turma } from '../components/Turma';
import { LessonSheet } from '../components/LessonSheet';
import { AnimatePresence } from 'motion/react';
import { AbsenceMeter, Badge, Button, Card, CountUp, cx, Empty, Icon, IconButton, Item, levelColor, Ring, SectionHeader, Shape, Skeleton, Stagger } from '../components/ui';

export function SubjectDetail({ code }: { code: string }) {
  const { period } = usePeriod();
  const { data, loading } = useDisciplinas(period);
  const s = data?.find((x) => x.code === code);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/disciplinas')} />
        <span className="text-sm font-medium text-on-surface-variant">Matérias</span>
      </div>
      {loading && <Skeleton className="h-80" />}
      {data && !s && <Card className="rounded-2xl"><Empty icon="search_off" title="Matéria não encontrada neste período" /></Card>}
      {s && <Detail s={s} />}
    </>
  );
}

function verdict(o: GradeOutlook, s: Subject): string {
  switch (o.kind) {
    case 'passed': return `Aprovado com média ${Math.round(o.average)}.`;
    case 'failed': return o.average !== null && o.average < FINAL_MIN ? 'Média abaixo de 20: sem direito à prova final.' : 'Reprovado nesta matéria.';
    case 'secured': return 'Média 60 garantida, mesmo tirando zero no que falta.';
    case 'empty': return `Nenhuma nota lançada ainda. Para passar direto, a média precisa chegar a ${PASS}.`;
    case 'needs': {
      const which = o.stagesLeft === 1 ? `na N${s.grades.findIndex((g) => g === null) + 1}` : `em cada uma das ${o.stagesLeft} etapas que faltam`;
      return o.needed > 100 ? `Nem com 100 ${which} fecha 60: vai para a prova final.` : `Você precisa de ${o.needed} ${which} para passar direto.`;
    }
    case 'final': return o.needed !== null ? `Média ${Math.round(o.average)}: prova final, e precisa de ${o.needed} nela.` : `Média ${Math.round(o.average)}: prova final.`;
  }
}

function Detail({ s }: { s: Subject }) {
  const t = TONES[subjectTone(s)];
  const o = outlook(s);
  const avg = currentAverage(s);
  const official = (s.finalAverage ?? s.average) !== null;
  const status = s.status && !/cursando/i.test(s.status) ? s.status : null;

  return (
    <Stagger className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Item className="xl:col-span-12">
        <div className={cx('relative overflow-hidden rounded-2xl p-6 md:p-8', t.container, t.onContainer)}>
          <Shape shape="sunny" size={320} spin className="pointer-events-none absolute -top-24 -right-20 opacity-10" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                {s.sigla && <Badge className="bg-white/50 !text-current dark:bg-black/25">{s.sigla}</Badge>}
                {status && <Badge className="bg-white/50 !text-current dark:bg-black/25">{status}</Badge>}
                <Badge className="bg-white/50 !text-current dark:bg-black/25">{s.workload} aulas · {s.stages} {s.stages === 1 ? 'etapa' : 'etapas'}</Badge>
              </div>
              <h1 className="mt-3 text-[36px] leading-[44px] font-semibold tracking-tight md:text-[52px] md:leading-[60px]">{s.name}</h1>
              <p className="mt-2 max-w-xl text-base opacity-90">{verdict(o, s)}</p>
            </div>
            <Ring value={(avg ?? 0) / 100} size={132} stroke={12} color="currentColor" track="rgb(0 0 0 / .1)" className="self-start md:self-center">
              <div className="text-center leading-none">
                <CountUp value={avg !== null ? Math.round(avg) : null} className="text-[44px] font-semibold" />
                <p className="mt-1 text-xs font-medium opacity-80">{official ? 'média' : 'média parcial'}</p>
              </div>
            </Ring>
          </div>
        </div>
      </Item>

      <Item className="xl:col-span-7"><Grades s={s} /></Item>
      <Item className="xl:col-span-5"><Absences s={s} /></Item>
      <Item className="xl:col-span-12"><Turma code={s.code} /></Item>
      <Item className="xl:col-span-12"><History s={s} /></Item>
    </Stagger>
  );
}

function Grades({ s }: { s: Subject }) {
  const w = weightsFor(s.stages);
  const missing = s.grades.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0);
  const [sim, setSim] = useState<Record<number, number>>(() => Object.fromEntries(missing.map((i) => [i, 60])));
  const closed = /aprovad|reprovad/i.test(s.status);
  const grades = s.grades.map((g, i) => g ?? sim[i] ?? 0);
  const simAvg = grades.reduce((a, g, i) => a + g * w[i], 0) / w.reduce((a, b) => a + b, 0);

  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Notas" icon="grade" action={<span className="text-sm text-on-surface-variant">passa com {PASS}</span>} />
      <div className="flex gap-2">
        {s.grades.map((g, i) => (
          <div key={i} className={cx('flex-1 rounded-lg px-2 py-3 text-center', g === null ? 'border-2 border-dashed border-outline-variant' : 'bg-surface-container-highest')}>
            <p className="text-xs font-medium text-on-surface-variant">N{i + 1} · peso {w[i]}</p>
            <p className={cx('mt-1 text-[28px] leading-9 font-semibold tabular', gradeTone(g))}>{g ?? '–'}</p>
          </div>
        ))}
        {s.finalExam !== null && (
          <div className="flex-1 rounded-lg bg-warning-container px-2 py-3 text-center text-on-warning-container">
            <p className="text-xs font-medium">Final</p>
            <p className="mt-1 text-[28px] leading-9 font-semibold tabular">{s.finalExam}</p>
          </div>
        )}
      </div>

      <NextStep s={s} />

      {missing.length > 0 && !closed && (
        <div className="mt-4 rounded-xl bg-surface-container-low p-4">
          <p className="flex items-center gap-2 font-medium"><Icon name="science" className="text-tertiary" fill /> Simular: e se eu tirar…</p>
          <div className="mt-3 flex flex-col gap-3">
            {missing.map((i) => (
              <label key={i} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium text-on-surface-variant">N{i + 1}</span>
                <input type="range" min={0} max={100} value={sim[i]} onChange={(e) => setSim({ ...sim, [i]: Number(e.target.value) })}
                  className="h-2 flex-1 cursor-pointer accent-[var(--md-primary)]" aria-label={`Nota simulada da N${i + 1}`} />
                <span className="w-10 rounded-md bg-primary py-1 text-center text-sm font-semibold text-on-primary tabular">{sim[i]}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm">
            Média ficaria <b className={cx('text-lg tabular', simAvg >= PASS ? 'text-success' : simAvg >= FINAL_MIN ? 'text-warning' : 'text-error')}>{Math.round(simAvg)}</b>
            <span className="text-on-surface-variant">
              {simAvg >= PASS ? ' · passa direto' : simAvg >= FINAL_MIN ? ` · na final precisaria de ${neededFinal({ ...s, grades })}` : ' · sem direito à final'}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}

/** Quando não há mais o que simular, mostra o próximo passo (prova final, aprovado...). */
function NextStep({ s }: { s: Subject }) {
  const o = outlook(s);
  if (o.kind === 'final' && o.needed !== null) {
    return (
      <div className="mt-4 flex items-center gap-4 rounded-xl bg-warning-container p-4 text-on-warning-container">
        <Ring value={o.needed / 100} size={72} stroke={7} color="currentColor" track="rgb(0 0 0 / .1)">
          <span className="text-xl font-semibold tabular">{o.needed}</span>
        </Ring>
        <div>
          <p className="font-medium">Nota mínima na prova final</p>
          <p className="text-sm opacity-85">A média final é a maior entre (média + final) ÷ 2 e a média trocando a pior etapa pela final.</p>
        </div>
      </div>
    );
  }
  if (o.kind === 'passed' || o.kind === 'secured') {
    return (
      <div className="mt-4 flex items-center gap-4 rounded-xl bg-success-container p-4 text-on-success-container">
        <Shape shape="flower" size={56} className="text-success"><Icon name="celebration" className="text-on-success" fill /></Shape>
        <p className="font-medium">{o.kind === 'passed' ? 'Aprovado nesta matéria.' : 'Média garantida: dá para passar mesmo tirando zero no resto.'}</p>
      </div>
    );
  }
  return null;
}

function Absences({ s }: { s: Subject }) {
  const lvl = absenceLevel(s);
  const c = levelColor[lvl];
  const left = s.limit - s.absences;
  const perDay = new Map<number, number>();
  s.slots.forEach((sl) => perDay.set(sl.day, (perDay.get(sl.day) ?? 0) + sl.lessons));

  return (
    <Card variant="filled" className="h-full rounded-2xl p-5">
      <SectionHeader title="Faltas" icon="event_busy" action={<span className="text-sm text-on-surface-variant">limite de 25%</span>} />
      <div className="flex items-center gap-4">
        <Shape shape="cookie" size={72} className={c.text}><Icon name={c.icon} size={34} className="text-[var(--md-surface)]" fill /></Shape>
        <div>
          <p className={cx('text-[52px] leading-none font-semibold tracking-tight', c.text)}><CountUp value={Math.max(left, 0)} /></p>
          <p className="mt-1 text-sm text-on-surface-variant">{left < 0 ? `${-left} acima do limite` : left === 1 ? 'falta livre' : 'faltas livres'}</p>
        </div>
      </div>
      <div className="mt-5"><AbsenceMeter used={s.absences} limit={s.limit} level={lvl} /></div>

      {perDay.size > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Se faltar um dia inteiro…</p>
          <div className="flex flex-col gap-1.5">
            {[...perDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => {
              const after = left - n;
              const days = Math.floor(Math.max(left, 0) / n);
              return (
                <div key={d} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                  <span className="w-16 font-medium">{WEEKDAYS[d]}</span>
                  <span className="text-on-surface-variant">−{n} {n === 1 ? 'falta' : 'faltas'}</span>
                  <span className={cx('ml-auto font-medium', after < 0 ? 'text-error' : after <= 2 ? 'text-warning' : 'text-success')}>
                    {after < 0 ? 'estoura o limite' : `ainda pode ${days} ${days === 1 ? 'vez' : 'vezes'}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-on-surface-variant">Frequência {Math.round(s.attendance)}% · {s.workloadDone} de {s.workload} aulas dadas</p>
    </Card>
  );
}

/** Histórico de aulas do SUAP (minhas-aulas): o que foi dado e em quais dias você faltou. */
function History({ s }: { s: Subject }) {
  const { period } = usePeriod();
  const { data, loading, error } = useAulas(period);
  const [onlyAbsent, setOnlyAbsent] = useState(false);
  const [open, setOpen] = useState<Aula | null>(null);

  const mine = useMemo(() => (data ?? []).filter((a: Aula) => aulaMatchesSubject(a, s)), [data, s]);
  const list = onlyAbsent ? mine.filter((a) => a.faltas > 0) : mine;
  const absentDays = mine.filter((a) => a.faltas > 0).length;

  return (
    <Card variant="filled" className="rounded-2xl p-5">
      <SectionHeader title="Histórico de aulas" icon="history_edu"
        action={mine.length > 0 && (
          <Button variant={onlyAbsent ? 'tonal' : 'outlined'} size="sm" icon={onlyAbsent ? 'check' : 'filter_list'} onClick={() => setOnlyAbsent(!onlyAbsent)}>
            Só faltas ({absentDays})
          </Button>
        )} />
      {loading ? <Skeleton className="h-40" /> : error && !data ? (
        <p className="text-sm text-on-surface-variant">Não foi possível carregar o histórico.</p>
      ) : list.length === 0 ? (
        <Empty icon="menu_book" title={onlyAbsent ? 'Nenhuma falta registrada' : 'Sem aulas registradas ainda'}>O SUAP mostra aqui o conteúdo de cada aula lançada pelo professor.</Empty>
      ) : (
        <ol className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
          {list.slice(0, 40).map((a) => {
            const d = parseDay(a.data);
            return (
              <li key={a.id}>
              <button onClick={() => setOpen(a)} className={cx('state flex w-full gap-3 rounded-lg px-3 py-2.5 text-left', a.faltas > 0 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low')}>
                <div className="w-11 shrink-0 text-center leading-tight">
                  <p className="text-lg font-semibold tabular">{d?.getDate() ?? '–'}</p>
                  <p className="text-[10px] font-medium uppercase opacity-75">{d?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{a.conteudo || 'Sem conteúdo informado'}</p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {a.qtd_aulas} {a.qtd_aulas === 1 ? 'aula' : 'aulas'}{a.faltas > 0 ? ` · ${a.faltas} ${a.faltas === 1 ? 'falta' : 'faltas'}` : ' · presente'}
                  </p>
                </div>
                <Icon name="chevron_right" size={20} className="self-center opacity-50" />
              </button>
              </li>
            );
          })}
        </ol>
      )}
      <AnimatePresence>
        {open && data && <LessonSheet key={open.id} date={open.data} only={open} aulas={data} subjects={[s]} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </Card>
  );
}
