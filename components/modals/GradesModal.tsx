
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, 
    BookOpen, ChevronDown, ChevronUp, ShieldAlert, Activity, TrendingDown, Target, Eraser,
    Palmtree, Calendar, Info, X, Plane, AlertOctagon, ThumbsUp, HelpCircle, CalendarDays, Lock, Unlock, Luggage, Clock,
    Gauge, Edit3
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

// --- LOGIC HELPERS ---

const normalizeText = (text: string) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "") // Remove special chars
        .trim();
};

const getNextMonday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7));
    if (d.getDay() !== 1) d.setDate(d.getDate() + 1); // Ensure it's Monday
    d.setHours(0,0,0,0);
    return d;
};

// Calculate exact vacation cost by simulating the calendar
const calculatePreciseCost = (
    grade: GradeInfo,
    startDate: Date,
    weeks: number,
    schedule: ProcessedClass[],
    holidays: Holiday[]
) => {
    // 1. Identify which days this subject has classes
    const normSubject = normalizeText(grade.subject);
    
    // Improved Matching Logic:
    // 1. Exact/Substring Match
    // 2. Token Intersection (if "Lingua Portuguesa" vs "Portugues")
    const subjectClasses = schedule.filter(s => {
        const normSched = normalizeText(s.name);
        
        // Direct match
        if (normSched.includes(normSubject) || normSubject.includes(normSched)) return true;
        
        // Token match (Significant words only)
        const gradeTokens = normSubject.split(' ').filter(w => w.length > 3 && w !== "ensino" && w !== "medio");
        const schedTokens = normSched.split(' ').filter(w => w.length > 3 && w !== "ensino" && w !== "medio");
        
        // If 50% or more of the grade tokens appear in the schedule name, assume match
        const matches = gradeTokens.filter(gt => schedTokens.some(st => st.includes(gt) || gt.includes(st)));
        return matches.length > 0 && (matches.length / gradeTokens.length) >= 0.5;
    });

    const classesPerDay: Record<number, number> = {};
    
    // Count how many "periods" (tempos) happen on each day of the week
    // schedule items are often individual periods (e.g. 07:00, 07:45). 
    // We count entries per dayInt.
    subjectClasses.forEach(c => {
        classesPerDay[c.dayInt] = (classesPerDay[c.dayInt] || 0) + 1;
    });

    // 2. Simulate dates
    let cost = 0;
    let savedByHoliday = 0;
    
    const totalDays = weeks * 7;
    // We iterate exactly from the chosen start date
    
    for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const jsDay = currentDate.getDay(); // 0 = Sunday
        if (jsDay === 0) continue; // Skip Sunday (usually no classes)
        
        // Convert JS Day (0-6) to SUAP Day Int (2=Segunda ... 7=Sabado, 1=Domingo?) 
        // Based on app usage: Sunday=1, Monday=2, ... Saturday=7
        const suapDayInt = jsDay + 1; 
        
        const dailyLoad = classesPerDay[suapDayInt] || 0;

        if (dailyLoad > 0) {
            // Check formatted date string against holiday list
            // Fix timezone offset for string comparison
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const isHoliday = holidays.some(h => h.date === dateStr);

            if (isHoliday) {
                savedByHoliday += dailyLoad;
            } else {
                cost += dailyLoad;
            }
        }
    }

    // Fallback estimation if schedule is empty but grade has total hours
    // This happens if the user has grades but the 'Horário' endpoint returned empty or mismatched names
    if (subjectClasses.length === 0 && grade.totalHours > 0) {
        // Estimate: (Total Hours / 20 weeks) * Vacation Weeks
        // This is a rough heuristic
        const weeklyAvg = Math.ceil(grade.totalHours / 20);
        cost = weeklyAvg * weeks;
    }

    return { cost, savedByHoliday };
};

const RiskGauge: React.FC<{ riskPercentage: number, isDark: boolean, theme: any }> = ({ riskPercentage, isDark, theme }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(riskPercentage, 100) / 100) * circumference;
    
    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Background Glow */}
            <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${theme.bg} transition-colors duration-500`} />
            
            <svg className="w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 200 200">
                {/* Track */}
                <circle
                    cx="100" cy="100" r={radius}
                    stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                    strokeWidth="12" fill="transparent" strokeLinecap="round"
                />
                {/* Progress */}
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    cx="100" cy="100" r={radius}
                    stroke="currentColor" 
                    strokeWidth="12" fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    className={`${theme.text} transition-colors duration-500`}
                />
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-3 rounded-2xl mb-1 ${isDark ? 'bg-white/10' : 'bg-gray-100'} ${theme.text}`}
                >
                    <theme.icon size={24} />
                </motion.div>
                <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {riskPercentage > 100 ? '>100%' : `${riskPercentage.toFixed(0)}%`}
                </div>
                <div className="text-[10px] font-bold uppercase opacity-50 tracking-widest">
                    Risco Máx
                </div>
            </div>
        </div>
    )
}

const SubjectImpactCard: React.FC<{ 
    grade: GradeInfo; 
    cost: number; 
    savedByHoliday: number;
    isDark: boolean; 
}> = ({ grade, cost, savedByHoliday, isDark }) => {
    const remainingBefore = grade.limit - grade.absences;
    const remainingAfter = remainingBefore - cost;
    
    const isFailed = remainingAfter < 0;
    const isCritical = remainingAfter >= 0 && remainingAfter <= 2;

    const limit = grade.limit || 1;
    // Calculate percentages for the stacked bar
    const usedPct = Math.min((grade.absences / limit) * 100, 100);
    const costPct = Math.min((cost / limit) * 100, 100 - usedPct); 
    const totalPct = usedPct + costPct;
    
    const statusColor = isFailed ? 'red' : (isCritical ? 'orange' : 'emerald');

    return (
        <div className={`group relative p-5 rounded-2xl border transition-all h-full flex flex-col justify-between
            ${isDark 
                ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
        `}>
            <div>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                        <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{grade.subject}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] opacity-50 font-medium">Usadas: {grade.absences}/{grade.limit}</span>
                        </div>
                    </div>
                    <div className={`flex flex-col items-end`}>
                        <span className={`text-lg font-black leading-none ${isFailed ? 'text-red-500' : (isCritical ? 'text-orange-500' : 'text-emerald-500')}`}>
                            {remainingAfter < 0 ? remainingAfter : remainingAfter}
                        </span>
                        <span className="text-[9px] font-bold uppercase opacity-40">Restantes</span>
                    </div>
                </div>

                {/* Progress Visual */}
                <div className={`h-3 w-full rounded-full flex overflow-hidden mb-3 relative ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                    {/* Tick marks for limit */}
                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-red-500/50 z-10" />
                    
                    {/* Current Absences */}
                    <div 
                        className={`h-full ${isDark ? 'bg-white/30' : 'bg-gray-400'}`} 
                        style={{ width: `${usedPct}%` }} 
                    />
                    
                    {/* Projected Cost */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((cost / limit) * 100, 100)}%` }} // Allow visual overflow if needed, but container clips it
                        className={`h-full relative ${isFailed ? 'bg-red-500' : (isCritical ? 'bg-orange-500' : 'bg-emerald-500')}`} 
                    >
                        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.5) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.5) 50%,rgba(255,255,255,.5) 75%,transparent 75%,transparent)', backgroundSize: '4px 4px' }} />
                    </motion.div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-500/10">
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <Luggage size={12} className={isDark ? 'text-white' : 'text-gray-600'} />
                    </div>
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>+{cost} faltas</span>
                </div>
                {savedByHoliday > 0 && (
                    <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded">
                        <Palmtree size={10} /> Salvo (-{savedByHoliday})
                    </span>
                )}
            </div>
        </div>
    )
}

const GlobalVacationPlanner: React.FC<{
    grades: GradeInfo[];
    schedule: ProcessedClass[];
    holidays: Holiday[];
    onClose: () => void;
    isDark: boolean;
    primaryColor: string;
}> = ({ grades, schedule, holidays, onClose, isDark, primaryColor }) => {
    const [weeks, setWeeks] = useState(1);
    const [startDate, setStartDate] = useState<Date>(getNextMonday());

    // Calculate End Date based on Start Date + Weeks
    // Subtract 3 days to land on Friday (assuming start on Monday) or adjust as logic dictates
    // Logic: Start Date + (Weeks * 7 days) - (Days until Friday if needed, or just represent the span)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeks * 7) - 1); 

    // Logic
    const projection = useMemo(() => {
        const activeGrades = grades.filter(g => g.limit > 0);
        
        const impacts = activeGrades.map(g => {
            const { cost, savedByHoliday } = calculatePreciseCost(g, startDate, weeks, schedule, holidays);
            const remaining = g.limit - g.absences - cost;
            // Calculate usage percentage after vacation
            const usagePct = ((g.absences + cost) / g.limit) * 100;
            
            return {
                ...g,
                cost,
                savedByHoliday,
                remaining,
                usagePct,
                status: remaining < 0 ? 'failed' : (remaining <= 2 ? 'critical' : 'safe')
            };
        });

        const failedList = impacts.filter(i => i.status === 'failed');
        const criticalList = impacts.filter(i => i.status === 'critical');
        
        // Calculate Max Risk for the Gauge (e.g. 110% if overflowing)
        const maxRisk = impacts.length > 0 ? Math.max(...impacts.map(i => i.usagePct)) : 0;

        let verdict: 'safe' | 'risky' | 'impossible' = 'safe';
        if (failedList.length > 0) verdict = 'impossible';
        else if (criticalList.length > 0) verdict = 'risky';

        // Sort: Failed > Critical > Safe
        const sortedImpacts = [...impacts].sort((a, b) => {
            const score = (status: string) => status === 'failed' ? 0 : (status === 'critical' ? 1 : 2);
            return score(a.status) - score(b.status) || b.usagePct - a.usagePct;
        });

        return { impacts: sortedImpacts, failedList, criticalList, verdict, maxRisk };
    }, [weeks, startDate, grades, schedule, holidays]);

    const theme = {
        safe: { bg: 'bg-emerald-500', text: 'text-emerald-500', label: 'Autorizado', icon: Plane },
        risky: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Atenção', icon: AlertTriangle },
        impossible: { bg: 'bg-red-500', text: 'text-red-500', label: 'Reprovação', icon: AlertOctagon },
    }[projection.verdict];

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            // Append T12:00:00 to ensure we don't get timezone shifts to previous day
            setStartDate(new Date(e.target.value + 'T12:00:00'));
        }
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                onClick={onClose}
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`relative w-full max-w-5xl h-[85vh] flex flex-col md:flex-row rounded-[2.5rem] overflow-hidden shadow-2xl ${isDark ? 'bg-[#0F1115] text-white' : 'bg-white text-gray-900'}`}
            >
                {/* CLOSE BUTTON (Mobile fixed top right, Desktop inside Left Panel) */}
                <button 
                    onClick={onClose} 
                    className={`absolute top-4 right-4 z-50 p-2 rounded-full transition-colors md:hidden ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                >
                    <X size={20} />
                </button>

                {/* LEFT PANEL: DASHBOARD & CONTROLS */}
                <div className={`w-full md:w-[320px] lg:w-[360px] p-8 flex flex-col relative shrink-0 border-b md:border-b-0 md:border-r ${isDark ? 'border-white/5 bg-[#13161C]' : 'border-gray-100 bg-gray-50'}`}>
                    {/* Desktop Close */}
                    <button 
                        onClick={onClose} 
                        className={`hidden md:flex absolute top-6 left-6 p-2 rounded-full transition-colors hover:bg-opacity-80 ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    >
                        <ChevronDown size={20} className="rotate-90" /> <span className="text-xs font-bold ml-1">Voltar</span>
                    </button>

                    <div className="flex-1 flex flex-col items-center justify-center py-6 mt-8 md:mt-0">
                        {/* THE CIRCULAR GAUGE */}
                        <RiskGauge riskPercentage={projection.maxRisk} isDark={isDark} theme={theme} />
                        
                        <div className="text-center mt-6">
                            <h2 className={`text-2xl font-black ${theme.text} mb-1`}>{theme.label}</h2>
                            <p className="text-xs font-medium opacity-60 max-w-[200px] mx-auto leading-relaxed">
                                {projection.verdict === 'impossible' 
                                    ? `Você reprovará em ${projection.failedList.length} disciplina(s) com este período.` 
                                    : (projection.verdict === 'risky' 
                                        ? `${projection.criticalList.length} disciplina(s) ficarão no limite crítico de faltas.` 
                                        : "Nenhuma disciplina será prejudicada. Aproveite!")}
                            </p>
                        </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="mt-auto space-y-4">
                        
                        {/* Start Date Input */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 block pl-1">Data de Início</label>
                            <div className={`flex items-center gap-2 p-3 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <Calendar size={16} className={`opacity-50 ${isDark ? 'text-white' : 'text-gray-600'}`} />
                                <input 
                                    type="date"
                                    value={startDate.toISOString().split('T')[0]}
                                    onChange={handleDateChange}
                                    className={`bg-transparent outline-none w-full text-xs font-bold uppercase ${isDark ? 'text-white color-scheme-dark' : 'text-gray-900 color-scheme-light'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2 px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Duração</label>
                                <div className="text-[10px] font-bold opacity-60">Até {endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                            </div>
                            
                            <div className={`relative p-1.5 rounded-2xl grid grid-cols-4 gap-1 ${isDark ? 'bg-black/20' : 'bg-white border border-gray-200 shadow-sm'}`}>
                                {[1, 2, 3, 4].map((w) => (
                                    <button
                                        key={w}
                                        onClick={() => setWeeks(w)}
                                        className={`relative py-3 rounded-xl text-xs font-bold transition-all ${weeks === w ? 'text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                    >
                                        {weeks === w && (
                                            <motion.div 
                                                layoutId="activeWeek"
                                                className={`absolute inset-0 rounded-xl ${theme.bg} shadow-lg shadow-${theme.bg.split('-')[1]}-500/30`}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <span className="relative z-10">{w} Sem</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: DETAILS GRID */}
                <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
                    <div className={`px-8 py-6 border-b shrink-0 flex items-center justify-between ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                <Activity size={18} className={isDark ? 'text-white' : 'text-gray-700'} />
                            </div>
                            <div>
                                <h3 className={`text-sm font-black uppercase tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>Impacto por Matéria</h3>
                                <p className="text-[10px] font-medium opacity-50">Projeção baseada na sua grade horária atual.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projection.impacts.map((g) => (
                                <SubjectImpactCard 
                                    key={g.code} 
                                    grade={g} 
                                    cost={g.cost} 
                                    savedByHoliday={g.savedByHoliday} 
                                    isDark={isDark} 
                                />
                            ))}
                            
                            {projection.impacts.length === 0 && (
                                <div className="col-span-full py-20 text-center opacity-40">
                                    <BookOpen size={48} className="mx-auto mb-4" />
                                    <p className="text-sm font-bold">Nenhuma disciplina cursando.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
};

export const GradesModal: React.FC<GradesModalProps> = ({ 
    grades, schedule, periods, selectedPeriod, onSelectPeriod, isDark, primaryColor, secondaryColor, holidays
}) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showVacationPlanner, setShowVacationPlanner] = useState(false);

  const activeGrades = grades;
  
  // Calculate average
  const validGrades = activeGrades.filter(g => typeof g.average === 'number' || (typeof g.average === 'string' && g.average !== '-' && !isNaN(parseFloat(g.average))));
  const averageGrade = validGrades.length > 0 
    ? (validGrades.reduce((acc, g) => acc + (typeof g.average === 'number' ? g.average : parseFloat(g.average as string)), 0) / validGrades.length).toFixed(1)
    : '-';

  const totalAbsences = activeGrades.reduce((acc, g) => acc + g.absences, 0);

  return (
    <div className="h-full flex flex-col pb-24 relative">
        <AnimatePresence>
            {showVacationPlanner && (
                <GlobalVacationPlanner 
                    grades={grades} 
                    schedule={schedule} 
                    holidays={holidays} 
                    onClose={() => setShowVacationPlanner(false)} 
                    isDark={isDark} 
                    primaryColor={primaryColor} 
                />
            )}
        </AnimatePresence>

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Boletim Escolar</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <Activity size={12} /> CR: {averageGrade}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <TrendingDown size={12} /> Faltas: {totalAbsences}
                    </span>
                </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={() => setShowVacationPlanner(true)}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5
                        ${isDark 
                            ? `bg-gradient-to-r from-${primaryColor}-600 to-${primaryColor}-500 text-white shadow-${primaryColor}-500/20` 
                            : `bg-white border border-gray-200 text-gray-700 hover:border-${primaryColor}-300 hover:text-${primaryColor}-600`
                        }
                    `}
                >
                    <Luggage size={14} /> <span className="hidden sm:inline">Planejar Férias</span>
                    <span className="sm:hidden">Férias</span>
                </button>

                <div className={`relative flex-1 md:w-40 h-10 rounded-xl border flex items-center px-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                    <Calendar size={14} className={`mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <select 
                        value={selectedPeriod?.semestre || ''} 
                        onChange={(e) => onSelectPeriod?.(e.target.value)}
                        className={`w-full bg-transparent outline-none text-xs font-bold uppercase cursor-pointer ${isDark ? 'text-white' : 'text-gray-800'}`}
                    >
                        {periods.map(p => (
                            <option key={p.id} value={p.semestre} className={isDark ? 'bg-slate-900' : 'bg-white'}>{p.semestre}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Grades List */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-3">
            {activeGrades.map((grade, idx) => {
                const isExpanded = expandedSubject === grade.code;
                const statusColor = grade.status?.toLowerCase().includes('aprovado') ? 'green' : (grade.status?.toLowerCase().includes('reprovado') ? 'red' : 'blue');
                
                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={grade.code}
                        onClick={() => setExpandedSubject(isExpanded ? null : grade.code)}
                        className={`rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden group
                            ${isExpanded 
                                ? (isDark ? 'bg-white/5 border-white/10 shadow-xl' : 'bg-white border-gray-200 shadow-xl scale-[1.01]') 
                                : (isDark ? 'bg-transparent border-white/5 hover:bg-white/5' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm')
                            }
                        `}
                    >
                        {/* Compact Row */}
                        <div className="p-5 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{grade.subject}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{grade.code}</span>
                                    {grade.status && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? `bg-${statusColor}-500/20 text-${statusColor}-300` : `bg-${statusColor}-100 text-${statusColor}-600`}`}>
                                            {statusColor === 'green' && <CheckCircle size={10} />}
                                            {statusColor === 'red' && <XCircle size={10} />}
                                            {grade.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-bold uppercase opacity-40">Faltas</div>
                                    <div className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{grade.absences} <span className="text-[10px] opacity-40 font-normal">/ {grade.limit}</span></div>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border transition-colors
                                    ${isExpanded 
                                        ? (isDark ? `bg-${primaryColor}-500 text-white border-${primaryColor}-400` : `bg-${primaryColor}-500 text-white border-${primaryColor}-600`)
                                        : (isDark ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-50 border-${primaryColor}-100 text-${primaryColor}-600`)
                                    }
                                `}>
                                    {grade.average}
                                </div>
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={18} className="opacity-30" />
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className={`border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}
                                >
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            {[
                                                { label: 'Nota 1', val: grade.n1 },
                                                { label: 'Nota 2', val: grade.n2 },
                                                { label: 'Nota 3', val: grade.n3 },
                                                { label: 'Nota 4', val: grade.n4 },
                                            ].map((n, i) => (
                                                <div key={i} className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                                    <div className="text-[9px] font-bold uppercase opacity-40 mb-1">{n.label}</div>
                                                    <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{n.val}</div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4 pt-4 border-t border-dashed border-gray-500/10">
                                            {(grade.finalGrade !== '-' && grade.finalGrade !== undefined) && (
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}><Target size={14} /></div>
                                                    <div>
                                                        <div className="text-[9px] font-bold uppercase opacity-50">Prova Final</div>
                                                        <div className="text-xs font-bold">{grade.finalGrade}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {grade.totalHours > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}><Clock size={14} /></div>
                                                    <div>
                                                        <div className="text-[9px] font-bold uppercase opacity-50">Carga Horária</div>
                                                        <div className="text-xs font-bold">{grade.totalHours}h</div>
                                                    </div>
                                                </div>
                                            )}
                                            {grade.frequency > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}><Activity size={14} /></div>
                                                    <div>
                                                        <div className="text-[9px] font-bold uppercase opacity-50">Frequência</div>
                                                        <div className="text-xs font-bold">{grade.frequency}%</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )
            })}
            
            {activeGrades.length === 0 && (
                <div className="text-center py-20 opacity-40">
                    <BookOpen size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">Nenhuma disciplina encontrada neste período.</p>
                </div>
            )}
        </div>
    </div>
  );
};
