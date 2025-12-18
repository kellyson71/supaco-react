
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, 
    BookOpen, ChevronDown, ChevronUp, Activity, Target,
    Luggage, Calendar, Sparkles, PlayCircle, Info, Edit3, ArrowRight,
    RotateCcw, Check
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

// --- GRADE SIMULATION LOGIC ---
const TARGET_PASS_SCORE = 60;
const WEIGHTS = [2, 2, 3, 3]; // Bim 1&2 (2), Bim 3&4 (3)
const TOTAL_WEIGHT = 10;
const TARGET_TOTAL_POINTS = TARGET_PASS_SCORE * TOTAL_WEIGHT; // 600 weighted points

const parseGrade = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined || val === '-') return null;
    const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
    return isNaN(n) ? null : n;
};

// --- COMPONENTS ---

const GradeCircle = ({ stage, original, simulated, needed, isDark, accentColor, onSimulate }: any) => {
    const isEditing = simulated !== null;
    const displayValue = isEditing ? simulated : (original !== null ? original : null);
    const showNeeded = displayValue === null && needed !== null;
    const weight = WEIGHTS[stage - 1];

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center leading-tight">
                <span className="text-[9px] font-black uppercase opacity-40 tracking-wider">Bim {stage}</span>
                <span className="text-[7px] font-bold uppercase opacity-30">Peso {weight}</span>
            </div>
            <div className="relative group">
                <input
                    type="number"
                    min="0"
                    max="100"
                    // Fix: Use placeholder to show needed value clearly without double rendering
                    placeholder={showNeeded ? Math.ceil(needed).toString() : ""}
                    value={isEditing ? simulated : (original !== null ? original : "")}
                    disabled={original !== null}
                    onChange={(e) => onSimulate(parseFloat(e.target.value) || 0)}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-center font-black text-lg transition-all border-2 outline-none
                        ${original !== null 
                            ? (isDark ? 'bg-white/10 border-transparent text-white' : 'bg-gray-100 border-transparent text-gray-900')
                            : (isEditing
                                ? `bg-${accentColor}-500/20 border-${accentColor}-500 text-${accentColor}-500`
                                : (isDark ? 'bg-transparent border-dashed border-white/10 text-white/30' : 'bg-transparent border-dashed border-gray-200 text-gray-400')
                              )
                        }
                        ${original === null && !isEditing ? 'hover:border-white/30 focus:border-white/50 placeholder:text-current placeholder:opacity-30' : ''}
                    `}
                />
            </div>
        </div>
    );
};

const SubjectGradeCard = ({ grade, isDark, accentColor, secondaryColor }: any) => {
    const [simulatedGrades, setSimulatedGrades] = useState<(number | null)[]>([null, null, null, null]);
    const [isExpanded, setIsExpanded] = useState(false);

    const stages = useMemo(() => [
        parseGrade(grade.n1),
        parseGrade(grade.n2),
        parseGrade(grade.n3),
        parseGrade(grade.n4),
    ], [grade]);

    const calculation = useMemo(() => {
        const currentGrades = stages.map((g, i) => simulatedGrades[i] !== null ? simulatedGrades[i] : g);
        
        let weightedSum = 0;
        let filledWeight = 0;
        let remainingWeight = 0;

        currentGrades.forEach((g, i) => {
            if (g !== null) {
                weightedSum += g * WEIGHTS[i];
                filledWeight += WEIGHTS[i];
            } else {
                remainingWeight += WEIGHTS[i];
            }
        });

        const neededTotal = Math.max(0, TARGET_TOTAL_POINTS - weightedSum);
        const neededAverageForRemaining = remainingWeight > 0 ? neededTotal / remainingWeight : null;
        
        const projectedAverage = filledWeight > 0 ? weightedSum / filledWeight : 0;
        
        const isFullyFilled = currentGrades.every(g => g !== null);
        const currentTotalPossible = weightedSum + (remainingWeight * 100);
        
        let status = 'Em curso';
        if (isFullyFilled) {
            status = weightedSum >= TARGET_TOTAL_POINTS ? 'Aprovado' : 'Reprovado';
        } else if (currentTotalPossible < TARGET_TOTAL_POINTS) {
            status = 'Reprovado (Inalcansável)';
        } else if (weightedSum >= TARGET_TOTAL_POINTS) {
            status = 'Aprovado (Garantido)';
        }

        return { 
            weightedSum, 
            remainingWeight, 
            neededAverageForRemaining, 
            projectedAverage, 
            status, 
            currentGrades,
            progressPercent: Math.min((weightedSum / TARGET_TOTAL_POINTS) * 100, 100)
        };
    }, [stages, simulatedGrades]);

    const isSimulating = simulatedGrades.some(g => g !== null);

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSimulatedGrades([null, null, null, null]);
    };

    return (
        <motion.div 
            layout
            className={`rounded-[2.5rem] border transition-all duration-500 overflow-hidden group
                ${isExpanded 
                    ? (isDark ? 'bg-white/5 border-white/10 shadow-2xl scale-[1.01]' : 'bg-white border-gray-200 shadow-2xl scale-[1.01]') 
                    : (isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-gray-100 shadow-sm hover:shadow-md')
                }
            `}
        >
            {/* Main Row */}
            <div 
                className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                         <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
                            {grade.code}
                         </div>
                         {isSimulating && (
                             <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg animate-pulse">
                                 <PlayCircle size={10} /> Simulando
                             </div>
                         )}
                    </div>
                    <h3 className={`text-xl md:text-2xl font-black truncate tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {grade.subject}
                    </h3>
                    
                    <div className="mt-4 flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] font-bold uppercase opacity-40">Pontos Ponderados</span>
                                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {calculation.weightedSum.toFixed(0)} <span className="opacity-30 font-bold">/ {TARGET_TOTAL_POINTS}</span>
                                </span>
                            </div>
                            <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${calculation.progressPercent}%` }}
                                    className={`h-full rounded-full ${calculation.status.includes('Aprovado') ? 'bg-green-500' : (isSimulating ? 'bg-amber-500' : `bg-${accentColor}-500`)}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                        <div className="text-[10px] font-bold uppercase opacity-40 mb-1">Média {isSimulating ? 'Proj.' : 'Atual'}</div>
                        <div className={`text-4xl font-black tracking-tighter ${calculation.projectedAverage >= 60 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-white' : 'text-gray-900')}`}>
                            {calculation.projectedAverage.toFixed(1)}
                        </div>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-white/10' : 'opacity-20 group-hover:opacity-100'}`}>
                        <ChevronDown size={24} className={isDark ? 'text-white' : 'text-gray-900'} />
                    </div>
                </div>
            </div>

            {/* Expanded Roadmap */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-50 bg-gray-50/30'}`}
                    >
                        <div className="p-8">
                            <div className="flex flex-col lg:flex-row gap-10">
                                
                                {/* Left: Grade Slots */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                                            <Calculator size={14} /> Roadmap de Notas (Pesos 2, 2, 3, 3)
                                        </h4>
                                        {isSimulating && (
                                            <button 
                                                onClick={handleReset}
                                                className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                                            >
                                                <RotateCcw size={12} /> Limpar Simulação
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 md:gap-8">
                                        {[1, 2, 3, 4].map(num => (
                                            <GradeCircle 
                                                key={num}
                                                stage={num}
                                                accentColor={accentColor}
                                                isDark={isDark}
                                                original={stages[num-1]}
                                                simulated={simulatedGrades[num-1]}
                                                needed={calculation.neededAverageForRemaining}
                                                onSimulate={(val: number) => {
                                                    const newSim = [...simulatedGrades];
                                                    newSim[num-1] = val;
                                                    setSimulatedGrades(newSim);
                                                }}
                                            />
                                        ))}
                                    </div>
                                    
                                    <div className={`mt-8 p-4 rounded-2xl border flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                        <div className={`p-2 rounded-xl ${calculation.status.includes('Reprovado') ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {calculation.status.includes('Aprovado') ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-bold uppercase opacity-50">Veredito {isSimulating ? 'Simulado' : 'Atual'}</div>
                                            <div className="text-sm font-black uppercase tracking-wide">
                                                {calculation.status}
                                                {calculation.neededAverageForRemaining !== null && calculation.neededAverageForRemaining > 0 && calculation.status === 'Em curso' && (
                                                     <span className="opacity-60 normal-case ml-2">• Alvo: {Math.ceil(calculation.neededAverageForRemaining)}/bim</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             <div className="text-[10px] font-bold opacity-30 uppercase">Faltas</div>
                                             <div className={`text-sm font-black ${grade.absences >= grade.limit ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                                                 {grade.absences} / {grade.limit}
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Simulation Info */}
                                <div className="lg:w-64 space-y-4">
                                     <div className={`p-6 rounded-[2rem] border h-full flex flex-col justify-between ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                                         <div>
                                            <Sparkles size={24} className={`mb-4 text-${accentColor}-500`} />
                                            <h5 className="text-sm font-black uppercase leading-tight mb-2">Resumo da Simulação</h5>
                                            <p className="text-xs opacity-60 leading-relaxed font-medium">
                                                {calculation.remainingWeight === 0 
                                                    ? "Todas as notas preenchidas. O peso total de 10 foi aplicado."
                                                    : `Faltam ${calculation.remainingWeight} de 10 unidades de peso para completar o semestre.`}
                                            </p>
                                         </div>
                                         <div className="pt-6 border-t border-dashed border-gray-500/20 mt-6">
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[9px] font-black uppercase opacity-40">Média Alvo</span>
                                                  <span className="text-[9px] font-black uppercase opacity-40">Status</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                  <span className="text-xl font-black">60.0</span>
                                                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                                                      <Check size={12} /> OK
                                                  </div>
                                              </div>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const GradesModal: React.FC<GradesModalProps> = ({ 
    grades, periods, selectedPeriod, onSelectPeriod, isDark, primaryColor, secondaryColor
}) => {
  // Stats
  const activeGrades = grades;
  const validGrades = activeGrades.filter(g => parseGrade(g.average) !== null);
  const averageGrade = validGrades.length > 0 
    ? (validGrades.reduce((acc, g) => acc + (parseGrade(g.average) || 0), 0) / validGrades.length).toFixed(1)
    : '-';
  const totalAbsences = activeGrades.reduce((acc, g) => acc + g.absences, 0);

  return (
    <div className="h-full flex flex-col pb-24 relative overflow-hidden">
        
        {/* Background Ambient Effect */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-20 bg-${primaryColor}-500`} />

        {/* Dynamic Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12 shrink-0 relative z-10">
            <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 border ${isDark ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20 text-${primaryColor}-300` : `bg-${primaryColor}-50 border-${primaryColor}-100 text-${primaryColor}-600`}`}>
                    <Activity size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Painel de Desempenho</span>
                </div>
                {/* Fix: Title size reduced and "Inteligente" removed */}
                <h2 className={`text-3xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Boletim
                </h2>
                
                <div className="flex items-center gap-6 mt-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase opacity-40 mb-1">Média Geral</span>
                        <div className="flex items-end gap-1.5">
                            <span className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{averageGrade}</span>
                            <TrendingUp size={18} className={`mb-1.5 text-${primaryColor}-500`} />
                        </div>
                    </div>
                    <div className={`w-[1px] h-10 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase opacity-40 mb-1">Faltas Totais</span>
                        <span className={`text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalAbsences}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto">
                 <div className={`p-1 rounded-2xl border flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="pl-3 py-2">
                        <Calendar size={16} className="opacity-40" />
                    </div>
                    <select 
                        value={selectedPeriod?.semestre || ''} 
                        onChange={(e) => onSelectPeriod?.(e.target.value)}
                        className={`bg-transparent outline-none pr-8 py-2 text-sm font-black uppercase cursor-pointer appearance-none ${isDark ? 'text-white' : 'text-gray-800'}`}
                    >
                        {periods.map(p => (
                            <option key={p.id} value={p.semestre} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>{p.semestre}</option>
                        ))}
                    </select>
                </div>
                <p className="text-[10px] font-bold text-right opacity-30 uppercase tracking-widest">Selecione o semestre</p>
            </div>
        </div>

        {/* Grades List Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-4 relative z-10 pb-12">
            {activeGrades.map((grade) => (
                <SubjectGradeCard 
                    key={grade.code} 
                    grade={grade} 
                    isDark={isDark} 
                    accentColor={primaryColor} 
                    secondaryColor={secondaryColor} 
                />
            ))}
            
            {activeGrades.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center">
                    <BookOpen size={64} className="mb-6" />
                    <p className="text-xl font-black uppercase tracking-widest">Nenhum dado disponível</p>
                    <p className="text-sm font-medium max-w-xs mt-2">Sincronize sua conta para visualizar as notas deste período.</p>
                </div>
            )}
        </div>

        {/* Interactive Floating Info Bar */}
        {/* Fix: Color adjustments for light/dark themes */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-xl flex items-center gap-4 min-w-[300px] justify-center transition-colors
            ${isDark ? 'bg-black/80 border-white/20' : 'bg-white/90 border-gray-200'}
        `}>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${isDark ? 'text-white' : 'text-gray-900'}`}>Dica: Toque nos bimesters vazios para simular</span>
             </div>
             <div className={`w-[1px] h-4 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
             <Target size={14} className={`text-${primaryColor}-500`} />
        </div>

    </div>
  );
};
