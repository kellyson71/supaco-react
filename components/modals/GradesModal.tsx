
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, 
    BookOpen, ChevronDown, ChevronUp, ShieldAlert, Activity, TrendingDown
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
}

export const GradesModal: React.FC<GradesModalProps> = ({ 
  grades, 
  periods, 
  selectedPeriod, 
  onSelectPeriod, 
  isDark, 
  primaryColor, 
  secondaryColor 
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedValues, setSimulatedValues] = useState<Record<string, { n1: string, n2: string, n3: string, n4: string }>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // --- HELPERS ---
  const parseGrade = (val: string | number) => {
    if (typeof val === 'number') return val;
    const v = parseFloat(val);
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

  const calculateAverage = (g: GradeInfo) => {
    // If explicitly simulating or if the card is expanded (implying interaction), we use live values
    if (!isSimulating && expandedCard !== g.code) return parseGrade(g.average);

    const n1 = parseFloat(getSimulatedGrade(g, 'n1')) || 0;
    const n2 = parseFloat(getSimulatedGrade(g, 'n2')) || 0;
    const n3 = parseFloat(getSimulatedGrade(g, 'n3')) || 0;
    const n4 = parseFloat(getSimulatedGrade(g, 'n4')) || 0;

    return ((n1 * 2) + (n2 * 2) + (n3 * 3) + (n4 * 3)) / 10;
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
    const activeGrades = grades.filter(g => g.limit > 0);
    const criticalRisks = activeGrades.filter(g => (g.limit - g.absences) <= 4 && (g.limit - g.absences) >= 0).length;
    
    // Calculate global average
    const averages = grades.map(calculateAverage);
    const validAvgs = averages.filter(a => a > 0);
    const overall = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) : 0;

    return { totalAbsences, criticalRisks, overall };
  }, [grades, isSimulating, simulatedValues]);

  // Sort grades: Critical absences first
  const sortedGrades = [...grades].sort((a, b) => {
      const remainingA = a.limit > 0 ? a.limit - a.absences : 999;
      const remainingB = b.limit > 0 ? b.limit - b.absences : 999;
      return remainingA - remainingB;
  });

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
      
      {/* HEADER: Period Selector & Title */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shrink-0">
         <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isDark ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-600`}`}>
                    <BookOpen size={18} />
                </div>
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Boletim & Frequência</h2>
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

      {/* HERO STATS (ABSENCE FOCUSED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          {/* Total Absences */}
          <div className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-28 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                     <div className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                        <TrendingDown size={12} /> Total de Faltas
                     </div>
                     <Activity size={16} className="opacity-40" />
                </div>
                <div>
                     <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalAbsences}</div>
                     <div className="text-[10px] opacity-40 mt-1 font-medium">Acumuladas no semestre</div>
                </div>
          </div>

          {/* Risk Card */}
          <div className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-28 ${stats.criticalRisks > 0 ? (isDark ? `bg-${secondaryColor}-500/10 border-${secondaryColor}-500/20` : `bg-${secondaryColor}-50 border-${secondaryColor}-100`) : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100')}`}>
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
                         Disciplinas perto do limite
                     </div>
                </div>
          </div>

          {/* Average Grade */}
          <div className={`hidden md:flex p-5 rounded-[2rem] border relative overflow-hidden flex-col justify-between h-28 ${isDark ? `bg-gradient-to-br from-${primaryColor}-500/10 to-transparent border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
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
      </div>

      {/* UNIFIED LIST */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {sortedGrades.map((grade, index) => {
              const avg = calculateAverage(grade);
              const remaining = grade.limit - grade.absences;
              const percentAbsences = grade.limit > 0 ? Math.min((grade.absences / grade.limit) * 100, 100) : 0;
              const isExpanded = expandedCard === grade.code;

              // Status Logic
              let statusColor = 'green'; // Default safe
              if (remaining < 0) statusColor = secondaryColor; // Failed
              else if (remaining <= 4) statusColor = 'orange'; // Warning
              else statusColor = primaryColor; // Safe

              return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={grade.code}
                    onClick={() => setExpandedCard(isExpanded ? null : grade.code)}
                    className={`rounded-[2rem] border relative overflow-hidden transition-all cursor-pointer group
                        ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
                        ${isExpanded ? (isDark ? 'bg-white/10 ring-1 ring-white/10' : 'ring-1 ring-black/5') : ''}
                    `}
                  >
                      {/* Main Card Content */}
                      <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className={`font-bold text-sm leading-tight max-w-[70%] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {grade.subject}
                              </h3>
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                                  ${avg >= 60 
                                    ? (isDark ? `bg-${primaryColor}-500/20 text-${primaryColor}-300` : `bg-${primaryColor}-100 text-${primaryColor}-700`)
                                    : (isDark ? `bg-${secondaryColor}-500/20 text-${secondaryColor}-300` : `bg-${secondaryColor}-100 text-${secondaryColor}-700`)
                                  }
                              `}>
                                  {avg >= 60 ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                  {avg >= 60 ? 'Aprovado' : 'Atenção'}
                              </div>
                          </div>

                          {/* Absence Bar */}
                          <div className="mb-4">
                              <div className="flex justify-between items-end mb-1.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${remaining <= 4 ? (isDark ? 'text-orange-400' : 'text-orange-600') : 'opacity-50'}`}>
                                      {remaining < 0 ? 'Limite Excedido' : (remaining === 0 ? 'Limite Atingido' : `${remaining} Restantes`)}
                                  </span>
                                  <span className="text-[10px] font-mono opacity-40">{grade.absences} / {grade.limit}</span>
                              </div>
                              <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                                  <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentAbsences}%` }}
                                      className={`h-full rounded-full ${remaining <= 2 ? `bg-${secondaryColor}-500` : (remaining <= 4 ? 'bg-orange-500' : `bg-${primaryColor}-500`)}`}
                                  />
                              </div>
                          </div>

                          {/* Bottom Row: Average & Expand Icon */}
                          <div className="flex justify-between items-end">
                              <div>
                                  <div className="text-[9px] font-black uppercase opacity-40 mb-0.5">Média Parcial</div>
                                  <div className={`text-2xl font-black ${avg >= 60 ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? `text-${secondaryColor}-400` : `text-${secondaryColor}-600`)}`}>
                                      {avg.toFixed(1)}
                                  </div>
                              </div>
                              
                              <button className={`p-2 rounded-full transition-colors ${isExpanded ? `bg-${primaryColor}-500 text-white` : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                          </div>
                      </div>

                      {/* Expandable Grades Section */}
                      <AnimatePresence>
                          {isExpanded && (
                              <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                              >
                                  <div className={`p-4 pt-0 border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50/50'}`}>
                                      <div className="flex items-center gap-2 mb-3 mt-4">
                                          <Calculator size={14} className={`text-${primaryColor}-500`} />
                                          <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Simulador de Notas</span>
                                          <div className="ml-auto">
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); setIsSimulating(!isSimulating); }}
                                                  className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${isSimulating ? `bg-${primaryColor}-500 text-white` : (isDark ? 'bg-white/10' : 'bg-gray-200')}`}
                                              >
                                                  {isSimulating ? 'Ativado' : 'Ativar'}
                                              </button>
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-2">
                                          {['n1', 'n2', 'n3', 'n4'].map((key) => (
                                              <div key={key} className="flex flex-col gap-1">
                                                  <label className="text-[9px] font-bold text-center uppercase opacity-40">{key}</label>
                                                  <input 
                                                      type="text"
                                                      inputMode="decimal"
                                                      onClick={(e) => e.stopPropagation()}
                                                      disabled={!isSimulating}
                                                      value={getSimulatedGrade(grade, key as any)}
                                                      onChange={(e) => handleSimulateChange(grade.code, key, e.target.value)}
                                                      className={`w-full text-center py-2 rounded-xl text-xs font-bold outline-none border transition-colors
                                                          ${isSimulating 
                                                              ? (isDark ? 'bg-black/40 border-white/20 focus:border-white/50 text-white' : 'bg-white border-gray-300 focus:border-gray-500 text-gray-900')
                                                              : 'bg-transparent border-transparent opacity-60 cursor-default'
                                                          }
                                                      `}
                                                      placeholder="-"
                                                  />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </motion.div>
              );
          })}
      </div>
    </div>
  );
};
