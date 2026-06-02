import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPin, Coffee, AlertTriangle } from 'lucide-react';
import { ProcessedClass, GradeInfo } from '../../types';

interface ScheduleModalProps {
  schedule: ProcessedClass[];
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
  grades?: GradeInfo[];
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_INT = [2, 3, 4, 5, 6]; // dayInt mapping

const COLORS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'cyan', 'fuchsia', 'lime', 'indigo', 'orange', 'teal', 'sky', 'pink'];

const subjectColor = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
};

const shortRoom = (room: string): string => {
    if (!room || room === 'N/A') return room;
    const m = room.match(/Sala de Aula\s+(\d+)/i);
    if (m) return `Sala ${m[1]}`;
    const l = room.match(/(Lab(?:orat[oó]rio)?\s*\d*)/i);
    if (l) return l[1].trim() || room.split(' - ')[0];
    const first = room.split(' - ')[0];
    return first.length <= 12 ? first : first.slice(0, 12) + '…';
};

const cleanName = (name: string) => name.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

const groupBlocks = (classes: ProcessedClass[]): Array<ProcessedClass & { periods: number }> => {
    if (!classes.length) return [];
    const out: Array<ProcessedClass & { periods: number }> = [];
    classes.forEach((c, i) => {
        if (i === 0) { out.push({ ...c, periods: 1 }); return; }
        const prev = out[out.length - 1];
        if (prev.name === c.name && prev.room === c.room) {
            prev.endTime = c.endTime;
            prev.periods += 1;
        } else {
            out.push({ ...c, periods: 1 });
        }
    });
    return out;
};

const AbsencePill = ({ grade, isDark }: { grade?: GradeInfo; isDark: boolean }) => {
    if (!grade || grade.limit === 0) return null;
    const remaining = grade.limit - grade.absences;
    const isOver = remaining < 0;
    const isCritical = !isOver && remaining <= 2;
    const isCaution = !isOver && !isCritical && remaining <= 4;
    const color = isOver || isCritical ? 'text-red-400 bg-red-500/10' : isCaution ? 'text-orange-400 bg-orange-500/10' : (isDark ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-100');
    return (
        <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
            {(isOver || isCritical) && <AlertTriangle size={8} />}
            {grade.absences}/{grade.limit}f
        </span>
    );
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, isDark, accentColor, secondaryColor, grades = [] }) => {
    const today = new Date().getDay(); // 0=Sun, 1=Mon...
    const todayLabel = DAYS[today - 1] || 'Segunda';

    const [activeDay, setActiveDay] = useState<string>(todayLabel);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const h = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    const gradeMap = useMemo(() => {
        const m: Record<string, GradeInfo> = {};
        grades.forEach(g => { m[cleanName(g.subject).toLowerCase()] = g; });
        return m;
    }, [grades]);

    const findGrade = (name: string): GradeInfo | undefined => {
        const key = cleanName(name).toLowerCase();
        // exact match
        if (gradeMap[key]) return gradeMap[key];
        // partial match
        for (const k in gradeMap) {
            if (k.includes(key.split(' ')[0]) || key.includes(k.split(' ')[0])) return gradeMap[k];
        }
        return undefined;
    };

    const dayStats = (dayLabel: string) => {
        const cls = schedule.filter(c => c.day.includes(dayLabel));
        const unique = [...new Set(cls.map(c => c.name))];
        return { count: cls.length, subjects: unique.length };
    };

    const renderDayClasses = (dayLabel: string) => {
        const cls = schedule
            .filter(c => c.day.includes(dayLabel))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const grouped = groupBlocks(cls);

        if (grouped.length === 0) return (
            <div className={`flex flex-col items-center justify-center py-12 opacity-25 ${isDark ? 'text-white' : 'text-gray-600'}`}>
                <Coffee size={32} className="mb-2" />
                <span className="text-xs font-bold uppercase">Dia livre</span>
            </div>
        );

        return (
            <div className="space-y-2">
                {grouped.map((c, i) => {
                    const color = subjectColor(c.name);
                    const grade = findGrade(c.name);
                    const remaining = grade ? grade.limit - grade.absences : null;
                    const isAbsCritical = remaining !== null && remaining <= 2;

                    return (
                        <div key={i} className={`flex gap-3 items-start p-3 rounded-xl border transition-colors
                            ${isDark ? 'bg-white/3 border-white/5 hover:bg-white/6' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>

                            {/* Time column */}
                            <div className={`flex flex-col items-center w-12 shrink-0 border-r border-dashed pt-0.5 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <span className={`text-[11px] font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.startTime}</span>
                                <div className={`w-px flex-1 my-1 min-h-[6px] ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                <span className={`text-[9px] font-bold opacity-40`}>{c.endTime}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className={`w-1 h-full min-h-[28px] rounded-full shrink-0 bg-${color}-500 mt-0.5`} />
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[11px] font-bold leading-tight mb-1 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                            {cleanName(c.name)}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`flex items-center gap-0.5 text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <MapPin size={8} /> {shortRoom(c.room)}
                                            </span>
                                            {c.periods > 1 && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-${color}-500/10 text-${color}-${isDark ? '400' : '600'}`}>
                                                    {c.periods}× aulas
                                                </span>
                                            )}
                                            <AbsencePill grade={grade} isDark={isDark} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4 pb-8">

            {/* Stats strip */}
            <div className={`flex items-center gap-1 overflow-x-auto hide-scrollbar`}>
                {DAYS.map((day, idx) => {
                    const { count, subjects } = dayStats(day);
                    const dayInt = DAY_INT[idx];
                    const isToday = dayInt === today;
                    const isActive = day === activeDay;
                    return (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-left transition-all border
                                ${isActive
                                    ? (isDark ? `bg-${accentColor}-500/15 border-${accentColor}-500/30` : `bg-${accentColor}-50 border-${accentColor}-200`)
                                    : (isDark ? 'bg-white/3 border-white/5 hover:bg-white/6' : 'bg-gray-50 border-gray-100 hover:bg-gray-100')
                                }`}
                        >
                            <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-[10px] font-black uppercase tracking-wide
                                    ${isActive ? (isDark ? `text-${accentColor}-400` : `text-${accentColor}-700`) : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                                    {day.slice(0, 3)}
                                </span>
                                {isToday && <span className={`w-1.5 h-1.5 rounded-full bg-${accentColor}-500`} />}
                            </div>
                            <div className={`text-[9px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {count > 0 ? `${count} aula${count > 1 ? 's' : ''}` : 'folga'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Day content */}
            <div>
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeDay}</span>
                    {(() => {
                        const { count } = dayStats(activeDay);
                        if (count === 0) return null;
                        // Count total absences for the day's subjects
                        const dayCls = schedule.filter(c => c.day.includes(activeDay));
                        const daySubjects = [...new Set(dayCls.map(c => c.name))];
                        const dayAbsences = daySubjects.reduce((acc, name) => {
                            const g = findGrade(name);
                            return acc + (g?.absences || 0);
                        }, 0);
                        return (
                            <div className={`flex items-center gap-3 text-[10px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span className="flex items-center gap-1"><Clock size={10} /> {count} aulas</span>
                                {dayAbsences > 0 && <span className="flex items-center gap-1"><AlertTriangle size={10} /> {dayAbsences} faltas acum.</span>}
                            </div>
                        );
                    })()}
                </div>

                {renderDayClasses(activeDay)}
            </div>
        </div>
    );
};
