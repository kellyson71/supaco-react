
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, 
    ShieldCheck, 
    XCircle, 
    Activity, 
    TrendingDown, 
    ShieldAlert, 
    BatteryWarning,
    Battery,
    BarChart2,
    Palmtree
} from 'lucide-react';
import { GradeInfo } from '../../types';
import { VacationPlanner } from './VacationPlanner';

interface AbsencesModalProps {
  grades: GradeInfo[];
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export const AbsencesModal: React.FC<AbsencesModalProps> = ({ grades, isDark, primaryColor, secondaryColor }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'planner'>('overview');
  
  // Calculate Stats
  const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
  const activeGrades = grades.filter(g => g.limit > 0);
  
  // Risk Analysis
  const criticalRisks = activeGrades.filter(g => (g.limit - g.absences) <= 4 && (g.limit - g.absences) >= 0).length;
  const safeSubjects = activeGrades.filter(g => (g.limit - g.absences) > 4).length;
  
  // Sorting: Critical first, then by least remaining
  activeGrades.sort((a, b) => {
      const remainingA = a.limit - a.absences;
      const remainingB = b.limit - b.absences;
      return remainingA - remainingB;
  });

  return (
    <div className="space-y-6 pb-24 h-full flex flex-col">
        
        {/* TAB SWITCHER */}
        <div className={`shrink-0 p-1 rounded-2xl border flex ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <button 
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                    ${activeTab === 'overview' 
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') 
                        : 'opacity-50 hover:opacity-100'}
                `}
            >
                <BarChart2 size={14} /> Visão Geral
            </button>
            <button 
                onClick={() => setActiveTab('planner')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                    ${activeTab === 'planner' 
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') 
                        : 'opacity-50 hover:opacity-100'}
                `}
            >
                <Palmtree size={14} /> Planejador de Férias
            </button>
        </div>

        {activeTab === 'planner' ? (
            <VacationPlanner 
                grades={grades} 
                isDark={isDark} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
            />
        ) : (
            <>
                {/* HERO SECTION: STATS DASHBOARD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    {/* Health Monitor */}
                    <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 opacity-60">
                                <Activity size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Saúde Acadêmica</span>
                            </div>
                            <div className={`p-2 rounded-full ${criticalRisks === 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {criticalRisks === 0 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                            </div>
                        </div>
                        <div>
                            <div className={`text-4xl font-black ${criticalRisks === 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                                {criticalRisks === 0 ? 'Estável' : 'Crítico'}
                            </div>
                            <div className="text-[10px] opacity-40 font-medium mt-1">Status geral de frequência</div>
                        </div>
                    </div>

                    {/* Total Used */}
                    <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between h-32 ${isDark ? `bg-white/5 border-white/5` : `bg-white border-gray-100 shadow-sm`}`}>
                        <div className="flex justify-between items-start">
                            <div className={`flex items-center gap-2 opacity-60`}>
                                <TrendingDown size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Usado</span>
                            </div>
                        </div>
                        <div>
                            <div className={`text-4xl font-black ${isDark ? 'text-white' : `text-gray-900`}`}>{totalAbsences}</div>
                            <div className={`text-[10px] font-medium mt-1 opacity-40`}>Faltas acumuladas</div>
                        </div>
                    </div>

                    {/* Safe Count */}
                    <div className={`hidden md:flex p-6 rounded-[2rem] border relative overflow-hidden flex-col justify-between h-32 ${isDark ? `bg-gradient-to-br from-${primaryColor}-500/10 to-transparent border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                        <div className="flex justify-between items-start">
                            <div className={`flex items-center gap-2 ${isDark ? `text-${primaryColor}-300` : `text-${primaryColor}-600`}`}>
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Matérias Seguras</span>
                            </div>
                        </div>
                        <div>
                            <div className={`text-4xl font-black ${isDark ? 'text-white' : `text-${primaryColor}-900`}`}>{safeSubjects}</div>
                            <div className={`text-[10px] font-medium mt-1 ${isDark ? `text-${primaryColor}-300` : `text-${primaryColor}-600`}`}>Longe do limite</div>
                        </div>
                    </div>
                </div>

                {/* SECTION TITLE */}
                <div className="flex items-center gap-4 px-2">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Limite por Disciplina</h3>
                    <div className={`h-[1px] flex-1 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
                </div>

                {/* MINIMALIST GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto pr-1 pb-4">
                    {activeGrades.map((grade, idx) => {
                        const remaining = grade.limit - grade.absences;
                        const percentageUsed = Math.min((grade.absences / grade.limit) * 100, 100);
                        
                        let statusColor = primaryColor; 
                        let statusText = "Seguro";
                        let statusIcon = Battery;
                        let bgStyle = isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm';
                        
                        if (remaining < 0) {
                            statusColor = secondaryColor;
                            statusText = "Reprovado";
                            statusIcon = XCircle;
                            bgStyle = isDark ? `bg-red-900/10 border-red-500/30` : `bg-red-50 border-red-200`;
                        } else if (remaining === 0) {
                            statusColor = secondaryColor;
                            statusText = "Limite Zero";
                            statusIcon = BatteryWarning;
                            bgStyle = isDark ? `bg-red-900/10 border-red-500/30` : `bg-red-50 border-red-200`;
                        } else if (remaining <= 4) {
                            statusColor = 'orange';
                            statusText = "Crítico";
                            statusIcon = AlertTriangle;
                            bgStyle = isDark ? `bg-orange-900/10 border-orange-500/30` : `bg-orange-50 border-orange-200`;
                        }

                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={grade.code} 
                                className={`p-6 rounded-[2.5rem] border relative flex flex-col justify-between group transition-all duration-300 hover:scale-[1.02] ${bgStyle}`}
                            >
                                {/* Header: Status Pill & Icon */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5
                                        ${statusColor === secondaryColor || statusColor === 'orange'
                                            ? (isDark ? `bg-${statusColor}-500/20 text-${statusColor}-400` : `bg-${statusColor}-100 text-${statusColor}-700`)
                                            : (isDark ? `bg-green-500/20 text-green-400` : `bg-green-100 text-green-700`)
                                        }
                                    `}>
                                        {React.createElement(statusIcon, { size: 12 })}
                                        {statusText}
                                    </div>
                                    {remaining <= 4 && remaining >= 0 && <span className="flex h-2 w-2 relative"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${statusColor}-400`}></span><span className={`relative inline-flex rounded-full h-2 w-2 bg-${statusColor}-500`}></span></span>}
                                </div>

                                {/* Main Content: Big Numbers */}
                                <div className="mb-6 relative">
                                    <h3 className={`text-sm font-bold leading-tight mb-4 line-clamp-2 min-h-[2.5rem] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {grade.subject}
                                    </h3>
                                    
                                    <div className="flex items-end gap-2">
                                        <span className={`text-6xl font-black tracking-tighter leading-none
                                            ${remaining <= 4 
                                                ? (isDark ? `text-${statusColor}-400` : `text-${statusColor}-600`) 
                                                : (isDark ? 'text-white' : 'text-gray-900')
                                            }
                                        `}>
                                            {remaining}
                                        </span>
                                        <div className="flex flex-col mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 leading-none">Restam</span>
                                            <span className="text-[8px] font-mono opacity-30">{grade.absences} usadas</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Progress & Details */}
                                <div className="mt-auto">
                                    {/* Unified Progress Bar */}
                                    <div className={`h-2 w-full rounded-full overflow-hidden mb-2 ${isDark ? 'bg-black/30' : 'bg-gray-200'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentageUsed}%` }}
                                            className={`h-full rounded-full ${remaining <= 2 ? `bg-${secondaryColor}-500` : (remaining <= 4 ? 'bg-orange-500' : `bg-green-500`)}`}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[9px] font-bold uppercase opacity-40">
                                        <span>{percentageUsed.toFixed(0)}% Utilizado</span>
                                        <span>Max: {grade.limit}</span>
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
            </>
        )}
    </div>
  );
};
