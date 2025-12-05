
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, 
    BookOpen, ChevronDown, ChevronUp, ShieldAlert, Activity, TrendingDown, Target, Eraser, Plane, Palmtree
} from 'lucide-react';
import { GradeInfo, SuapPeriod } from '../../types';

interface GradesModalProps {
  grades: GradeInfo[];
  periods?: SuapPeriod[];
  selectedPeriod?: SuapPeriod | null;
  onSelectPeriod?: (semestre: string) => void;
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
  onOpenAbsences?: () => void;
}

export const GradesModal: React.FC<GradesModalProps> = ({ 
  grades, 
  periods, 
  selectedPeriod, 
  onSelectPeriod, 
  isDark, 
  primaryColor, 
  secondaryColor,
  onOpenAbsences
}) => {
  const [isSimulating, setIsSimulating] = useState<Record<string, boolean>>({});
  const [simulatedValues, setSimulatedValues] = useState<Record<string, { n1: string, n2: string, n3: string, n4: string }>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // --- HELPERS ---
  const parseGrade = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val || val === '-') return 0;
    const v = parseFloat(val.replace(',', '.'));
    return isNaN(v) ? 0 : v;
  };

  const formatDisplay = (val: string | number) => {
    if (val === '-' || val === null || val === undefined) return '';
    return typeof val === 'number' ? val.toString() : val;
  };

  const getSimulatedGrade = (grade: GradeInfo, key: 'n1' | 'n2' | 'n3' | 'n4') => {
    if (simulatedValues[grade.code] && simulatedValues[grade.code][key] !== undefined) {
      return simulatedValues[grade.code][key];
    }
    return formatDisplay(grade[key]);
  };

  const handleSimulateChange = (code: string, key: string, value: string) => {
    setSimulatedValues(prev => ({
      ...prev,
      [code]: {
        ...(prev[code] || { 
            n1: formatDisplay(grades.find(g => g.code === code)?.n1 || 0),
            n2: formatDisplay(grades.find(g => g.code === code)?.n2 || 0),
            n3: formatDisplay(grades.find(g => g.code === code)?.n3 || 0),
            n4: formatDisplay(grades.find(g => g.code === code)?.n4 || 0)
        }),
        [key]: value
      }
    }));
  };

  const toggleSimulation = (e: React.MouseEvent, code: string) => {
      e.stopPropagation();
      setIsSimulating(prev => ({ ...prev, [code]: !prev[code] }));
      if (!isSimulating[code]) {
          // Reset simulated values to real values when turning on
          setSimulatedValues(prev => {
              const newState = { ...prev };
              delete newState[code];
              return newState;
          });
      }
  };

  const calculateProjection = (grade: GradeInfo) => {
      const n1 = parseFloat(getSimulatedGrade(grade, 'n1').replace(',', '.') || '0');
      const n2 = parseFloat(getSimulatedGrade(grade, 'n2').replace(',', '.') || '0');
      const n3 = parseFloat(getSimulatedGrade(grade, 'n3').replace(',', '.') || '0');
      const n4 = parseFloat(getSimulatedGrade(grade, 'n4').replace(',', '.') || '0');

      const isN1Set = getSimulatedGrade(grade, 'n1') !== '' && getSimulatedGrade(grade, 'n1') !== '-';
      const isN2Set = getSimulatedGrade(grade, 'n2') !== '' && getSimulatedGrade(grade, 'n2') !== '-';
      const isN3Set = getSimulatedGrade(grade, 'n3') !== '' && getSimulatedGrade(grade, 'n3') !== '-';
      const isN4Set = getSimulatedGrade(grade, 'n4') !== '' && getSimulatedGrade(grade, 'n4') !== '-';

      // Current Weighted Sum
      let currentPoints = 0;
      let usedWeight = 0;

      if (isN1Set) { currentPoints += n1 * 2; usedWeight += 2; }
      if (isN2Set) { currentPoints += n2 * 2; usedWeight += 2; }
      if (isN3Set) { currentPoints += n3 * 3; usedWeight += 3; }
      if (isN4Set) { currentPoints += n4 * 3; usedWeight += 3; }

      const currentAverage = usedWeight > 0 ? currentPoints / 10 : 0; // Displayed as if finished, but actually partial
      
      // Projection for passing (60)
      const targetPoints = 600;
      const missingPoints = targetPoints - currentPoints;
      const remainingWeight = 10 - usedWeight;

      let needed = 0;
      let status = 'passing'; // passing, danger, failed

      if (remainingWeight > 0) {
          needed = missingPoints / remainingWeight;
          if (needed > 100) status = 'failed';
          else if (needed > 0) status = 'danger';
          else status = 'passing'; // Already passed or needs < 0
      } else {
          // All grades entered
          if (currentPoints < 600) status = 'failed';
      }

      return {
          currentAverage: (currentPoints / 10).toFixed(1), // Real weighted average (divided by 10 always for final)
          partialAverage: usedWeight > 0 ? (currentPoints / usedWeight).toFixed(1) : '0.0', // Average of what's done
          needed: needed > 0 ? needed.toFixed(1) : '0',
          remainingWeight,
          status,
          isComplete: remainingWeight === 0
      };
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
    const activeGrades = grades.filter(g => g.limit > 0);
    const criticalRisks = activeGrades.filter(g => (g.limit - g.absences) <= 4 && (g.limit - g.absences) >= 0).length;
    
    const validAvgs = grades
        .map(g => parseGrade(g.average))
        .filter(a => a > 0);
    
    const overall = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) : 0;

    return { totalAbsences, criticalRisks, overall };
  }, [grades]);

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
      
      {/* HEADER: Period Selector & Title */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shrink-0">
         <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isDark ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-600`}`}>
                    <BookOpen size={18} />
                </div>
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Boletim & Notas</h2>
             </div>
             <p className="text-xs font-medium opacity-60 ml-1">
                {selectedPeriod ? `Semestre ${selectedPeriod.semestre}` : 'Selecione um período'}
             </p>
         </div>

         {periods && periods.length > 0 && (
            <div className={`flex p-1 rounded-xl border overflow-x-auto hide-scrollbar max-w-full ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                {periods.slice(0, 4).map((p) => (
                    <button
                        key={p.semestre}
                        onClick={() => onSelectPeriod?.(p.semestre)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
                            ${selectedPeriod?.semestre === p.semestre 
                                ? `bg-${primaryColor}-500 text-white shadow-sm` 
                                : 'opacity-60 hover:opacity-100'}
                        `}
                    >
                        {p.semestre}
                    </button>
                ))}
            </div>
         )}
      </div>

      {/* HERO STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          {/* Average Grade */}
          <div className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${isDark ? `bg-gradient-to-br from-${primaryColor}-500/10 to-transparent border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                <div className="flex justify-between items-start">
                     <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-${primaryColor}-500`}>
                        <TrendingUp size={12} /> Média Geral
                     </div>
                </div>
                <div>
                     <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.overall.toFixed(1)}</div>
                     <div className={`text-[10px] mt-1 font-medium text-${primaryColor}-500`}>Desempenho atual</div>
                </div>
          </div>

          {/* Risk Card */}
          <div className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${stats.criticalRisks > 0 ? (isDark ? `bg-${secondaryColor}-500/10 border-${secondaryColor}-500/20` : `bg-${secondaryColor}-50 border-${secondaryColor}-100`) : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100')}`}>
                <div className="flex justify-between items-start">
                     <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${stats.criticalRisks > 0 ? `text-${secondaryColor}-500` : 'opacity-60'}`}>
                        <ShieldAlert size={12} /> Em Risco
                     </div>
                     {stats.criticalRisks > 0 && <div className={`w-2 h-2 rounded-full bg-${secondaryColor}-500 animate-pulse`} />}
                </div>
                <div>
                     <div className={`text-4xl font-black ${stats.criticalRisks > 0 ? (isDark ? 'text-white' : `text-${secondaryColor}-900`) : (isDark ? 'text-white' : 'text-gray-900')}`}>
                         {stats.criticalRisks}
                     </div>
                     <div className={`text-[10px] mt-1 font-medium ${stats.criticalRisks > 0 ? `text-${secondaryColor}-500` : 'opacity-40'}`}>
                         Matérias no limite
                     </div>
                </div>
          </div>

          {/* Total Absences & VACATION PLANNER LINK */}
          <div className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 group ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                     <div className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                        <TrendingDown size={12} /> Faltas
                     </div>
                     {onOpenAbsences && (
                         <button 
                            onClick={onOpenAbsences} 
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
                            title="Planejar Férias"
                         >
                             <Palmtree size={14} />
                         </button>
                     )}
                </div>
                <div className="flex justify-between items-end">
                     <div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalAbsences}</div>
                        <div className="text-[10px] opacity-40 mt-1 font-medium">Total acumulado</div>
                     </div>
                     
                     {onOpenAbsences && (
                         <button onClick={onOpenAbsences} className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${isDark ? `bg-${primaryColor}-500 text-white` : `bg-${primaryColor}-500 text-white`}`}>
                             Planejar Folga
                         </button>
                     )}
                </div>
          </div>
      </div>

      {/* HORIZONTAL GRID LIST */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {grades.map((grade, index) => {
                const isExpanded = expandedCard === grade.code;
                const simulating = isSimulating[grade.code];
                const projection = calculateProjection(grade);
                
                const remaining = grade.limit - grade.absences;
                const percentAbsences = grade.limit > 0 ? Math.min((grade.absences / grade.limit) * 100, 100) : 0;
                
                // Status Logic
                let statusColor = primaryColor;
                if (remaining < 0) statusColor = secondaryColor;
                else if (remaining <= 4) statusColor = 'orange';

                // Average Color Logic
                const avgVal = parseFloat(projection.currentAverage);
                const avgColor = avgVal >= 60 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600');

                return (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={grade.code}
                        onClick={() => setExpandedCard(isExpanded ? null : grade.code)}
                        className={`rounded-[2.5rem] border relative overflow-hidden transition-all cursor-pointer group flex flex-col
                            ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-lg'}
                            ${isExpanded ? (isDark ? 'ring-1 ring-white/20' : 'ring-1 ring-black/5 shadow-xl') : ''}
                        `}
                    >
                        {/* CARD HEADER */}
                        <div className="p-6 pb-4">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className={`font-bold text-sm leading-tight max-w-[75%] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {grade.subject}
                                </h3>
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border
                                    ${avgVal >= 60 
                                    ? (isDark ? `bg-green-500/10 text-green-400 border-green-500/20` : `bg-green-50 text-green-700 border-green-200`)
                                    : (isDark ? `bg-red-500/10 text-red-400 border-red-500/20` : `bg-red-50 text-red-700 border-red-200`)
                                    }
                                `}>
                                    {avgVal >= 60 ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    {avgVal >= 60 ? 'Aprovado' : 'Atenção'}
                                </div>
                            </div>

                            {/* LIFE BAR (Faltas) */}
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${remaining <= 4 ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'opacity-50'}`}>
                                        {remaining < 0 ? 'Reprovado por Falta' : (remaining === 0 ? 'Limite Atingido' : `${remaining} Aulas Restantes`)}
                                    </span>
                                    <span className="text-[9px] font-mono opacity-40 font-bold">{grade.absences} / {grade.limit}</span>
                                </div>
                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentAbsences}%` }}
                                        className={`h-full rounded-full ${remaining <= 2 ? `bg-${secondaryColor}-500` : (remaining <= 4 ? 'bg-orange-500' : `bg-${primaryColor}-500`)}`}
                                    />
                                </div>
                            </div>

                            {/* GRADES PREVIEW (Mini Grid) */}
                            <div className="grid grid-cols-5 gap-2 items-center">
                                {/* N1-N4 */}
                                {['n1', 'n2', 'n3', 'n4'].map((k) => {
                                    const val = getSimulatedGrade(grade, k as any);
                                    const isFilled = val && val !== '-';
                                    return (
                                        <div key={k} className="flex flex-col items-center gap-1">
                                            <span className="text-[8px] font-bold uppercase opacity-30">{k.toUpperCase()}</span>
                                            <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold border
                                                ${isFilled 
                                                    ? (isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900') 
                                                    : (isDark ? 'bg-transparent border-white/5 text-white/20' : 'bg-transparent border-gray-100 text-gray-300')}
                                            `}>
                                                {val || '-'}
                                            </div>
                                        </div>
                                    )
                                })}
                                {/* Final Avg */}
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[8px] font-bold uppercase opacity-30">MÉDIA</span>
                                    <div className={`text-lg font-black ${avgColor}`}>
                                        {projection.currentAverage}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EXPANDED SIMULATOR */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className={`p-6 pt-0 border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}>
                                        
                                        {/* Simulator Toggle */}
                                        <div className="flex items-center justify-between mt-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                                    <Calculator size={14} className={isDark ? 'text-white' : 'text-black'} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest">Simulador "E Se?"</div>
                                                    <div className="text-[9px] opacity-50 font-medium">Calcule suas chances</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => toggleSimulation(e, grade.code)}
                                                className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all border flex items-center gap-1.5
                                                    ${simulating 
                                                        ? `bg-${primaryColor}-500 text-white border-${primaryColor}-500 shadow-lg shadow-${primaryColor}-500/20` 
                                                        : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900')}
                                                `}
                                            >
                                                {simulating ? <Target size={10} /> : <Eraser size={10} />}
                                                {simulating ? 'Ativo' : 'Simular'}
                                            </button>
                                        </div>

                                        {/* Inputs Grid */}
                                        <div className="grid grid-cols-4 gap-3 mb-4">
                                            {['n1', 'n2', 'n3', 'n4'].map((key, i) => {
                                                const weight = i < 2 ? 2 : 3;
                                                return (
                                                    <div key={key} className="flex flex-col gap-1.5">
                                                        <label className="text-[8px] font-black text-center uppercase opacity-40">
                                                            {key.toUpperCase()} <span className="opacity-50 font-normal">x{weight}</span>
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            inputMode="decimal"
                                                            onClick={(e) => e.stopPropagation()}
                                                            disabled={!simulating}
                                                            value={getSimulatedGrade(grade, key as any)}
                                                            onChange={(e) => handleSimulateChange(grade.code, key, e.target.value)}
                                                            className={`w-full text-center py-3 rounded-xl text-sm font-bold outline-none border transition-all
                                                                ${simulating 
                                                                    ? (isDark ? 'bg-black/40 border-white/20 focus:border-white/50 text-white focus:bg-black/60 shadow-inner' : 'bg-white border-gray-200 focus:border-gray-400 text-gray-900 focus:bg-white shadow-inner')
                                                                    : 'bg-transparent border-transparent opacity-40 cursor-default'
                                                                }
                                                            `}
                                                            placeholder="-"
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Projection Message */}
                                        {simulating && !projection.isComplete && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 5 }} 
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`p-3 rounded-xl border flex items-center gap-3 ${projection.status === 'failed' ? (isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-100 text-red-600') : (isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-100 text-blue-600')}`}
                                            >
                                                <div className="shrink-0"><Target size={16} /></div>
                                                <div className="text-[10px] leading-relaxed">
                                                    {projection.status === 'failed' ? (
                                                        <span className="font-bold">Impossível passar na média. Tente a prova final.</span>
                                                    ) : (
                                                        <span>
                                                            Para passar, você precisa tirar <strong className="text-base mx-0.5">{projection.needed}</strong> nas próximas {projection.remainingWeight === 3 ? '1 nota' : `${projection.remainingWeight/3} notas`}.
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                        {simulating && projection.isComplete && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 text-[10px] font-bold uppercase opacity-50">
                                                Todas as notas preenchidas
                                            </motion.div>
                                        )}

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Expand Handle */}
                        <div className={`h-6 flex items-center justify-center transition-colors ${isExpanded ? 'bg-transparent' : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}>
                            {isExpanded ? <ChevronUp size={14} className="opacity-30" /> : <ChevronDown size={14} className="opacity-30" />}
                        </div>
                    </motion.div>
                );
            })}
          </div>
      </div>
    </div>
  );
};
