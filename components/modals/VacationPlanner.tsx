
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palmtree, Plane, Calendar, AlertTriangle, CheckCircle, Shield, AlertOctagon, Info, TrendingUp, ArrowRight } from 'lucide-react';
import { GradeInfo } from '../../types';

interface VacationPlannerProps {
  grades: GradeInfo[];
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export const VacationPlanner: React.FC<VacationPlannerProps> = ({ grades, isDark, primaryColor, secondaryColor }) => {
  const [weeksToSkip, setWeeksToSkip] = useState(1);

  // Constants
  const SEMESTER_WEEKS = 20; // Standard approximation

  // --- CALCULATIONS ---
  const analysis = useMemo(() => {
      const subjects = grades.filter(g => g.limit > 0).map(g => {
          // Estimate classes per week based on total load
          // Ensure at least 1 class per week to avoid division by zero
          const classesPerWeek = Math.max(1, Math.round(g.totalHours / SEMESTER_WEEKS));
          
          const remainingAbsences = g.limit - g.absences;
          
          // Max consecutive weeks possible for this specific subject
          const maxWeeksPossible = Math.max(0, Math.floor(remainingAbsences / classesPerWeek));

          // Cost of the selected simulation
          const vacationCost = classesPerWeek * weeksToSkip;
          const projectedTotal = g.absences + vacationCost;
          const projectedRemaining = g.limit - projectedTotal;
          
          let status = 'safe';
          if (projectedRemaining < 0) status = 'impossible';
          else if (projectedRemaining <= 2) status = 'risky';

          return {
              ...g,
              classesPerWeek,
              maxWeeksPossible,
              vacationCost,
              projectedTotal,
              projectedRemaining,
              status
          };
      });

      // The global maximum is determined by the "weakest link" subject
      // We ignore subjects that are already failed (limit < absences) for the max calc, 
      // unless all are failed.
      const validSubjects = subjects.filter(s => s.absences <= s.limit);
      const bottleneck = validSubjects.sort((a, b) => a.maxWeeksPossible - b.maxWeeksPossible)[0];
      const maxConsecutiveWeeks = bottleneck ? bottleneck.maxWeeksPossible : 0;

      return { subjects, maxConsecutiveWeeks, bottleneck };
  }, [grades, weeksToSkip]);

  return (
    <div className="space-y-6 h-full flex flex-col">
        
        {/* HERO: MAX VACATION CARD */}
        <div className={`relative overflow-hidden rounded-[2.5rem] p-8 border shadow-lg shrink-0 ${isDark ? `bg-gradient-to-br from-${primaryColor}-900/40 to-black border-white/10` : `bg-gradient-to-br from-${primaryColor}-100 to-white border-${primaryColor}-200`}`}>
            <div className={`absolute top-0 right-0 p-6 opacity-10 text-${primaryColor}-500`}>
                <Palmtree size={140} />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                    <Plane size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Capacidade de Férias</span>
                </div>
                
                <div className="flex items-baseline gap-2">
                    <span className={`text-6xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {analysis.maxConsecutiveWeeks}
                    </span>
                    <span className={`text-xl font-bold uppercase opacity-60 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {analysis.maxConsecutiveWeeks === 1 ? 'Semana' : 'Semanas'}
                    </span>
                </div>
                
                <p className="text-sm font-medium opacity-60 mt-2 max-w-xs leading-relaxed">
                    Você pode sumir por até {analysis.maxConsecutiveWeeks} semanas seguidas sem reprovar por falta em nenhuma matéria.
                </p>

                {analysis.bottleneck && (
                    <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${isDark ? 'bg-black/30 border-white/10 text-white/70' : 'bg-white/50 border-black/5 text-gray-600'}`}>
                        <AlertOctagon size={12} /> Limitado por: {analysis.bottleneck.subject}
                    </div>
                )}
            </div>
        </div>

        {/* SIMULATOR CONTROLS */}
        <div className={`p-6 rounded-[2rem] border shrink-0 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-600`}`}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Simulador</h3>
                        <p className="text-[10px] opacity-60">Planeje sua folga</p>
                    </div>
                </div>
                <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {weeksToSkip} <span className="text-sm opacity-40">sem</span>
                </div>
            </div>

            <input 
                type="range" 
                min="1" 
                max="8" 
                step="1"
                value={weeksToSkip} 
                onChange={(e) => setWeeksToSkip(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-white/10 accent-blue-500"
                style={{ accentColor: `var(--color-${primaryColor}-500)` }}
            />
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase opacity-30">
                <span>1 Semana</span>
                <span>8 Semanas</span>
            </div>
        </div>

        {/* IMPACT GRID */}
        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 px-2 opacity-50 mb-3 shrink-0">
                <Info size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Impacto por Disciplina</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-4 custom-scroll">
                {analysis.subjects.map((sub, idx) => {
                    const percentUsed = Math.min((sub.absences / sub.limit) * 100, 100);
                    const percentProjected = Math.min((sub.projectedTotal / sub.limit) * 100, 100);
                    const percentAdded = percentProjected - percentUsed;

                    return (
                        <motion.div 
                            key={sub.code}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`p-5 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between min-h-[180px]
                                ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
                            `}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <h4 className={`text-base font-black leading-tight line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{sub.subject}</h4>
                                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide
                                    ${sub.status === 'impossible' 
                                        ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600') 
                                        : (sub.status === 'risky' 
                                            ? (isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600') 
                                            : (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'))}
                                `}>
                                    {sub.status === 'impossible' ? <AlertTriangle size={12} /> : (sub.status === 'risky' ? <Shield size={12} /> : <CheckCircle size={12} />)}
                                    {sub.status === 'impossible' ? 'Reprova' : (sub.status === 'risky' ? 'Crítico' : 'Seguro')}
                                </div>
                            </div>

                            {/* Stats Middle */}
                            <div className="flex items-end justify-between mb-4 px-1">
                                <div>
                                    <div className="text-[10px] font-bold uppercase opacity-40 mb-0.5">Custo da Folga</div>
                                    <div className={`text-2xl font-black flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        +{sub.vacationCost} <span className="text-sm opacity-50 font-bold">faltas</span>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="opacity-20 mb-2" />
                                <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase opacity-40 mb-0.5">Saldo Final</div>
                                    <div className={`text-2xl font-black flex items-center justify-end gap-1 ${sub.projectedRemaining < 0 ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                                        {Math.max(0, sub.projectedRemaining)} <span className="text-sm opacity-50 font-bold">restam</span>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Bar Footer */}
                            <div className="mt-auto">
                                <div className={`flex justify-between text-[9px] font-bold uppercase opacity-40 mb-1.5`}>
                                    <span>{sub.absences} atuais</span>
                                    <span>Limite: {sub.limit}</span>
                                </div>
                                <div className={`h-4 w-full rounded-full overflow-hidden flex ${isDark ? 'bg-black/30' : 'bg-gray-200'}`}>
                                    {/* Current Absences */}
                                    <div 
                                        style={{ width: `${percentUsed}%` }}
                                        className={`h-full ${isDark ? 'bg-white/20' : 'bg-gray-400'}`}
                                        title="Faltas Atuais"
                                    />
                                    {/* Vacation Cost */}
                                    <div 
                                        style={{ width: `${Math.max(0, percentAdded)}%` }}
                                        className={`h-full ${sub.status === 'impossible' ? 'bg-red-500' : (sub.status === 'risky' ? 'bg-orange-500' : `bg-${primaryColor}-500`)} relative`}
                                        title="Custo da Férias"
                                    >
                                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
