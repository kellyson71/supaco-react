
import React from 'react';
import { motion } from 'framer-motion';
import { 
    AlertTriangle, 
    ShieldCheck, 
    XCircle, 
    Activity, 
    TrendingDown, 
    ShieldAlert, 
    CheckCircle2, 
    MoreHorizontal,
    HeartPulse
} from 'lucide-react';
import { GradeInfo } from '../../types';

interface AbsencesModalProps {
  grades: GradeInfo[];
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export const AbsencesModal: React.FC<AbsencesModalProps> = ({ grades, isDark, primaryColor, secondaryColor }) => {
  
  // Calculate Stats
  const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
  const activeGrades = grades.filter(g => g.limit > 0);
  
  // Risk Analysis
  const criticalRisks = activeGrades.filter(g => (g.limit - g.absences) <= 4 && (g.limit - g.absences) >= 0).length;
  const safeSubjects = activeGrades.filter(g => (g.limit - g.absences) > 4).length;
  const failedSubjects = activeGrades.filter(g => (g.limit - g.absences) < 0).length;

  // Sorting: Critical first, then by least remaining
  activeGrades.sort((a, b) => {
      const remainingA = a.limit - a.absences;
      const remainingB = b.limit - b.absences;
      return remainingA - remainingB;
  });

  return (
    <div className="space-y-8 pb-24 h-full flex flex-col">
        
        {/* HERO SECTION: STATS DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {/* Total Absences Card */}
            <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-2 opacity-60">
                        <TrendingDown size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Acumulado</span>
                     </div>
                     <div className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <Activity size={18} className={isDark ? 'text-white' : 'text-gray-900'} />
                     </div>
                </div>
                <div>
                     <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalAbsences}</div>
                     <div className="text-[10px] opacity-40 font-medium mt-1">Faltas totais no semestre</div>
                </div>
            </div>

            {/* Critical Risk Card */}
            <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${isDark ? `bg-gradient-to-br from-${secondaryColor}-500/10 to-transparent border-${secondaryColor}-500/20` : `bg-${secondaryColor}-50 border-${secondaryColor}-100`}`}>
                <div className="flex justify-between items-start">
                     <div className={`flex items-center gap-2 ${isDark ? `text-${secondaryColor}-300` : `text-${secondaryColor}-600`}`}>
                        <AlertTriangle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Atenção</span>
                     </div>
                     {criticalRisks > 0 && (
                        <div className="flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full bg-${secondaryColor}-400 opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 bg-${secondaryColor}-500`}></span>
                        </div>
                     )}
                </div>
                <div>
                     <div className={`text-4xl font-black ${isDark ? 'text-white' : `text-${secondaryColor}-900`}`}>{criticalRisks}</div>
                     <div className={`text-[10px] font-medium mt-1 ${isDark ? `text-${secondaryColor}-300` : `text-${secondaryColor}-600`}`}>Disciplinas no limite</div>
                </div>
            </div>

             {/* Safe Status Card */}
             <div className={`hidden md:flex p-6 rounded-[2rem] border relative overflow-hidden flex-col justify-between h-32 ${isDark ? `bg-gradient-to-br from-${primaryColor}-500/10 to-transparent border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                <div className="flex justify-between items-start">
                     <div className={`flex items-center gap-2 ${isDark ? `text-${primaryColor}-300` : `text-${primaryColor}-600`}`}>
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Seguras</span>
                     </div>
                </div>
                <div>
                     <div className={`text-4xl font-black ${isDark ? 'text-white' : `text-${primaryColor}-900`}`}>{safeSubjects}</div>
                     <div className={`text-[10px] font-medium mt-1 ${isDark ? `text-${primaryColor}-300` : `text-${primaryColor}-600`}`}>Dentro do limite</div>
                </div>
            </div>
        </div>

        {/* SECTION TITLE */}
        <div className="flex items-center gap-4 px-2">
            <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Monitoramento de Disciplinas</h3>
            <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
        </div>

        {/* MINIMALIST GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto pr-1 pb-4">
            {activeGrades.map((grade, idx) => {
                const remaining = grade.limit - grade.absences;
                const percentageUsed = Math.min((grade.absences / grade.limit) * 100, 100);
                
                let statusColor = primaryColor;
                let statusText = "Seguro";
                let statusIcon = CheckCircle2;
                
                if (remaining < 0) {
                    statusColor = secondaryColor;
                    statusText = "Reprovado";
                    statusIcon = XCircle;
                } else if (remaining === 0) {
                    statusColor = secondaryColor;
                    statusText = "Limite Atingido";
                    statusIcon = AlertTriangle;
                } else if (remaining <= 4) {
                    statusColor = 'orange';
                    statusText = "Risco Alto";
                    statusIcon = ShieldAlert;
                }

                // Dynamic background based on risk
                const cardBg = remaining <= 2 && remaining >= 0
                    ? (isDark ? 'bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20' : 'bg-orange-50 border-orange-200')
                    : remaining < 0
                        ? (isDark ? `bg-gradient-to-br from-${secondaryColor}-500/10 to-transparent border-${secondaryColor}-500/20` : `bg-${secondaryColor}-50 border-${secondaryColor}-200`)
                        : (isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:shadow-lg');

                return (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={grade.code} 
                        className={`p-6 rounded-[2.5rem] border relative flex flex-col justify-between group transition-all duration-300 ${cardBg}`}
                    >
                        {/* Header: Status Pill & Icon */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5
                                ${statusColor === secondaryColor || statusColor === 'orange'
                                    ? (isDark ? `bg-${statusColor}-500/20 text-${statusColor}-400` : `bg-${statusColor}-100 text-${statusColor}-700`)
                                    : (isDark ? `bg-${primaryColor}-500/10 text-${primaryColor}-400` : `bg-${primaryColor}-50 text-${primaryColor}-700`)
                                }
                            `}>
                                {React.createElement(statusIcon, { size: 10 })}
                                {statusText}
                            </div>
                            <MoreHorizontal size={16} className="opacity-20 group-hover:opacity-100 transition-opacity cursor-pointer" />
                        </div>

                        {/* Main Content: Big Numbers */}
                        <div className="mb-6 relative">
                            <h3 className={`text-sm font-bold leading-tight mb-4 line-clamp-2 min-h-[2.5rem] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {grade.subject}
                            </h3>
                            
                            <div className="flex items-end gap-2">
                                <span className={`text-5xl font-black tracking-tighter
                                    ${remaining <= 2 
                                        ? (isDark ? `text-${statusColor}-400` : `text-${statusColor}-500`) 
                                        : (isDark ? 'text-white' : 'text-gray-900')
                                    }
                                `}>
                                    {remaining}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Restantes</span>
                            </div>
                        </div>

                        {/* Footer: Progress & Details */}
                        <div className="mt-auto">
                            {/* Segmented Progress Bar */}
                            <div className="flex gap-1 mb-2 h-1.5 w-full">
                                {Array.from({ length: 4 }).map((_, i) => {
                                    // Calculate if this segment is filled
                                    const segmentValue = (i + 1) * 25;
                                    const isFilled = percentageUsed >= segmentValue;
                                    const isPartial = percentageUsed > (i * 25) && percentageUsed < segmentValue;
                                    
                                    return (
                                        <div key={i} className={`flex-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}>
                                            {(isFilled || isPartial) && (
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: isPartial ? `${(percentageUsed % 25) * 4}%` : '100%' }}
                                                    className={`h-full ${remaining <= 4 ? `bg-${statusColor}-500` : `bg-${primaryColor}-500`}`}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex justify-between items-center text-[9px] font-bold uppercase opacity-40">
                                <span>{grade.absences} Faltaram</span>
                                <span>Limite: {grade.limit}</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {activeGrades.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                     <ShieldCheck size={64} className="mb-4" />
                     <p className="text-sm font-bold uppercase">Nenhuma falta registrada</p>
                </div>
            )}
        </div>
    </div>
  );
};
