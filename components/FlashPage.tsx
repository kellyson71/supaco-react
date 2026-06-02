import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, MapPin, BookOpen, Calendar, Zap, ExternalLink, ChevronRight } from 'lucide-react';
import { GradeInfo, ProcessedClass } from '../types';

interface FlashPageProps {
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  isDark: boolean;
  primaryColor: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS_LABEL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_INT    = [2, 3, 4, 5, 6];
const PT_MONTHS  = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const PT_WEEK    = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

const clean = (n: string) => n.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

const room = (r: string) => {
  if (!r || r === 'N/A') return '';
  const m = r.match(/Sala de Aula\s+(\d+)/i);
  if (m) return `Sala ${m[1]}`;
  const first = r.split(' - ')[0];
  return first.length <= 14 ? first : first.slice(0, 14) + '…';
};

const group = (cls: ProcessedClass[]): Array<ProcessedClass & { periods: number }> => {
  const out: Array<ProcessedClass & { periods: number }> = [];
  cls.sort((a,b) => a.startTime.localeCompare(b.startTime)).forEach((c, i) => {
    if (i === 0) { out.push({ ...c, periods: 1 }); return; }
    const p = out[out.length - 1];
    if (p.name === c.name && p.room === c.room) { p.endTime = c.endTime; p.periods++; }
    else out.push({ ...c, periods: 1 });
  });
  return out;
};

type AbsStatus = { type: 'safe'|'caution'|'critical'|'limit'|'over'; remaining: number };

const absStatus = (g?: GradeInfo): AbsStatus | null => {
  if (!g || g.limit === 0) return null;
  const r = g.limit - g.absences;
  if (r < 0)  return { type: 'over',     remaining: r };
  if (r === 0) return { type: 'limit',   remaining: r };
  if (r <= 2)  return { type: 'critical', remaining: r };
  if (r <= 4)  return { type: 'caution',  remaining: r };
  return        { type: 'safe',           remaining: r };
};

// ─── sub-components ──────────────────────────────────────────────────────────

const AbsBadge = ({ st, isDark, accent }: { st: AbsStatus; isDark: boolean; accent: string }) => {
  const cfg = {
    safe:     { icon: <CheckCircle size={14}/>, text: `${st.remaining} restam`, bg: isDark ? `bg-${accent}-500/15 text-${accent}-400 border-${accent}-500/20` : `bg-${accent}-50 text-${accent}-700 border-${accent}-200` },
    caution:  { icon: <AlertTriangle size={14}/>, text: `${st.remaining} restam`, bg: isDark ? 'bg-orange-500/15 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200' },
    critical: { icon: <AlertTriangle size={14}/>, text: `${st.remaining} restam`, bg: isDark ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200' },
    limit:    { icon: <XCircle size={14}/>, text: 'No limite!', bg: isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300' },
    over:     { icon: <XCircle size={14}/>, text: 'Reprovado', bg: isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300' },
  }[st.type];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black ${cfg.bg}`}>
      {cfg.icon}{cfg.text}
    </span>
  );
};

// ─── tabs ────────────────────────────────────────────────────────────────────

type Tab = 'hoje' | 'semana' | 'faltas';

// ─── main component ──────────────────────────────────────────────────────────

export const FlashPage: React.FC<FlashPageProps> = ({ grades, schedule, isDark, primaryColor }) => {
  const now     = new Date();
  const todayDow = now.getDay();            // 0=Sun
  const todayIdx = DAYS_LABEL.findIndex((_, i) => DAY_INT[i] === todayDow);
  const todayLabel = DAYS_LABEL[todayIdx] ?? '';

  const [tab, setTab]         = useState<Tab>('hoje');
  const [weekDay, setWeekDay] = useState<string>(todayLabel || 'Segunda');

  const gradeMap = useMemo(() => {
    const m: Record<string, GradeInfo> = {};
    grades.forEach(g => { m[clean(g.subject).toLowerCase()] = g; });
    return m;
  }, [grades]);

  const findGrade = (name: string) => {
    const key = clean(name).toLowerCase();
    if (gradeMap[key]) return gradeMap[key];
    for (const k in gradeMap) {
      const words = key.split(' ').filter(w => w.length > 3);
      if (words.some(w => k.includes(w))) return gradeMap[k];
    }
  };

  const dayClasses = (label: string) => {
    const di = DAY_INT[DAYS_LABEL.indexOf(label)];
    return schedule.filter(c => c.dayInt === di);
  };

  const todayGrouped = group(dayClasses(weekDay));

  // ── bg / text tokens ────────────────────────────────────────────────────
  const bg    = isDark ? 'bg-[#0a0a0f]'     : 'bg-gray-50';
  const card  = isDark ? 'bg-[#111118] border-white/[0.07]' : 'bg-white border-gray-100';
  const muted = isDark ? 'text-gray-500'    : 'text-gray-400';
  const title = isDark ? 'text-white'       : 'text-gray-900';
  const tab_active  = isDark ? `bg-${primaryColor}-500/15 text-${primaryColor}-300 border-${primaryColor}-500/25` : `bg-${primaryColor}-500 text-white border-${primaryColor}-500`;
  const tab_idle    = isDark ? 'bg-transparent text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20' : 'bg-transparent text-gray-400 border-gray-200 hover:text-gray-700';

  // ─── TAB: HOJE ────────────────────────────────────────────────────────────
  const renderHoje = () => (
    <div className="space-y-3">
      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {DAYS_LABEL.map((d, i) => {
          const cnt  = dayClasses(d).length;
          const isT  = d === todayLabel;
          const isSel = d === weekDay;
          return (
            <button key={d} onClick={() => setWeekDay(d)}
              className={`flex-1 min-w-[56px] py-2.5 px-2 rounded-xl flex flex-col items-center gap-0.5 border transition-all text-[10px] font-black uppercase
                ${isSel ? tab_active : tab_idle}`}
            >
              {d.slice(0,3)}
              <span className={`text-[9px] font-bold ${cnt===0 ? 'opacity-30' : ''}`}>{cnt||'—'}</span>
              {isT && <span className={`w-1 h-1 rounded-full ${isSel ? (isDark ? `bg-${primaryColor}-400` : 'bg-white') : `bg-${primaryColor}-500`}`} />}
            </button>
          );
        })}
      </div>

      {/* Class cards */}
      {todayGrouped.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 gap-2 ${muted} opacity-40`}>
          <Calendar size={32} />
          <span className="text-sm font-bold uppercase">Dia livre</span>
        </div>
      ) : todayGrouped.map((c, i) => {
        const g  = findGrade(c.name);
        const st = absStatus(g);
        const borderL = st?.type === 'over' || st?.type === 'limit' || st?.type === 'critical'
          ? 'border-l-red-500'
          : st?.type === 'caution' ? 'border-l-orange-400'
          : st?.type === 'safe' ? `border-l-${primaryColor}-500`
          : (isDark ? 'border-l-white/10' : 'border-l-gray-200');
        return (
          <div key={i} className={`flex gap-4 p-4 rounded-2xl border border-l-4 ${borderL} ${card} shadow-sm`}>
            {/* time */}
            <div className={`flex flex-col items-center justify-center w-12 shrink-0 border-r border-dashed pr-3 ${isDark?'border-white/10':'border-gray-200'}`}>
              <span className={`text-sm font-black ${title}`}>{c.startTime}</span>
              {c.periods > 1 && <>
                <div className={`w-px h-2 my-0.5 ${isDark?'bg-white/15':'bg-gray-200'}`} />
                <span className={`text-[9px] font-bold ${muted}`}>{c.endTime}</span>
              </>}
            </div>
            {/* info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold leading-tight mb-1.5 ${title}`}>{clean(c.name)}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {room(c.room) && (
                  <span className={`flex items-center gap-1 text-[10px] font-medium ${muted}`}>
                    <MapPin size={9}/> {room(c.room)}
                  </span>
                )}
                {c.periods > 1 && <span className={`text-[10px] font-bold ${muted}`}>{c.periods}× aulas</span>}
                {st && <AbsBadge st={st} isDark={isDark} accent={primaryColor} />}
              </div>
            </div>
          </div>
        );
      })}

      {/* Day summary */}
      {todayGrouped.length > 0 && (() => {
        const statuses = todayGrouped.map(c => absStatus(findGrade(c.name))).filter(Boolean) as AbsStatus[];
        const safe  = statuses.filter(s => s.type === 'safe').length;
        const warn  = statuses.filter(s => s.type === 'caution' || s.type === 'critical').length;
        const bad   = statuses.filter(s => s.type === 'over' || s.type === 'limit').length;
        if (!statuses.length) return null;
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[11px] font-bold ${card}`}>
            <span className={muted}>Resumo:</span>
            {safe > 0  && <span className={isDark?`text-${primaryColor}-400`:`text-${primaryColor}-600`}>{safe} OK</span>}
            {warn > 0  && <span className={isDark?'text-orange-400':'text-orange-600'}>{warn} cuidado</span>}
            {bad > 0   && <span className={isDark?'text-red-400':'text-red-600'}>{bad} limite</span>}
          </div>
        );
      })()}
    </div>
  );

  // ─── TAB: SEMANA ──────────────────────────────────────────────────────────
  const renderSemana = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {DAYS_LABEL.map((d, i) => {
        const cls = group(dayClasses(d));
        const isT = d === todayLabel;
        return (
          <div key={d} className={`rounded-2xl border p-3 flex flex-col gap-2 ${card} ${isT ? `ring-1 ring-${primaryColor}-500/40` : ''}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase ${isT ? (isDark?`text-${primaryColor}-400`:`text-${primaryColor}-600`) : muted}`}>{d}</span>
              {isT && <span className={`w-1.5 h-1.5 rounded-full bg-${primaryColor}-500`} />}
            </div>
            {cls.length === 0 ? (
              <span className={`text-[10px] ${muted} opacity-40`}>Folga</span>
            ) : cls.map((c, j) => {
              const st = absStatus(findGrade(c.name));
              return (
                <div key={j} className={`text-[10px] leading-tight`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full shrink-0 ${
                      st?.type==='over'||st?.type==='limit'||st?.type==='critical' ? 'bg-red-500'
                      : st?.type==='caution' ? 'bg-orange-400'
                      : st?.type==='safe' ? `bg-${primaryColor}-500`
                      : (isDark?'bg-white/20':'bg-gray-300')
                    }`}/>
                    <span className={`font-bold truncate ${title}`}>{clean(c.name).split(' ').slice(0,2).join(' ')}</span>
                  </div>
                  <span className={`${muted} ml-2.5`}>{c.startTime}{c.periods>1?` · ${c.periods}×`:''}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ─── TAB: FALTAS ──────────────────────────────────────────────────────────
  const renderFaltas = () => {
    const sorted = [...grades]
      .filter(g => g.limit > 0)
      .sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));
    return (
      <div className="space-y-2">
        {sorted.map(g => {
          const st = absStatus(g)!;
          const pct = Math.min(g.absences / g.limit, 1);
          const bar = st.type==='over'||st.type==='critical'||st.type==='limit' ? 'bg-red-500'
            : st.type==='caution' ? 'bg-orange-400'
            : `bg-${primaryColor}-500`;
          const textC = st.type==='over'||st.type==='critical'||st.type==='limit'
            ? (isDark?'text-red-400':'text-red-600')
            : st.type==='caution' ? (isDark?'text-orange-400':'text-orange-600')
            : (isDark?'text-gray-400':'text-gray-500');
          return (
            <div key={g.code} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${card}`}>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-bold truncate mb-1.5 ${title}`}>{clean(g.subject)}</div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark?'bg-white/10':'bg-gray-200'}`}>
                  <div className={`h-full rounded-full ${bar}`} style={{width:`${pct*100}%`}}/>
                </div>
              </div>
              <span className={`text-xs font-black shrink-0 ${textC}`}>
                {st.type==='over' ? 'Reprovado'
                  : st.type==='limit' ? 'No limite'
                  : `${st.remaining} restam`}
              </span>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className={`text-center py-16 text-sm font-bold ${muted} opacity-50`}>Nenhum dado de faltas</div>
        )}
      </div>
    );
  };

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen font-sans ${bg} ${isDark?'text-white':'text-gray-900'}`}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className={`flex items-center gap-2 mb-0.5`}>
              <Zap size={16} className={`text-${primaryColor}-500`} />
              <span className={`text-[11px] font-black uppercase tracking-widest ${muted}`}>Flash</span>
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${title}`}>
              {PT_WEEK[todayDow]}, {now.getDate()} de {PT_MONTHS[now.getMonth()]}
            </h1>
          </div>
          <a
            href="/"
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border transition-colors
              ${isDark?'border-white/10 text-gray-500 hover:text-white hover:border-white/20':'border-gray-200 text-gray-400 hover:text-gray-700'}`}
          >
            Supaco <ExternalLink size={11}/>
          </a>
        </div>

        {/* Tab bar */}
        <div className={`flex gap-1.5 p-1 rounded-2xl mb-6 border ${isDark?'bg-white/[0.03] border-white/5':'bg-gray-100 border-gray-200'}`}>
          {(['hoje','semana','faltas'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border
                ${tab===t ? tab_active : tab_idle}`}
            >
              {t==='hoje' ? '⚡ Hoje' : t==='semana' ? '📅 Semana' : '📊 Faltas'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab==='hoje'   && renderHoje()}
        {tab==='semana' && renderSemana()}
        {tab==='faltas' && renderFaltas()}
      </div>
    </div>
  );
};
