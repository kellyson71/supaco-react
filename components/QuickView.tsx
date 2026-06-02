import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, MapPin, CalendarDays, Coffee } from 'lucide-react';
import { GradeInfo, ProcessedClass } from '../types';

interface QuickViewProps {
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  isDark: boolean;
  primaryColor: string;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_INT = [2, 3, 4, 5, 6];

const cleanName = (n: string) => n.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

const shortRoom = (room: string): string => {
  if (!room || room === 'N/A') return '';
  const m = room.match(/Sala de Aula\s+(\d+)/i);
  if (m) return `Sala ${m[1]}`;
  const l = room.match(/(Lab\w*\s*\d*)/i);
  if (l) return l[1].trim();
  const first = room.split(' - ')[0];
  return first.length <= 14 ? first : first.slice(0, 14) + '…';
};

const groupBlocks = (classes: ProcessedClass[]): Array<ProcessedClass & { periods: number }> => {
  if (!classes.length) return [];
  const out: Array<ProcessedClass & { periods: number }> = [];
  classes.forEach((c, i) => {
    if (i === 0) { out.push({ ...c, periods: 1 }); return; }
    const prev = out[out.length - 1];
    if (prev.name === c.name && prev.room === c.room) { prev.endTime = c.endTime; prev.periods += 1; }
    else out.push({ ...c, periods: 1 });
  });
  return out;
};

const PT_DAYS: Record<number, string> = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };
const PT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const QuickView: React.FC<QuickViewProps> = ({ grades, schedule, isDark, primaryColor }) => {
  const now = new Date();
  const todayDow = now.getDay();
  const todayDayLabel = DAYS[todayDow - 1] || '';

  const [activeDay, setActiveDay] = useState<string>(todayDayLabel || 'Segunda');

  const gradeMap = useMemo(() => {
    const m: Record<string, GradeInfo> = {};
    grades.forEach(g => { m[cleanName(g.subject).toLowerCase()] = g; });
    return m;
  }, [grades]);

  const findGrade = (name: string): GradeInfo | undefined => {
    const key = cleanName(name).toLowerCase();
    if (gradeMap[key]) return gradeMap[key];
    for (const k in gradeMap) {
      const words = key.split(' ').filter(w => w.length > 3);
      if (words.some(w => k.includes(w))) return gradeMap[k];
    }
    return undefined;
  };

  const getAbsenceStatus = (grade: GradeInfo | undefined) => {
    if (!grade || grade.limit === 0) return null;
    const remaining = grade.limit - grade.absences;
    if (remaining < 0) return { type: 'over' as const, remaining, label: 'Reprovado por falta', sublabel: `${Math.abs(remaining)} excedidas` };
    if (remaining === 0) return { type: 'limit' as const, remaining, label: 'No limite!', sublabel: '0 restantes' };
    if (remaining <= 2) return { type: 'critical' as const, remaining, label: 'Não pode faltar', sublabel: `${remaining} restante${remaining > 1 ? 's' : ''}` };
    if (remaining <= 4) return { type: 'caution' as const, remaining, label: 'Cuidado', sublabel: `${remaining} restantes` };
    return { type: 'safe' as const, remaining, label: 'Pode faltar', sublabel: `${remaining} restantes` };
  };

  const activeDayInt = DAY_INT[DAYS.indexOf(activeDay)] ?? todayDow;
  const dayClasses = schedule
    .filter(c => c.dayInt === activeDayInt)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const grouped = groupBlocks(dayClasses);

  const isToday = activeDay === todayDayLabel;

  const row = isDark ? 'bg-white/[0.03] border-white/8' : 'bg-white border-gray-100';
  const sub = isDark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className="flex flex-col gap-5 pb-8 max-w-2xl mx-auto">

      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${sub}`}>
            {isToday ? 'Hoje' : activeDay}
          </div>
          <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isToday
              ? `${PT_DAYS[todayDow]}, ${now.getDate()} de ${PT_MONTHS[now.getMonth()]}`
              : activeDay}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
          ${grouped.length > 0
            ? (isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600')
            : (isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-50 text-gray-400')
          }`}>
          <CalendarDays size={13} />
          {grouped.length > 0 ? `${grouped.length} aula${grouped.length > 1 ? 's' : ''}` : 'Folga'}
        </div>
      </div>

      {/* Day strip */}
      <div className="flex gap-1.5">
        {DAYS.map((day, idx) => {
          const di = DAY_INT[idx];
          const cnt = schedule.filter(c => c.dayInt === di).length;
          const isActiveDayToday = day === todayDayLabel;
          const isSelected = day === activeDay;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-1 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all border
                ${isSelected
                  ? (isDark ? `bg-${primaryColor}-500/15 border-${primaryColor}-500/30 text-${primaryColor}-400` : `bg-${primaryColor}-50 border-${primaryColor}-200 text-${primaryColor}-700`)
                  : (isDark ? 'bg-white/[0.03] border-white/5 text-gray-500 hover:bg-white/6' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100')
                }`}
            >
              <span className="text-[9px] font-black uppercase">{day.slice(0, 3)}</span>
              <span className={`text-[9px] font-bold ${cnt === 0 ? 'opacity-30' : ''}`}>{cnt > 0 ? cnt : '—'}</span>
              {isActiveDayToday && <span className={`w-1 h-1 rounded-full bg-${primaryColor}-500`} />}
            </button>
          );
        })}
      </div>

      {/* Classes */}
      {grouped.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 gap-3 opacity-25 ${isDark ? 'text-white' : 'text-gray-600'}`}>
          <Coffee size={36} />
          <span className="text-sm font-bold uppercase tracking-widest">Dia livre</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {grouped.map((c, i) => {
            const grade = findGrade(c.name);
            const abs = getAbsenceStatus(grade);
            const bgStatus = abs?.type === 'over' || abs?.type === 'limit' ? (isDark ? 'border-l-red-500' : 'border-l-red-500')
              : abs?.type === 'critical' ? (isDark ? 'border-l-red-400' : 'border-l-red-400')
              : abs?.type === 'caution' ? (isDark ? 'border-l-orange-400' : 'border-l-orange-400')
              : abs?.type === 'safe' ? (isDark ? `border-l-${primaryColor}-500` : `border-l-${primaryColor}-500`)
              : (isDark ? 'border-l-white/20' : 'border-l-gray-300');

            return (
              <div key={i} className={`flex items-stretch gap-3 p-4 rounded-2xl border border-l-4 ${bgStatus} ${row} shadow-sm`}>

                {/* Time */}
                <div className={`flex flex-col items-center justify-center w-12 shrink-0 border-r border-dashed pr-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.startTime}</span>
                  {c.periods > 1 && (
                    <>
                      <div className={`w-px h-2 my-0.5 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                      <span className={`text-[9px] font-bold opacity-40`}>{c.endTime}</span>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <div className={`text-sm font-bold leading-tight ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    {cleanName(c.name)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {shortRoom(c.room) && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${sub}`}>
                        <MapPin size={9} /> {shortRoom(c.room)}
                      </span>
                    )}
                    {c.periods > 1 && (
                      <span className={`text-[10px] font-bold ${sub}`}>{c.periods}× aulas</span>
                    )}
                  </div>
                </div>

                {/* Absence badge */}
                {abs && (
                  <div className={`flex flex-col items-center justify-center shrink-0 px-3 rounded-xl min-w-[72px] text-center
                    ${abs.type === 'safe' ? (isDark ? `bg-${primaryColor}-500/10 text-${primaryColor}-400` : `bg-${primaryColor}-50 text-${primaryColor}-700`)
                    : abs.type === 'caution' ? (isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600')
                    : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                    }`}>
                    <div className="mb-0.5">
                      {abs.type === 'safe' ? <CheckCircle size={15} />
                        : abs.type === 'caution' ? <AlertTriangle size={15} />
                        : <XCircle size={15} />}
                    </div>
                    <div className="text-[9px] font-black uppercase leading-none">{abs.label}</div>
                    <div className="text-[9px] font-bold opacity-70 mt-0.5 leading-none">{abs.sublabel}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Absence summary for the day */}
      {grouped.length > 0 && (() => {
        const withGrade = grouped.map(c => ({ c, abs: getAbsenceStatus(findGrade(c.name)) })).filter(x => x.abs);
        const safe = withGrade.filter(x => x.abs!.type === 'safe').length;
        const warn = withGrade.filter(x => x.abs!.type === 'caution' || x.abs!.type === 'critical').length;
        const bad = withGrade.filter(x => x.abs!.type === 'over' || x.abs!.type === 'limit').length;
        if (!withGrade.length) return null;
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[11px] font-bold ${isDark ? 'bg-white/3 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
            <span className={sub}>Resumo do dia:</span>
            {safe > 0 && <span className={isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}>{safe} OK</span>}
            {warn > 0 && <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>{warn} cuidado</span>}
            {bad > 0 && <span className={isDark ? 'text-red-400' : 'text-red-600'}>{bad} limite</span>}
          </div>
        );
      })()}
    </div>
  );
};
