import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle, CheckCircle, XCircle, Calculator,
    RotateCcw, Calendar, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { GradeInfo, ProcessedClass, SuapPeriod, Holiday } from '../../types';

interface GradesModalProps {
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  periods: SuapPeriod[];
  selectedPeriod: SuapPeriod | null;
  onSelectPeriod?: (semestre: string) => void;
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
  holidays: Holiday[];
}

const WEIGHTS = [2, 2, 3, 3];
const TARGET = 600; // 60 × 10

const parse = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === '-') return null;
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    return isNaN(n) ? null : n;
};

const cleanName = (name: string) => name.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

const StatusDot = ({ grade, absences, limit }: { grade: number | null; absences: number; limit: number }) => {
    const remaining = limit - absences;
    if (remaining < 0) return <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Reprovado por falta" />;
    if (grade !== null && grade >= 60) return <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
    if (grade !== null && grade < 60) return <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
    if (remaining <= 2) return <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0 animate-pulse" />;
    return <div className="w-2 h-2 rounded-full bg-gray-400/50 shrink-0" />;
};

const NoteChip = ({ val, weight, isDark, accent }: { val: number | null; weight: number; isDark: boolean; accent: string }) => {
    if (val === null) return (
        <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg text-[10px] font-black border border-dashed
            ${isDark ? 'border-white/10 text-white/20' : 'border-gray-200 text-gray-300'}`}>
            —
        </span>
    );
    const ok = val >= 60;
    return (
        <span className={`inline-flex items-center justify-center w-8 h-7 rounded-lg text-[10px] font-black
            ${ok
                ? (isDark ? `bg-${accent}-500/20 text-${accent}-400` : `bg-${accent}-50 text-${accent}-700`)
                : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600')
            }`}
            title={`Peso ${weight}`}
        >
            {val}
        </span>
    );
};

const SubjectRow = ({ grade, isDark, accent, secondaryColor }: any) => {
    const [expanded, setExpanded] = useState(false);
    const [sims, setSims] = useState<(number | null)[]>([null, null, null, null]);

    const stages = useMemo(() => [parse(grade.n1), parse(grade.n2), parse(grade.n3), parse(grade.n4)], [grade]);

    const calc = useMemo(() => {
        const cur = stages.map((g, i) => sims[i] !== null ? sims[i] : g);
        let ws = 0, fw = 0, rw = 0;
        cur.forEach((g, i) => {
            if (g !== null) { ws += g * WEIGHTS[i]; fw += WEIGHTS[i]; }
            else rw += WEIGHTS[i];
        });
        const needed = rw > 0 ? Math.max(0, TARGET - ws) / rw : null;
        const avg = fw > 0 ? ws / fw : 0;
        const full = cur.every(g => g !== null);
        let status = 'Em curso';
        if (full) status = ws >= TARGET ? 'Aprovado' : 'Reprovado';
        else if (ws + rw * 100 < TARGET) status = 'Inalcançável';
        else if (ws >= TARGET) status = 'Garantido';
        return { ws, avg, needed, status, pct: Math.min(ws / TARGET * 100, 100), full };
    }, [stages, sims]);

    const simulating = sims.some(s => s !== null);
    const remaining = grade.limit - grade.absences;
    const isAbsOver = remaining < 0;
    const isAbsCritical = !isAbsOver && remaining <= 2;
    const isAbsCaution = !isAbsOver && !isAbsCritical && remaining <= 4;

    const absColor = isAbsOver ? (isDark ? 'text-red-400' : 'text-red-600')
        : isAbsCritical ? (isDark ? 'text-orange-400' : 'text-orange-600')
        : isAbsCaution ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
        : (isDark ? 'text-gray-400' : 'text-gray-500');

    const avgNum = parse(grade.average);
    const avgColor = avgNum !== null
        ? (avgNum >= 60 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600'))
        : (isDark ? 'text-gray-400' : 'text-gray-500');

    return (
        <div className={`rounded-xl border transition-colors ${isDark ? 'border-white/5 hover:border-white/10' : 'border-gray-100 hover:border-gray-200'}`}>
            {/* Main row */}
            <button
                onClick={() => setExpanded(v => !v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-xl transition-colors
                    ${expanded ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''}`}
            >
                <StatusDot grade={avgNum} absences={grade.absences} limit={grade.limit} />

                {/* Name */}
                <span className={`flex-1 min-w-0 text-xs font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {cleanName(grade.subject)}
                </span>

                {/* Notas */}
                <div className="flex items-center gap-1 shrink-0">
                    {[grade.n1, grade.n2, grade.n3, grade.n4].map((n, i) => (
                        <NoteChip key={i} val={parse(n)} weight={WEIGHTS[i]} isDark={isDark} accent={accent} />
                    ))}
                </div>

                {/* Média */}
                <span className={`w-10 text-right text-sm font-black shrink-0 ${avgColor}`}>
                    {avgNum !== null ? avgNum.toFixed(0) : '—'}
                </span>

                {/* Faltas */}
                <span className={`w-14 text-right text-[11px] font-bold shrink-0 ${absColor}`}>
                    {grade.absences}/{grade.limit}
                </span>

                <div className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} opacity-30`}>
                    <ChevronDown size={14} />
                </div>
            </button>

            {/* Expanded simulation */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                            {/* Progress bar */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                    <div
                                        className={`h-full rounded-full transition-all ${calc.status === 'Garantido' || calc.status === 'Aprovado' ? 'bg-emerald-500' : simulating ? 'bg-amber-400' : `bg-${accent}-500`}`}
                                        style={{ width: `${calc.pct}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-black shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {calc.ws.toFixed(0)}/{TARGET}
                                </span>
                            </div>

                            {/* Grade inputs for simulation */}
                            <div className="flex items-center gap-2 mb-3">
                                {[1, 2, 3, 4].map(i => {
                                    const orig = stages[i - 1];
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className={`text-[9px] font-black uppercase opacity-40`}>N{i} ×{WEIGHTS[i - 1]}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                disabled={orig !== null}
                                                placeholder={orig === null && calc.needed !== null ? Math.ceil(calc.needed).toString() : ''}
                                                value={orig !== null ? orig : (sims[i - 1] !== null ? sims[i - 1]! : '')}
                                                onChange={e => {
                                                    const v = parseFloat(e.target.value);
                                                    setSims(prev => { const n = [...prev]; n[i - 1] = isNaN(v) ? null : Math.min(100, Math.max(0, v)); return n; });
                                                }}
                                                className={`w-full h-9 rounded-lg text-center text-sm font-black outline-none border transition-all
                                                    ${orig !== null
                                                        ? (isDark ? 'bg-white/5 border-white/5 text-white/80' : 'bg-gray-100 border-transparent text-gray-700')
                                                        : sims[i - 1] !== null
                                                            ? `bg-${accent}-500/15 border-${accent}-500/50 text-${accent}-${isDark ? '400' : '700'}`
                                                            : (isDark ? 'bg-white/5 border-dashed border-white/10 text-white/30 placeholder:text-white/30' : 'bg-gray-50 border-dashed border-gray-300 text-gray-300 placeholder:text-gray-300')
                                                    }`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Status + reset */}
                            <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg
                                    ${calc.status === 'Aprovado' || calc.status === 'Garantido' ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                                    : calc.status === 'Reprovado' || calc.status === 'Inalcançável' ? (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600')
                                    : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600')}`}>
                                    {calc.status === 'Aprovado' || calc.status === 'Garantido' ? <CheckCircle size={11} /> : calc.status.includes('Reprovado') || calc.status === 'Inalcançável' ? <XCircle size={11} /> : <Calculator size={11} />}
                                    {calc.status}
                                    {calc.needed !== null && calc.needed > 0 && calc.status === 'Em curso' && (
                                        <span className="opacity-60 normal-case"> · alvo {Math.ceil(calc.needed)}</span>
                                    )}
                                </div>
                                {simulating && (
                                    <button onClick={() => setSims([null, null, null, null])} className={`flex items-center gap-1 text-[10px] font-bold uppercase transition-colors ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                                        <RotateCcw size={10} /> Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const GradesModal: React.FC<GradesModalProps> = ({
    grades, periods, selectedPeriod, onSelectPeriod, isDark, primaryColor, secondaryColor
}) => {
    const validGrades = grades.filter(g => parse(g.average) !== null);
    const avgGeral = validGrades.length > 0
        ? (validGrades.reduce((a, g) => a + (parse(g.average) || 0), 0) / validGrades.length).toFixed(1)
        : '—';
    const totalFaltas = grades.reduce((a, g) => a + g.absences, 0);
    const limiteTotal = grades.reduce((a, g) => a + g.limit, 0);
    const criticas = grades.filter(g => (g.limit - g.absences) <= 2 && g.limit > 0).length;

    const hdr = isDark ? 'text-gray-400' : 'text-gray-400';

    return (
        <div className="flex flex-col gap-4 pb-8">

            {/* Top stats strip */}
            <div className={`flex items-center gap-4 px-3 py-2.5 rounded-xl border ${isDark ? 'bg-white/3 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={`text-${primaryColor}-500`} />
                    <div>
                        <div className={`text-[9px] font-bold uppercase ${hdr}`}>Média</div>
                        <div className={`text-base font-black leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{avgGeral}</div>
                    </div>
                </div>
                <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div>
                    <div className={`text-[9px] font-bold uppercase ${hdr}`}>Faltas</div>
                    <div className={`text-base font-black leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalFaltas} <span className={`text-xs font-bold opacity-40`}>/{limiteTotal}</span></div>
                </div>
                {criticas > 0 && (
                    <>
                        <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle size={12} className="text-orange-400" />
                            <div>
                                <div className={`text-[9px] font-bold uppercase text-orange-400`}>Críticas</div>
                                <div className={`text-base font-black leading-none text-orange-400`}>{criticas}</div>
                            </div>
                        </div>
                    </>
                )}
                <div className="ml-auto">
                    {periods && periods.length > 1 && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black ${isDark ? 'bg-white/5 border-white/5 text-white/60' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <Calendar size={11} />
                            <select
                                value={selectedPeriod?.semestre || ''}
                                onChange={e => onSelectPeriod?.(e.target.value)}
                                className="bg-transparent outline-none cursor-pointer font-black"
                            >
                                {periods.map(p => (
                                    <option key={p.id} value={p.semestre} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>{p.semestre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Column headers */}
            <div className={`flex items-center gap-3 px-3 text-[9px] font-black uppercase tracking-widest ${hdr}`}>
                <div className="w-2 shrink-0" />
                <div className="flex-1">Matéria</div>
                <div className="flex items-center gap-1 shrink-0 w-[136px]">
                    <span className="w-8 text-center">N1</span>
                    <span className="w-8 text-center">N2</span>
                    <span className="w-8 text-center">N3</span>
                    <span className="w-8 text-center">N4</span>
                </div>
                <div className="w-10 text-right shrink-0">Méd.</div>
                <div className="w-14 text-right shrink-0">Faltas</div>
                <div className="w-3 shrink-0" />
            </div>

            {/* Subject rows */}
            <div className="space-y-1">
                {grades.map(g => (
                    <SubjectRow key={g.code} grade={g} isDark={isDark} accent={primaryColor} secondaryColor={secondaryColor} />
                ))}
                {grades.length === 0 && (
                    <div className={`text-center py-16 opacity-30 text-sm font-bold ${isDark ? 'text-white' : 'text-gray-600'}`}>
                        Nenhum dado disponível
                    </div>
                )}
            </div>
        </div>
    );
};
