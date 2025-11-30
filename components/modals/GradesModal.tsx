import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, AlertTriangle, CheckCircle, XCircle, TrendingUp, BookOpen, Calendar, ArrowRight, Percent, Award } from 'lucide-react';
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

  // Helper to parse grade
  const parseGrade = (val: string | number) => {
    if (typeof val === 'number') return val;
    const v = parseFloat(val);
    return isNaN(v) ? 0 : v;
  };

  // Helper to format display
  const formatDisplay = (val: string | number) => {
    if (val === '-' || val === null || val === undefined) return '-';
    return typeof val === 'number' ? val.toString() : val;
  };

  // Initialize simulation values
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

  // Calculate Average Logic
  const calculateAverage = (g: GradeInfo) => {
    if (!isSimulating) return parseGrade(g.average);

    const n1 = parseFloat(getSimulatedGrade(g, 'n1')) || 0;
    const n2 = parseFloat(getSimulatedGrade(g, 'n2')) || 0;
    const n3 = parseFloat(getSimulatedGrade(g, 'n3')) || 0;
    const n4 = parseFloat(getSimulatedGrade(g, 'n4')) || 0;

    // Standard formula: (2*N1 + 2*N2 + 3*N3 + 3*N4) / 10
    return ((n1 * 2) + (n2 * 2) + (n3 * 3) + (n4 * 3)) / 10;
  };

  // HUD Stats
  const stats = useMemo(() => {
    const averages = grades.map(calculateAverage);
    const validAvgs = averages.filter(a => a > 0);
    const overall = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) : 0;
    const approvals = averages.filter(a => a >= 60).length;
    
    return { overall, approvals, total: grades.length };
  }, [grades, isSimulating, simulatedValues]);

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
      
      {/* TOP CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shrink-0">
         <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isDark ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-600`}`}>
                    <Award size={18} />
                </div>
                <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Boletim</h2>
             </div>
             <p className="text-xs font-medium opacity-60 ml-1">
                {selectedPeriod ? `Semestre ${selectedPeriod.semestre}` : 'Selecione um período'}
             </p>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto hide-scrollbar">
             {/* Period Selector */}
             {periods && periods.length > 0 && (
                <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    {periods.slice(0, 3).map((p) => { // Show max 3 recent periods to save space
                        const isActive = selectedPeriod?.semestre === p.semestre;
                        return (
                            <button
                                key={p.semestre}
                                onClick={() => onSelectPeriod?.(p.semestre)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
                                    ${isActive 
                                        ? `bg-${primaryColor}-500 text-white shadow-sm` 
                                        : 'opacity-60 hover:opacity-100'}
                                `}
                            >
                                {p.semestre}
                            </button>
                        )
                    })}
                </div>
             )}
             
             <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ml-auto md:ml-0
                    ${isSimulating 
                        ? `bg-${primaryColor}-500 text-white shadow-lg shadow-${primaryColor}-500/30` 
                        : (isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                `}
             >
                 <Calculator size={16} />
                 {isSimulating ? 'Simulando' : 'Simular'}
             </button>
         </div>
      </div>

      {/* STATS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className={`col-span-2 md:col-span-1 p-4 rounded-[1.5rem] border relative overflow-hidden flex items-center justify-between ${isDark ? `bg-gradient-to-br from-${primaryColor}-500/20 to-transparent border-${primaryColor}-500/20` : `bg-gradient-to-br from-${primaryColor}-50 to-white border-${primaryColor}-100`}`}>
               <div>
                   <div className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isDark ? `text-${primaryColor}-300` : `text-${primaryColor}-600`}`}>Média Geral</div>
                   <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.overall.toFixed(1)}</div>
               </div>
               <TrendingUp className={`opacity-20 text-${primaryColor}-500`} size={32} />
          </div>
          <div className={`col-span-2 md:col-span-1 p-4 rounded-[1.5rem] border relative overflow-hidden flex items-center justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
               <div>
                   <div className="text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-50">Aprovações</div>
                   <div className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.approvals} <span className="text-sm opacity-50">/ {stats.total}</span></div>
               </div>
               <CheckCircle className="opacity-10" size={32} />
          </div>
          {/* Add more stats here if needed, or leave empty space */}
      </div>

      {/* GRADES GRID - MASONRY/DENSE STYLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto pr-1">
          {grades.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                  <BookOpen size={64} className="mb-4" />
                  <p className="text-base font-bold">Sem dados para este período.</p>
              </div>
          ) : (
            grades.map((grade, index) => {
              const avg = calculateAverage(grade);
              const isPassing = avg >= 60;
              const status = isSimulating 
                ? (avg >= 60 ? 'Aprovado' : avg < 20 ? 'Reprovado' : 'Final')
                : grade.status || (isPassing ? 'Aprovado' : 'Cursando');
              
              let statusColor = primaryColor;
              if (avg < 20) statusColor = secondaryColor;
              else if (avg < 60) statusColor = 'orange';

              const progress = Math.min(avg, 100);

              return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    key={grade.code} 
                    className={`p-5 rounded-[2rem] border relative flex flex-col justify-between group transition-all hover:scale-[1.02] hover:shadow-xl
                        ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm'}
                    `}
                  >
                      {/* Top Row */}
                      <div className="flex justify-between items-start mb-4">
                           <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider
                                ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}
                            `}>
                                {grade.code}
                            </div>
                           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider
                              ${isDark 
                                ? `bg-${statusColor}-500/20 text-${statusColor}-300` 
                                : `bg-${statusColor}-100 text-${statusColor}-700`}
                          `}>
                              {status === 'Aprovado' && <CheckCircle size={10} />}
                              {status === 'Reprovado' && <XCircle size={10} />}
                              {status === 'Final' && <AlertTriangle size={10} />}
                              {status}
                          </div>
                      </div>

                      {/* Subject Name */}
                      <h3 className={`font-bold text-base leading-tight mb-4 line-clamp-2 min-h-[2.5rem] ${isDark ? 'text-white' : 'text-gray-900'}`}>{grade.subject}</h3>

                      {/* Horizontal Grades */}
                      <div className={`flex items-center justify-between p-2 rounded-xl mb-4 ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                          {['n1', 'n2', 'n3', 'n4'].map((key) => (
                              <div key={key} className="flex flex-col items-center flex-1 border-r last:border-0 border-gray-500/10">
                                  <label className="text-[8px] font-bold uppercase opacity-30 mb-0.5">{key.toUpperCase()}</label>
                                  {isSimulating ? (
                                      <input 
                                        type="number"
                                        value={getSimulatedGrade(grade, key as any)}
                                        onChange={(e) => handleSimulateChange(grade.code, key, e.target.value)}
                                        className={`w-8 text-center p-0.5 rounded text-xs font-bold outline-none bg-transparent transition-colors focus:text-${primaryColor}-500 ${isDark ? 'text-white' : 'text-gray-900'}`}
                                      />
                                  ) : (
                                      <div className={`text-xs font-black ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                          {formatDisplay(grade[key as keyof GradeInfo])}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>

                      {/* Footer Average */}
                      <div className="flex items-center gap-3 mt-auto pt-3 border-t border-dashed border-gray-500/20">
                          <div className="flex-1">
                              <div className="flex justify-between items-center text-[9px] font-bold uppercase opacity-50 mb-1">
                                  <span>Progresso</span>
                                  <span>{avg.toFixed(0)}%</span>
                              </div>
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className={`h-full rounded-full ${avg >= 60 ? `bg-${primaryColor}-500` : `bg-${secondaryColor}-500`}`}
                                  />
                              </div>
                          </div>
                          <div className={`text-2xl font-black ${avg >= 60 ? `text-${primaryColor}-500` : `text-${secondaryColor}-500`}`}>
                              {avg.toFixed(0)}
                          </div>
                      </div>

                  </motion.div>
              )
            })
          )}
      </div>
    </div>
  );
};