import React, { useState, useMemo } from 'react';
import {
  Zap, CheckCircle, AlertTriangle, XCircle,
  Clock, MapPin, Calendar, ArrowUpRight,
  TrendingUp, BookOpen, Activity
} from 'lucide-react';
import { GradeInfo, ProcessedClass } from '../types';

interface FlashPageProps {
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  isDark: boolean;
  primaryColor: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAYS    = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_INT = [2, 3, 4, 5, 6];
const MONTHS  = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const WEEKDAY = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

const clean = (n: string) => n.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

const room = (r: string): string => {
  if (!r || r === 'N/A') return '';
  const m = r.match(/Sala de Aula\s+(\d+)/i);
  if (m) return `Sala ${m[1]}`;
  const first = r.split(' - ')[0];
  return first.length <= 14 ? first : first.slice(0, 13) + '…';
};

const group = (cls: ProcessedClass[]) => {
  const sorted = [...cls].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const out: Array<ProcessedClass & { periods: number }> = [];
  sorted.forEach((c, i) => {
    if (i === 0) { out.push({ ...c, periods: 1 }); return; }
    const p = out[out.length - 1];
    if (p.name === c.name && p.room === c.room) { p.endTime = c.endTime; p.periods++; }
    else out.push({ ...c, periods: 1 });
  });
  return out;
};

type AbsType = 'safe' | 'caution' | 'critical' | 'limit' | 'over';
type AbsStatus = { type: AbsType; remaining: number };

const absStatus = (g?: GradeInfo): AbsStatus | null => {
  if (!g || g.limit === 0) return null;
  const r = g.limit - g.absences;
  if (r < 0)  return { type: 'over',     remaining: r };
  if (r === 0) return { type: 'limit',    remaining: 0 };
  if (r <= 2)  return { type: 'critical', remaining: r };
  if (r <= 4)  return { type: 'caution',  remaining: r };
  return        { type: 'safe',           remaining: r };
};

// ─── FlashPage ────────────────────────────────────────────────────────────────

export const FlashPage: React.FC<FlashPageProps> = ({ grades, schedule, isDark, primaryColor }) => {
  const now      = new Date();
  const dow      = now.getDay();
  const todayIdx = DAYS.findIndex((_, i) => DAY_INT[i] === dow);
  const todayLabel = DAYS[todayIdx] ?? '';
  const [viewDay, setViewDay] = useState(todayLabel || 'Segunda');

  // ── computed ────────────────────────────────────────────────────────────────

  const gradeMap = useMemo(() => {
    const m: Record<string, GradeInfo> = {};
    grades.forEach(g => { m[clean(g.subject).toLowerCase()] = g; });
    return m;
  }, [grades]);

  const findGrade = (name: string) => {
    const key = clean(name).toLowerCase();
    if (gradeMap[key]) return gradeMap[key];
    for (const k in gradeMap) {
      if (key.split(' ').filter(w => w.length > 3).some(w => k.includes(w))) return gradeMap[k];
    }
  };

  const dayClasses = (label: string) => {
    const di = DAY_INT[DAYS.indexOf(label)];
    return schedule.filter(c => c.dayInt === di);
  };

  const todayGrouped = group(dayClasses(viewDay));

  const criticalCount = grades.filter(g => {
    const s = absStatus(g);
    return s && (s.type === 'critical' || s.type === 'over' || s.type === 'limit');
  }).length;

  const totalRemaining = grades.reduce((acc, g) => {
    if (g.limit <= 0) return acc;
    return acc + Math.max(0, g.limit - g.absences);
  }, 0);

  const sortedGrades = [...grades]
    .filter(g => g.limit > 0)
    .sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));

  // ── color tokens ─────────────────────────────────────────────────────────

  const BG    = isDark ? '#07070e' : '#f4f4f8';
  const CARD  = isDark ? '#0f0f1a' : '#ffffff';
  const BORD  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const TEXT  = isDark ? '#f0f0f5' : '#0d0d14';
  const SUB   = isDark ? '#6b6b80' : '#9090a0';
  const RULE  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const STATUS: Record<AbsType, { bg: string; text: string; dot: string; label: (r: number) => string }> = {
    safe:     { bg: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.10)', text: isDark ? '#4ade80' : '#16a34a', dot: '#22c55e', label: r => `${r} restam` },
    caution:  { bg: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.10)', text: isDark ? '#fb923c' : '#c2410c', dot: '#f97316', label: r => `${r} restam` },
    critical: { bg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', text: isDark ? '#f87171' : '#dc2626', dot: '#ef4444', label: r => `${r} restam` },
    limit:    { bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)', text: isDark ? '#f87171' : '#dc2626', dot: '#ef4444', label: () => 'No limite' },
    over:     { bg: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)', text: isDark ? '#fca5a5' : '#b91c1c', dot: '#dc2626', label: () => 'Reprovado' },
  };

  // ── sub-components ────────────────────────────────────────────────────────

  const StatusChip = ({ st }: { st: AbsStatus }) => {
    const cfg = STATUS[st.type];
    const Icon = st.type === 'safe' ? CheckCircle : st.type === 'caution' ? AlertTriangle : XCircle;
    return (
      <span style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.text}22` }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide whitespace-nowrap">
        <Icon size={11} strokeWidth={2.5} />
        {cfg.label(st.remaining)}
      </span>
    );
  };

  const SectionLabel = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <div className="flex items-center gap-2.5 mb-4">
      <div style={{ background: RULE, color: SUB }} className="p-1.5 rounded-lg">
        <Icon size={13} strokeWidth={2} />
      </div>
      <span style={{ color: SUB, letterSpacing: '0.1em' }} className="text-[10px] font-black uppercase">
        {label}
      </span>
      <div style={{ background: RULE }} className="flex-1 h-px" />
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: '100vh' }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { scrollbar-width: none; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.10s; }
        .fade-up-3 { animation-delay: 0.15s; }
        .fade-up-4 { animation-delay: 0.20s; }
        .class-card:hover { transform: translateX(2px); }
        .class-card { transition: transform 0.15s ease; }
      `}</style>

      <div style={{ maxWidth: 680 }} className="mx-auto px-5 pt-10 pb-28">

        {/* ── NAV ── */}
        <nav className="flex items-center justify-between mb-12 fade-up">
          <div className="flex items-center gap-2.5">
            <div style={{ background: `var(--accent, #6366f1)`, borderRadius: 10 }} className="p-2">
              <Zap size={16} strokeWidth={2.5} color="#fff" />
            </div>
            <div>
              <div style={{ color: TEXT, fontFamily: "'DM Mono', monospace" }} className="text-sm font-semibold tracking-tight">
                supaco <span style={{ color: SUB }}>/</span> flash
              </div>
            </div>
          </div>
          <a href="/"
            style={{ color: SUB, border: `1px solid ${BORD}`, textDecoration: 'none', background: CARD }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
            Abrir app <ArrowUpRight size={12} />
          </a>
        </nav>

        {/* ── HERO ── */}
        <section className="mb-10 fade-up fade-up-1">
          <div style={{ color: SUB, fontFamily: "'DM Mono', monospace" }} className="text-xs font-medium uppercase tracking-widest mb-2">
            {WEEKDAY[dow]}
          </div>
          <h1 style={{ fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em' }} className="text-5xl mb-6">
            {now.getDate()} de {MONTHS[now.getMonth()]}
          </h1>

          {/* stat chips */}
          <div className="flex gap-3 flex-wrap">
            {[
              { icon: Calendar, val: todayGrouped.length > 0 ? `${todayGrouped.length}` : '0', label: 'aulas hoje', dim: todayGrouped.length === 0 },
              { icon: TrendingUp, val: `${totalRemaining}`, label: 'faltas restam', dim: false },
              { icon: Activity, val: `${criticalCount}`, label: criticalCount === 1 ? 'crítica' : 'críticas', dim: criticalCount === 0, alert: criticalCount > 0 },
            ].map(({ icon: Icon, val, label, dim, alert }, i) => (
              <div key={i}
                style={{
                  background: alert ? (isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)') : CARD,
                  border: `1px solid ${alert ? (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.20)') : BORD}`,
                  opacity: dim ? 0.4 : 1
                }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl">
                <Icon size={15} color={alert ? (isDark ? '#f87171' : '#dc2626') : SUB} strokeWidth={2} />
                <div>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: alert ? (isDark ? '#f87171' : '#dc2626') : TEXT }}
                    className="text-xl font-semibold">{val}</span>
                  <span style={{ color: SUB }} className="text-xs font-medium ml-1.5">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TODAY'S CLASSES ── */}
        <section className="mb-10 fade-up fade-up-2">
          <SectionLabel icon={Clock} label="Aulas de hoje" />

          {/* Day selector */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto hide-scroll pb-1">
            {DAYS.map((d, i) => {
              const cnt   = dayClasses(d).length;
              const isT   = d === todayLabel;
              const isSel = d === viewDay;
              return (
                <button key={d} onClick={() => setViewDay(d)}
                  style={{
                    background: isSel ? CARD : 'transparent',
                    border: `1px solid ${isSel ? BORD : 'transparent'}`,
                    color: isSel ? TEXT : SUB,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0">
                  <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>
                    {d.slice(0, 3)}
                  </span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    color: cnt === 0 ? SUB : (isSel ? TEXT : SUB),
                    opacity: cnt === 0 ? 0.35 : 1,
                    fontSize: 14, fontWeight: 600
                  }}>
                    {cnt || '—'}
                  </span>
                  {isT && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? (isDark ? '#818cf8' : '#6366f1') : SUB }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Class cards */}
          {todayGrouped.length === 0 ? (
            <div style={{ border: `1px dashed ${BORD}`, color: SUB }} className="flex flex-col items-center justify-center gap-3 py-16 rounded-3xl">
              <Calendar size={28} strokeWidth={1.5} />
              <span className="text-sm font-medium">Dia livre</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayGrouped.map((c, i) => {
                const g  = findGrade(c.name);
                const st = absStatus(g);
                const barColor = st
                  ? STATUS[st.type].dot
                  : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)');
                return (
                  <div key={i} className="class-card"
                    style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 20, overflow: 'hidden' }}>
                    <div className="flex items-stretch">
                      {/* left status bar */}
                      <div style={{ width: 4, background: barColor, flexShrink: 0 }} />

                      <div className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0">
                        {/* time */}
                        <div style={{ fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                          <div style={{ color: TEXT, fontSize: 16, fontWeight: 600 }}>{c.startTime}</div>
                          {c.periods > 1 && (
                            <div style={{ color: SUB, fontSize: 11 }}>{c.endTime}</div>
                          )}
                        </div>

                        {/* divider */}
                        <div style={{ width: 1, alignSelf: 'stretch', background: RULE, flexShrink: 0 }} />

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }} className="truncate mb-1">
                            {clean(c.name)}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {room(c.room) && (
                              <span style={{ color: SUB, fontSize: 11 }} className="flex items-center gap-1">
                                <MapPin size={10} strokeWidth={2} /> {room(c.room)}
                              </span>
                            )}
                            {c.periods > 1 && (
                              <span style={{ color: SUB, fontSize: 11 }}>{c.periods}× seguidas</span>
                            )}
                          </div>
                        </div>

                        {/* status chip */}
                        {st && (
                          <div className="flex-shrink-0">
                            <StatusChip st={st} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── WEEK STRIP ── */}
        <section className="mb-10 fade-up fade-up-3">
          <SectionLabel icon={Calendar} label="Visão da semana" />

          <div className="grid grid-cols-5 gap-2">
            {DAYS.map((d, i) => {
              const cls  = group(dayClasses(d));
              const isT  = d === todayLabel;
              const statuses = cls.map(c => absStatus(findGrade(c.name))).filter(Boolean) as AbsStatus[];
              const hasBad   = statuses.some(s => s.type !== 'safe' && s.type !== null);

              return (
                <div key={d}
                  style={{
                    background: isT ? (isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)') : CARD,
                    border: `1px solid ${isT ? (isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)') : BORD}`,
                    borderRadius: 16
                  }}
                  className="p-3">
                  <div style={{ color: isT ? (isDark ? '#818cf8' : '#6366f1') : SUB, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800 }} className="mb-2">
                    {d.slice(0, 3)}
                  </div>
                  {cls.length === 0 ? (
                    <div style={{ color: SUB, opacity: 0.3 }} className="text-xs font-medium">—</div>
                  ) : (
                    <>
                      <div style={{ fontFamily: "'DM Mono', monospace", color: TEXT, fontSize: 20, fontWeight: 600, lineHeight: 1 }} className="mb-1.5">
                        {cls.length}
                      </div>
                      <div className="flex gap-0.5 flex-wrap">
                        {cls.map((c, j) => {
                          const s = absStatus(findGrade(c.name));
                          return (
                            <div key={j} style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: s ? STATUS[s.type].dot : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')
                            }} />
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── ABSENCE STATUS ── */}
        <section className="fade-up fade-up-4">
          <SectionLabel icon={BookOpen} label="Situação de faltas" />

          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 20, overflow: 'hidden' }}>
            {sortedGrades.length === 0 ? (
              <div style={{ color: SUB }} className="py-12 text-center text-sm">Nenhum dado disponível</div>
            ) : sortedGrades.map((g, i) => {
              const st  = absStatus(g)!;
              const pct = Math.min((g.absences / g.limit) * 100, 100);
              const cfg = STATUS[st.type];

              return (
                <div key={g.code}>
                  {i > 0 && <div style={{ background: RULE }} className="h-px mx-5" />}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* status dot */}
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />

                    {/* subject + bar */}
                    <div className="flex-1 min-w-0">
                      <div style={{ color: TEXT, fontSize: 13, fontWeight: 600 }} className="truncate mb-2">
                        {clean(g.subject)}
                      </div>
                      <div style={{ height: 3, background: RULE, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: cfg.dot, borderRadius: 99 }} />
                      </div>
                    </div>

                    {/* count */}
                    <div style={{ fontFamily: "'DM Mono', monospace", color: cfg.text, fontSize: 12, fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>
                      {st.type === 'over' ? 'Reprovado' : st.type === 'limit' ? 'No limite' : `${st.remaining} restam`}
                      <div style={{ color: SUB, fontSize: 10, fontWeight: 400, marginTop: 1 }}>
                        {g.absences}/{g.limit} faltas
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
