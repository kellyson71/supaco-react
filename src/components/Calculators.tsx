// Calculadoras abertas (sem login): quanto preciso tirar e quantas faltas ainda posso ter, com as regras do IFRN.
import { useState, type ReactNode } from 'react';
import { absenceAnswer, gradeAnswer, parseGrade, type CalcTone } from '../lib/calc';
import { cx, Icon, Segmented } from './ui';

const TONE: Record<CalcTone, string> = {
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-secondary-container text-on-secondary-container',
};

/** Só dígitos, até `max`: o campo nunca guarda um valor que a conta não entende. */
const digits = (raw: string, max: number) => {
  const d = raw.replace(/\D/g, '').slice(0, String(max).length);
  return d === '' ? '' : String(Math.min(max, Number(d)));
};

/** Campo numérico em forma de cartão: rótulo pequeno em cima, número grande embaixo. */
function NumberBox({ label, value, onChange, max, placeholder = '–', hint, className }: {
  label: string; value: string; onChange: (v: string) => void; max: number; placeholder?: string; hint?: string; className?: string;
}) {
  return (
    <label className={cx('flex min-w-0 flex-1 cursor-text flex-col rounded-lg border-2 px-3 py-3 text-center transition-colors focus-within:border-primary',
      value === '' ? 'border-dashed border-outline-variant' : 'border-transparent bg-surface-container-highest', className)}>
      <span className="text-xs font-medium text-on-surface-variant">{label}</span>
      <input inputMode="numeric" autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => onChange(digits(e.target.value, max))}
        className="mt-1 w-full min-w-0 bg-transparent text-center text-[32px] leading-10 font-semibold tabular outline-none placeholder:text-on-surface-variant/60" />
      {hint && <span className="text-[11px] text-on-surface-variant">{hint}</span>}
    </label>
  );
}

/** A resposta em destaque: o número grande e a frase que o explica. */
function Answer({ tone, lead, big, where, text, children }: { tone: CalcTone; lead: string; big: string; where: string; text: string; children?: ReactNode }) {
  return (
    <div aria-live="polite" className={cx('flex flex-col justify-center rounded-2xl p-6 transition-colors duration-300 sm:p-8', TONE[tone])}>
      <p className="text-sm font-medium opacity-80">{lead}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className={cx('font-semibold tracking-tight tabular', /^\d+$/.test(big) ? 'text-[88px] leading-[88px] sm:text-[112px] sm:leading-[104px]' : 'text-[56px] leading-[64px] sm:text-[72px] sm:leading-[80px]')}>{big}</span>
        <span className="text-xl font-medium">{where}</span>
      </p>
      <p className="mt-4 text-base">{text}</p>
      {children}
    </div>
  );
}

const STAGES = [
  { value: '2', label: '2 etapas' },
  { value: '4', label: '4 etapas' },
] as const;

/** Quanto falta tirar para passar, com os pesos das etapas e a regra da prova final. */
export function GradeCalculator() {
  const [stages, setStages] = useState<'2' | '4'>('2');
  // Começa com um exemplo preenchido, para a resposta já aparecer
  const [raw, setRaw] = useState(['50', '', '', '']);
  const n = Number(stages);
  const grades = raw.slice(0, n).map(parseGrade);
  const a = gradeAnswer(n, grades);
  const total = a.weights.reduce((x, y) => x + y, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmented value={stages} options={[...STAGES]} onChange={setStages} />
          <p className="text-sm text-on-surface-variant">{n === 2 ? 'Disciplina semestral' : 'Disciplina anual'}</p>
        </div>

        <div className="mt-5 flex gap-2 sm:gap-3">
          {a.weights.map((w, i) => (
            <NumberBox key={i} label={`N${i + 1} · peso ${w}`} value={raw[i]} max={100} onChange={(v) => setRaw(raw.map((x, j) => (j === i ? v : x)))} />
          ))}
        </div>
        <p className="mt-3 text-sm text-on-surface-variant">Notas de 0 a 100. Deixe em branco a etapa que ainda não tem nota.</p>

        {/* A conta com os números de quem está usando, para dar para conferir */}
        <p className="mt-auto pt-5 text-sm text-on-surface-variant tabular">
          <span className="font-medium text-on-surface">Média</span>{' = ('}
          {a.weights.map((w, i) => `${w} × ${grades[i] ?? `N${i + 1}`}`).join(' + ')}
          {`) ÷ ${total}`}
          {a.average !== null && grades.every((g) => g !== null) && <> = <b className="font-semibold text-on-surface">{a.average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b></>}
        </p>
      </div>

      <Answer tone={a.tone} lead={a.lead} big={a.big} where={a.where} text={a.detail} />
    </div>
  );
}

const WORKLOADS = [40, 60, 80, 120, 160];
const PER_DAY = [1, 2, 3, 4];

/** Limite de 25% de faltas de uma disciplina e quanto ainda sobra. */
export function AbsenceCalculator() {
  const [workload, setWorkload] = useState('80');
  const [absences, setAbsences] = useState('6');
  const [perDay, setPerDay] = useState(2);
  const a = absenceAnswer(Number(workload) || 0, Number(absences) || 0, perDay);
  const pct = a.limit ? Math.min(1, (Number(absences) || 0) / a.limit) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="flex flex-col">
        <div className="flex gap-2 sm:gap-3">
          <NumberBox label="Carga horária" hint="em aulas" value={workload} max={999} onChange={setWorkload} />
          <NumberBox label="Faltas até agora" hint="no boletim" value={absences} max={999} placeholder="0" onChange={setAbsences} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cargas horárias comuns">
          {WORKLOADS.map((w) => (
            <button key={w} type="button" onClick={() => setWorkload(String(w))} aria-pressed={workload === String(w)}
              className={cx('state h-8 rounded-lg px-3 text-sm font-medium', workload === String(w) ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant')}>
              {w} aulas
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm font-medium">Quantas aulas dessa matéria você tem por dia?</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Aulas por dia">
          {PER_DAY.map((d) => (
            <button key={d} type="button" onClick={() => setPerDay(d)} aria-pressed={perDay === d}
              className={cx('state h-8 min-w-12 rounded-lg px-3 text-sm font-medium', perDay === d ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant')}>
              {d}
            </button>
          ))}
        </div>
        <p className="mt-auto pt-5 text-sm text-on-surface-variant tabular">
          <span className="font-medium text-on-surface">Limite</span>{` = 25% de ${Number(workload) || 0} aulas = `}<b className="font-semibold text-on-surface">{a.limit} faltas</b>
        </p>
      </div>

      <Answer tone={a.tone} lead={!a.limit ? 'Limite de faltas' : a.left < 0 ? 'Você passou' : 'Ainda dá para ter'}
        big={!a.limit ? '25%' : String(Math.abs(a.left))} where={!a.limit ? 'da carga horária' : `${Math.abs(a.left) === 1 ? 'falta' : 'faltas'}${a.left < 0 ? ' do limite' : ''}`} text={a.detail}>
        {a.limit > 0 && (
          <div className="mt-5">
            <div className="flex h-2 items-center gap-1">
              {pct > 0 && <span className="h-2 rounded-full bg-current" style={{ width: `${pct * 100}%` }} />}
              {pct < 1 && <span className="h-2 flex-1 rounded-full bg-current opacity-25" />}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium">
              <Icon name="monitoring" size={18} />Frequência de {a.attendance.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% (mínimo de 75%)
            </p>
          </div>
        )}
      </Answer>
    </div>
  );
}
