import React from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Briefcase, GraduationCap, Layout, Layers, Box, Trophy, CalendarClock, PieChart } from 'lucide-react';
import { SuapCompletionData } from '../../types';

interface ConclusionModalProps {
  data: SuapCompletionData | null;
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
}

export const ConclusionModal: React.FC<ConclusionModalProps> = ({ data, isDark, accentColor, secondaryColor }) => {
  
  if (!data) return <div className="p-10 text-center opacity-50">Carregando dados...</div>;

  const percent = data.percentual_cumprida || 0;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const categories = [
      { id: 'obrigatorias', label: 'Obrigatórias', icon: BookMarked, data: data.regulares_obrigatorios },
      { id: 'optativas', label: 'Optativas', icon: Layers, data: data.regulares_optativos },
      { id: 'pratica', label: 'Prática Profissional', icon: Briefcase, data: data.pratica_profissional },
      { id: 'tcc', label: 'TCC', icon: GraduationCap, data: data.tcc },
      { id: 'complementares', label: 'Complementares', icon: Layout, data: data.atividades_complementares },
      { id: 'seminarios', label: 'Seminários', icon: Box, data: data.seminarios },
  ];

  // Estimation (Mock logic)
  const estimatedSemestersLeft = Math.ceil((100 - percent) / 12); 
  const currentYear = new Date().getFullYear();
  const estimatedYear = currentYear + Math.ceil(estimatedSemestersLeft / 2);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 pb-24 md:pb-0">
        
        {/* LEFT PANEL: HERO STATS (Sticky on Desktop) */}
        <div className="md:w-1/3 shrink-0 flex flex-col gap-4">
             <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden flex flex-col items-center justify-center shadow-lg ${isDark ? `bg-gradient-to-br from-${accentColor}-900/20 to-black/20 border-white/10` : `bg-gradient-to-br from-${accentColor}-50 to-white border-gray-100`}`}>
                <div className="relative w-64 h-64 flex items-center justify-center mb-6">
                    {/* Glow */}
                    <div className={`absolute inset-0 rounded-full blur-[80px] opacity-30 bg-${accentColor}-500 animate-pulse`} />
                    
                    <svg className="w-full h-full -rotate-90 transform drop-shadow-2xl" viewBox="0 0 240 240">
                        <circle
                            cx="120" cy="120" r={radius}
                            stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                            strokeWidth="16" fill="transparent" strokeLinecap="round"
                        />
                        <motion.circle
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="120" cy="120" r={radius}
                            stroke={`var(--color-${accentColor}-500)`} 
                            strokeWidth="16" fill="transparent"
                            strokeDasharray={circumference}
                            strokeLinecap="round"
                            className={`text-${accentColor}-500`}
                        />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`text-5xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                            {percent}%
                        </motion.span>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-50`}>Concluído</span>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 border-t border-dashed border-gray-500/20 pt-6">
                    <div className="text-center">
                        <div className="text-[9px] font-black uppercase opacity-40 mb-1">Cumpriu</div>
                        <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.totais.ch_cumprida}h</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] font-black uppercase opacity-40 mb-1">Total</div>
                        <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.totais.ch_esperada}h</div>
                    </div>
                </div>
             </div>

             <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex items-center gap-5 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                 <div className={`p-3 rounded-full ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                     <CalendarClock size={24} />
                 </div>
                 <div>
                     <div className="text-[10px] font-black uppercase opacity-50 mb-0.5">Previsão</div>
                     <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{estimatedYear}.2</div>
                 </div>
             </div>
        </div>

        {/* RIGHT PANEL: GRID CATEGORIES */}
        <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 opacity-50">
                <PieChart size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Detalhamento da Grade</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
                {categories.map((cat, idx) => {
                    if (!cat.data || cat.data.ch_esperada === 0) return null;
                    
                    const catProgress = Math.min((cat.data.ch_cumprida / cat.data.ch_esperada) * 100, 100);
                    const isComplete = catProgress >= 100;

                    return (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            key={cat.id} 
                            className={`p-5 rounded-[2rem] border relative overflow-hidden transition-all hover:scale-[1.02]
                                ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-xl ${isComplete ? `bg-${accentColor}-500 text-white` : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                    {isComplete ? <Trophy size={18} /> : <cat.icon size={18} />}
                                </div>
                                <span className={`text-sm font-black ${isComplete ? `text-${accentColor}-500` : 'opacity-40'}`}>{catProgress.toFixed(0)}%</span>
                            </div>

                            <h4 className={`text-sm font-bold uppercase tracking-wide truncate mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat.label}</h4>

                            <div className={`h-2 w-full rounded-full overflow-hidden mb-3 ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${catProgress}%` }}
                                    className={`h-full rounded-full ${isComplete ? `bg-${accentColor}-500` : `bg-${accentColor}-500/50`}`}
                                />
                            </div>

                            <div className="flex justify-between text-[9px] font-mono font-bold opacity-40">
                                <span>{cat.data.ch_cumprida}h</span>
                                <span>{cat.data.ch_esperada}h</span>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    </div>
  );
};