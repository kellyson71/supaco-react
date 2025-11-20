
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Clock, MapPin, Award, Briefcase, User, Calendar, GraduationCap, Settings, Monitor, Moon, Sun, ToggleLeft, ToggleRight, Link2, Cpu, ShieldCheck, Eye, EyeOff, Key, Image as ImageIcon, Check, BookOpen, Palette, RefreshCw, Mail, Fingerprint, FileText, UserSquare2, Percent, Calculator, Flag, Target, CheckSquare } from 'lucide-react';
import { ViewState, GradeInfo, ThemeVariant, SuapProfile, SuapMeusDadosAluno, ProcessedClass, SuapCompletionData, CompletionCategory } from '../types';

interface OverlayViewProps {
  view: ViewState;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme?: () => void;
  currentWallpaper?: string;
  onWallpaperChange?: (url: string) => void;
  themeVariant: ThemeVariant;
  onThemeVariantChange: (variant: ThemeVariant) => void;
  primaryColor: string;
  secondaryColor: string;
  userData: SuapProfile | null;
  academicData?: SuapMeusDadosAluno | null;
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  completionData?: SuapCompletionData | null;
}

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg"
];

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

export const ContentView: React.FC<OverlayViewProps> = ({ view, onClose, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, grades, schedule, completionData }) => {
  if (view === ViewState.DASHBOARD) return null;

  const bgClass = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-100';
  const innerBgClass = isDarkMode ? 'bg-black/20' : 'bg-gray-50/50';
  const iconColorClass = `text-${primaryColor}-500`;

  // Configuration for the "Genie" effect position
  const getOriginY = (v: ViewState) => {
      switch(v) {
          case ViewState.GRADES: return '28%';    // ~Top part of nav
          case ViewState.ABSENCES: return '38%';  // Below Grades
          case ViewState.SCHEDULE: return '48%';  // Below Absences
          case ViewState.CONCLUSION: return '58%'; // Below Schedule
          case ViewState.PROFILE: return '88%';   // Bottom of sidebar
          default: return '50%';
      }
  };

  const getIcon = (v: ViewState) => {
      switch(v) {
          case ViewState.GRADES: return <BookOpen size={24} className={iconColorClass} />;
          case ViewState.ABSENCES: return <AlertTriangle size={24} className={iconColorClass} />;
          case ViewState.SCHEDULE: return <Calendar size={24} className={iconColorClass} />;
          case ViewState.CONCLUSION: return <Flag size={24} className={iconColorClass} />;
          case ViewState.PROFILE: return <User size={24} className={iconColorClass} />;
          default: return <Settings size={24} />;
      }
  };

  const originY = getOriginY(view);
  const icon = getIcon(view);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* THE EXPANDING MODAL */}
      <motion.div 
        className={`${bgClass} shadow-2xl overflow-hidden absolute z-50 flex flex-col pointer-events-auto border ${borderClass}`}
        initial={{ 
            top: originY,
            left: '3rem', // Center of sidebar (approx 48px)
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            opacity: 0,
            scale: 0.8,
        }}
        animate={{ 
            top: '6vh',
            left: '7rem', // Sidebar width (6rem) + 1rem gap
            width: 'calc(100vw - 8rem)', // Remaining width minus padding
            height: '88vh',
            borderRadius: '40px',
            opacity: 1,
            scale: 1,
        }}
        exit={{ 
            top: originY,
            left: '3rem',
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.3, ease: "backIn" }
        }}
        transition={{ 
            type: 'spring', 
            stiffness: 280, 
            damping: 30,
            mass: 0.8 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon: Starts centered (simulating the button), moves to header position */}
        <motion.div
            className="absolute z-50 flex items-center justify-center pointer-events-none"
            initial={{ 
                top: '50%', 
                left: '50%', 
                x: '-50%', 
                y: '-50%', 
            }}
            animate={{ 
                top: '2.5rem', // Vertical center of header (h-20 = 5rem/2 = 2.5rem)
                left: '2rem',  // Padding left of header
                x: '0%', 
                y: '-50%', 
            }}
            transition={{ 
                type: 'spring', 
                stiffness: 280, 
                damping: 30,
                delay: 0.05 // Slight delay to sync with box expansion
            }}
        >
            {icon}
        </motion.div>

        {/* HEADER: Fades in after box starts expanding to avoid text squashing */}
        <motion.div 
            className={`h-20 border-b ${borderClass} flex items-center justify-between px-8 ${bgClass} shrink-0 pl-16`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.2 }}
        >
          <div>
              <h2 className={`text-2xl font-black tracking-tight uppercase ${textClass}`}>
                {view === ViewState.GRADES ? 'Boletim Acadêmico' : 
                view === ViewState.ABSENCES ? 'Controle de Faltas' : 
                view === ViewState.SCHEDULE ? 'Horários da Semana' :
                view === ViewState.CONCLUSION ? 'Requisitos de Conclusão' :
                'Área do Aluno'}
              </h2>
              <p className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>
                {academicData?.curso ? `${academicData.situacao} • ${userData?.nome_usual.split(' ')[0]}` : 'Informações do Estudante'}
              </p>
          </div>
          <button 
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors group ${isDarkMode ? 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-500'}`}
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </motion.div>

        {/* BODY: Fades in */}
        <motion.div 
            className={`flex-1 overflow-y-auto p-6 ${innerBgClass}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.25, duration: 0.2 }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          {view === ViewState.GRADES && <GradesContent isDark={isDarkMode} primaryColor={primaryColor} secondaryColor={secondaryColor} grades={grades} />}
          {view === ViewState.ABSENCES && <AbsencesContent isDark={isDarkMode} primaryColor={primaryColor} secondaryColor={secondaryColor} grades={grades} />}
          {view === ViewState.SCHEDULE && <ScheduleContent isDark={isDarkMode} accentColor={primaryColor} secondaryColor={secondaryColor} schedule={schedule} />}
          {view === ViewState.CONCLUSION && <ConclusionContent isDark={isDarkMode} accentColor={primaryColor} secondaryColor={secondaryColor} data={completionData} />}
          {view === ViewState.PROFILE && (
            <ProfileContent 
                isDark={isDarkMode} 
                onToggleTheme={onToggleTheme} 
                currentWallpaper={currentWallpaper} 
                onWallpaperChange={onWallpaperChange} 
                themeVariant={themeVariant}
                onThemeVariantChange={onThemeVariantChange}
                accentColor={primaryColor}
                secondaryColor={secondaryColor}
                userData={userData}
                academicData={academicData}
                grades={grades}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

const ConclusionContent = ({ isDark, accentColor, secondaryColor, data }: { isDark: boolean, accentColor: string, secondaryColor: string, data?: SuapCompletionData | null }) => {
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';

    if (!data) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                <span className="text-xs font-bold uppercase">Carregando requisitos...</span>
            </div>
        );
    }

    const categories = [
        { key: 'regulares_obrigatorios', label: 'Regulares Obrigatórias', icon: BookOpen },
        { key: 'regulares_optativos', label: 'Optativas', icon: CheckSquare },
        { key: 'tcc', label: 'TCC', icon: GraduationCap },
        { key: 'pratica_profissional_estagio', label: 'Estágio Profissional', icon: Briefcase },
        { key: 'atividades_complementares', label: 'Ativ. Complementares', icon: Award },
        { key: 'eletivos', label: 'Eletivas', icon: CheckCircle },
    ];
    
    // Animation constants
    const radius = 100;
    const stroke = 15;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - ((data.percentual_cumprida || 0) / 100) * circumference;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pb-10"
        >
            {/* Hero Section */}
            <div className={`w-full p-8 py-16 rounded-[2.5rem] border shadow-sm relative overflow-hidden flex flex-col items-center justify-center ${cardBg}`}>
                <div className={`absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none`}>
                    <Target size={400} className={textMain} />
                </div>
                
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 z-10 text-center">Progresso Total do Curso</h3>
                
                <div className="relative w-64 h-64 flex items-center justify-center z-10 my-4">
                     {/* Decorative Glow */}
                     <div className={`absolute inset-0 rounded-full bg-${accentColor}-500/10 blur-3xl`} />
                     
                     <svg 
                        className="transform -rotate-90 drop-shadow-xl"
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                     >
                        <circle
                          stroke="currentColor"
                          fill="transparent"
                          strokeWidth={stroke}
                          strokeOpacity={isDark ? 0.1 : 0.05}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                          className={textMain}
                        />
                        <motion.circle
                          stroke="currentColor"
                          fill="transparent"
                          strokeWidth={stroke}
                          strokeDasharray={circumference + ' ' + circumference}
                          style={{ strokeDashoffset }}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                          className={`text-${accentColor}-500`}
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        />
                     </svg>
                     
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <motion.span 
                             initial={{ scale: 0.5, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ delay: 0.5, type: "spring" }}
                             className={`text-6xl font-black tracking-tighter ${textMain}`}
                         >
                             {data.percentual_cumprida}%
                         </motion.span>
                         <motion.span 
                             initial={{ y: 5, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ delay: 0.8 }}
                             className={`text-xs font-bold uppercase tracking-widest mt-1 text-${accentColor}-500`}
                         >
                             Concluído
                         </motion.span>
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-12 mt-12 w-full max-w-3xl text-center z-10">
                     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                         <div className={`text-3xl font-black ${textMain}`}>{data.totais.ch_cumprida}h</div>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Cumpridas</div>
                     </motion.div>
                     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className={`border-x ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                         <div className={`text-3xl font-black ${textMain}`}>{data.totais.ch_esperada}h</div>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Total</div>
                     </motion.div>
                     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
                         <div className={`text-3xl font-black text-${accentColor}-500`}>{data.totais.ch_pendente}h</div>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">Pendentes</div>
                     </motion.div>
                </div>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat, index) => {
                    const item = (data as any)[cat.key] as CompletionCategory;
                    if (!item) return null;
                    
                    const percentage = item.ch_esperada > 0 ? Math.min((item.ch_cumprida / item.ch_esperada) * 100, 100) : 0;
                    const isComplete = percentage >= 100;

                    return (
                        <motion.div 
                            key={cat.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + (index * 0.1) }}
                            className={`p-6 rounded-[2rem] border flex flex-col gap-4 hover:scale-[1.02] transition-transform ${cardBg}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isComplete ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500')}`}>
                                    <cat.icon size={24} />
                                </div>
                                {isComplete && (
                                    <div className={`px-2.5 py-1 rounded-lg bg-${accentColor}-500/10 text-${accentColor}-500 text-[10px] font-bold uppercase flex items-center gap-1`}>
                                        <Check size={12} /> Completo
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className={`font-bold text-sm ${textMain} uppercase tracking-wide opacity-80`}>{cat.label}</h4>
                                <div className="flex items-end gap-1 mt-2">
                                    <span className={`text-3xl font-black tracking-tight ${isComplete ? `text-${accentColor}-500` : textMain}`}>{item.ch_cumprida}</span>
                                    <span className="text-xs font-bold text-gray-400 mb-1.5">/ {item.ch_esperada}h</span>
                                </div>
                            </div>

                            <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden mt-2">
                                <motion.div 
                                    className={`h-full rounded-full ${isComplete ? `bg-${accentColor}-500` : `bg-${accentColor}-500`}`} 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, delay: 1 + (index * 0.1) }}
                                />
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mt-1">
                                <span>{percentage.toFixed(0)}% Concluído</span>
                                <span>{item.ch_pendente}h Restantes</span>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    );
};

const GradesContent = ({ isDark, primaryColor, secondaryColor, grades }: { isDark: boolean, primaryColor: string, secondaryColor: string, grades: GradeInfo[] }) => {
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    
    // Calculate Averages
    const overallAverage = grades.length > 0 
        ? (grades.reduce((acc, g) => acc + (typeof g.average === 'number' ? g.average : parseFloat(g.average as string) || 0), 0) / grades.length).toFixed(1)
        : '0.0';
    const overallFreq = grades.length > 0
        ? (grades.reduce((acc, g) => acc + g.frequency, 0) / grades.length).toFixed(1)
        : '0.0';

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`${cardBg} p-5 rounded-2xl shadow-sm border`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Média Geral</span>
                <div className={`text-3xl font-black mt-1 ${textMain}`}>{overallAverage}</div>
            </div>
            <div className={`${cardBg} p-5 rounded-2xl shadow-sm border`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Frequência Geral</span>
                <div className={`text-3xl font-black mt-1 ${textMain}`}>{overallFreq}%</div>
            </div>
            <div className={`${cardBg} p-5 rounded-2xl shadow-sm border`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Disciplinas</span>
                <div className={`text-3xl font-black mt-1 ${textMain}`}>{grades.length}</div>
            </div>
            <div className={`${isDark ? `bg-${primaryColor}-900/20 border-${primaryColor}-900/50` : `bg-${primaryColor}-50 border-${primaryColor}-100`} p-5 rounded-2xl shadow-sm border`}>
                <span className={`text-[10px] font-bold text-${primaryColor}-600 uppercase`}>Status</span>
                <div className={`text-3xl font-black text-${primaryColor}-600 mt-1 flex items-center gap-2`}>
                    OK <CheckCircle size={20} />
                </div>
            </div>
        </div>

        <div className={`${cardBg} rounded-[2rem] shadow-sm border overflow-hidden overflow-x-auto`}>
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className={`${isDark ? 'bg-white/5' : 'bg-gray-50'} border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
              <tr>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[30%]">Disciplina</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">N1</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">N2</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">N3</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">N4</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Final</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Média</th>
                <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Situação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
              {grades.map((grade) => {
                 return (
                <tr key={grade.code} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : `hover:bg-${primaryColor}-50/30`}`}>
                  <td className="p-5">
                      <div className={`font-bold text-base group-hover:text-${primaryColor}-600 transition-colors ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{grade.subject}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{grade.code}</div>
                  </td>
                  <td className="p-5 text-center text-gray-400 font-medium text-sm">{grade.n1 || '-'}</td>
                  <td className="p-5 text-center text-gray-400 font-medium text-sm">{grade.n2 || '-'}</td>
                  <td className="p-5 text-center text-gray-400 font-medium text-sm">{grade.n3 || '-'}</td>
                  <td className="p-5 text-center text-gray-400 font-medium text-sm">{grade.n4 || '-'}</td>
                  <td className="p-5 text-center text-gray-400 font-medium text-sm">{grade.finalGrade || '-'}</td>
                  <td className="p-5 text-center font-black text-lg text-gray-400">{grade.average || '-'}</td>
                  <td className="p-5 text-center">
                      <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase
                        ${grade.status === 'Aprovado' ? `bg-${primaryColor}-500/10 text-${primaryColor}-500` : 
                          grade.status === 'Reprovado' ? `bg-${secondaryColor}-500/10 text-${secondaryColor}-500` : 
                          (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}
                      `}>
                          {grade.status || 'Cursando'}
                      </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    );
};

const AbsencesContent = ({ isDark, primaryColor, secondaryColor, grades }: { isDark: boolean, primaryColor: string, secondaryColor: string, grades: GradeInfo[] }) => {
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    
    const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
    const totalSemesterHours = grades.reduce((acc, g) => acc + g.totalHours, 0);

    return (
      <div className="space-y-6">
          {/* Header Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={`p-6 rounded-[2rem] shadow-sm border flex items-center justify-between ${cardBg}`}>
                 <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Faltas no Semestre</div>
                    <div className={`text-4xl font-black ${textMain}`}>{totalAbsences}</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-1">Em todas as disciplinas</div>
                 </div>
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'} text-gray-400`}>
                    <Calculator size={24} />
                 </div>
             </div>

             <div className={`p-6 rounded-[2rem] shadow-sm border flex items-center justify-between ${cardBg}`}>
                 <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Carga Horária Total</div>
                    <div className={`text-4xl font-black ${textMain}`}>{totalSemesterHours}h</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-1">Total de horas aula no período</div>
                 </div>
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'} text-gray-400`}>
                    <Clock size={24} />
                 </div>
             </div>
          </div>

          {/* Detailed Breakdown */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Detalhamento por Disciplina</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grades.map((item) => {
                  const percentageUsed = Math.min((item.absences / item.limit) * 100, 100);
                  const remaining = item.limit - item.absences;
                  const isCritical = remaining <= 4; // Close to limit
                  const isFailed = remaining < 0;
                  
                  const statusColor = isFailed ? secondaryColor : isCritical ? 'orange' : primaryColor;
                  
                  return (
                    <div key={item.code} className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100'}`}>
                        {/* Background progress hint */}
                        <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-out bg-${statusColor}-500`} 
                            style={{ width: `${percentageUsed}%` }} 
                        />

                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-${statusColor}-500 ${isDark ? `bg-${statusColor}-500/10` : `bg-${statusColor}-50`}`}>
                                <Percent size={20} />
                            </div>
                            <div className={`text-right`}>
                                <div className={`text-2xl font-black ${textMain}`}>{item.frequency}%</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase">Presença</div>
                            </div>
                        </div>
                        
                        <h4 className={`font-bold text-base leading-tight mb-6 ${textMain} h-10 line-clamp-2`}>{item.subject}</h4>
                        
                        <div className="space-y-3 bg-black/5 dark:bg-white/5 rounded-xl p-4">
                             <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Faltas Totais</span>
                                 <span className={`text-sm font-black ${textMain}`}>{item.absences}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Limite (25%)</span>
                                 <span className={`text-sm font-black text-gray-400`}>{item.limit}</span>
                             </div>
                             <div className="w-full h-[1px] bg-gray-400/20 my-2" />
                             <div className="flex justify-between items-center">
                                 <span className={`text-[10px] font-bold uppercase text-${statusColor}-500`}>
                                     {isFailed ? 'Estourado' : 'Restantes'}
                                 </span>
                                 <span className={`text-xl font-black text-${statusColor}-500`}>
                                     {isFailed ? Math.abs(remaining) : remaining}
                                 </span>
                             </div>
                        </div>

                        <div className="mt-4 text-[10px] text-gray-400 text-center font-medium">
                            Carga Horária: {item.totalHours}h
                        </div>
                    </div>
                  );
              })}
          </div>
      </div>
    );
};

const ScheduleContent = ({ isDark, accentColor, secondaryColor, schedule }: { isDark: boolean, accentColor: string, secondaryColor: string, schedule: ProcessedClass[] }) => {
    const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full">
         {days.map((day, index) => {
             const dayInt = index + 2; // 2=Seg, 3=Ter...
             const classes = schedule.filter(s => s.dayInt === dayInt);
             const isToday = new Date().getDay() + 1 === dayInt;

             return (
                <DayColumn 
                    key={day}
                    day={day} 
                    isToday={isToday}
                    isDark={isDark}
                    accentColor={accentColor}
                    secondaryColor={secondaryColor}
                    classes={classes} 
                />
             )
         })}
      </div>
    );
};

const DayColumn: React.FC<{ day: string, isToday?: boolean, classes: ProcessedClass[], isDark: boolean, accentColor: string, secondaryColor: string }> = ({ day, isToday, classes, isDark, accentColor, secondaryColor }) => {
    const containerClass = isToday 
        ? (isDark ? 'bg-slate-800 text-white border-slate-700 shadow-xl' : 'bg-gray-900 text-white border-gray-900 shadow-xl')
        : (isDark ? 'bg-slate-900 border-white/10 hover:bg-slate-800' : 'bg-white border-gray-100 hover:shadow-lg');

    const itemClass = isToday 
        ? 'bg-white/10 backdrop-blur-sm' 
        : (isDark ? 'bg-white/5' : 'bg-gray-50');
    
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className={`rounded-[2rem] border p-5 flex flex-col gap-3 h-full transition-all ${containerClass}`}>
             <div className="text-center pb-3 border-b border-white/10">
                 <div className={`text-lg font-black ${isToday ? 'text-white' : 'text-gray-400'}`}>{day}</div>
                 {isToday && <span className={`text-[9px] bg-${accentColor}-500 text-white px-2 py-0.5 rounded-full font-bold uppercase`}>Hoje</span>}
             </div>
    
             <div className="flex flex-col gap-3 overflow-y-auto pr-1 custom-scroll">
                 {classes.map((cls, i) => (
                     <motion.div 
                        layout
                        key={i} 
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className={`p-3 rounded-xl text-sm relative cursor-default overflow-hidden ${itemClass} ${hoveredIndex === i ? 'ring-2 ring-' + accentColor + '-500/50' : ''}`}
                     >
                         <motion.div layout="position" className="flex justify-between items-start mb-1">
                            <div className={`text-[9px] font-bold uppercase ${isToday ? 'text-gray-400' : 'text-gray-400'}`}>{cls.timeLabel}</div>
                         </motion.div>
                         
                         <motion.div layout="position" className={`text-sm font-bold leading-tight mb-1 ${isToday ? 'text-white' : (isDark ? 'text-gray-200' : 'text-gray-900')}`}>
                            {cls.name}
                         </motion.div>

                         <AnimatePresence mode="wait">
                            {hoveredIndex === i ? (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 pt-2 border-t border-white/10 mt-2"
                                >
                                    <div className="flex items-start gap-2">
                                        <MapPin size={12} className={`mt-0.5 text-${accentColor}-500 shrink-0`} />
                                        <span className="text-[10px] font-medium opacity-80 leading-tight">{cls.fullRoom}</span>
                                    </div>
                                    {cls.professors && cls.professors.length > 0 && (
                                        <div className="flex items-start gap-2">
                                            <UserSquare2 size={12} className={`mt-0.5 text-${accentColor}-500 shrink-0`} />
                                            <div className="flex flex-col">
                                                {cls.professors.map((prof, idx) => (
                                                    <span key={idx} className="text-[10px] font-medium opacity-80 block leading-tight">{prof}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    layout="position" 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1 text-[9px] opacity-70"
                                >
                                     <MapPin size={10} />
                                     {cls.room}
                                </motion.div>
                            )}
                         </AnimatePresence>
                     </motion.div>
                 ))}
                 {classes.length === 0 && <div className="text-center text-xs opacity-30 mt-10">Sem aulas</div>}
             </div>
        </div>
    );
};

const ProfileContent = ({ isDark, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, accentColor, secondaryColor, userData, academicData, grades }: { 
    isDark: boolean, 
    onToggleTheme?: () => void,
    currentWallpaper?: string,
    onWallpaperChange?: (url: string) => void,
    themeVariant: ThemeVariant,
    onThemeVariantChange: (variant: ThemeVariant) => void,
    accentColor: string,
    secondaryColor: string,
    userData: SuapProfile | null,
    academicData?: SuapMeusDadosAluno | null,
    grades: GradeInfo[]
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'wallpaper'>('profile');
    const [classroomEnabled, setClassroomEnabled] = useState(false);
    const [useCustomPhoto, setUseCustomPhoto] = useState(false);
    
    // API Key Logic
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
    }, []);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setApiKey(val);
        localStorage.setItem('gemini_api_key', val);
    };
    
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const subTextClass = isDark ? 'text-gray-400' : 'text-gray-500';

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === id
                ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` 
                : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white text-gray-500 hover:bg-gray-50')
            }`}
        >
            <div className="flex items-center gap-2">
                <Icon size={14} />
                <span>{label}</span>
            </div>
        </button>
    );

    const suapPhotoPath = userData?.url_foto_150x200 || userData?.foto;
    const userPhoto = (useCustomPhoto || !suapPhotoPath) 
        ? DEFAULT_PROFILE_IMG 
        : (suapPhotoPath.startsWith('http') ? suapPhotoPath : `https://suap.ifrn.edu.br${suapPhotoPath}`);

    return (
        <div className="h-full flex flex-col">
            {/* Profile Navigation Tabs */}
            <div className="flex gap-3 mb-8 shrink-0">
                <TabButton id="profile" label="Perfil" icon={User} />
                <TabButton id="settings" label="Configurações" icon={Settings} />
                <TabButton id="wallpaper" label="Papéis de Parede" icon={ImageIcon} />
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'profile' ? (
                    <motion.div 
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-y-auto"
                    >
                        {/* Left Column: ID Card Style (Compact) */}
                        <div className={`md:col-span-1 rounded-[2rem] border p-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden ${cardBg} h-fit`}>
                            <div className={`absolute inset-x-0 top-0 h-28 ${isDark ? 'bg-slate-800' : 'bg-gray-900'}`} />
                            
                            <div className="relative z-10 mt-6 group cursor-pointer" onClick={() => setUseCustomPhoto(!useCustomPhoto)}>
                                <div className={`w-28 h-28 rounded-full p-1 transition-transform duration-300 group-hover:scale-105 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                                    <img 
                                        src={userPhoto} 
                                        className={`w-full h-full rounded-full object-cover border-4 ${isDark ? 'border-slate-800' : 'border-gray-50'}`} 
                                        alt="Profile"
                                    />
                                </div>
                                <div className={`absolute bottom-0 right-0 p-1.5 rounded-full ${isDark ? 'bg-slate-700 text-white' : 'bg-white shadow text-gray-600'}`}>
                                    <RefreshCw size={12} />
                                </div>
                            </div>
                            
                            <h2 className={`mt-5 text-2xl font-black ${textMain}`}>
                                {userData ? userData.nome_usual : 'Carregando...'}
                            </h2>
                            <span className={`font-bold text-[11px] px-4 py-1 rounded-full mt-2 ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-50 text-gray-500'}`}>
                                {academicData?.situacao || userData?.tipo_vinculo || 'Usuário'}
                            </span>
                            
                            <div className={`mt-8 w-full rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Matrícula</div>
                                <div className={`text-xl font-mono font-black tracking-widest ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {userData ? userData.matricula : '...'}
                                </div>
                            </div>
                            
                            <div className="mt-4 w-full grid grid-cols-2 gap-4">
                                <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">CPF</div>
                                    <div className={`font-bold text-xs truncate ${textMain}`}>
                                        {academicData?.cpf || '...'}
                                    </div>
                                </div>
                                <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Turno</div>
                                    <div className={`font-bold text-sm ${textMain}`}>
                                        {userData?.vinculo?.turno || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                
                        {/* Right Column: Stats & Details */}
                        <div className="md:col-span-2 flex flex-col gap-8">
                            {/* Course Info Card */}
                            <div className={`${cardBg} p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[240px]`}>
                                <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                                    <Briefcase size={180} />
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <GraduationCap size={24} className={`text-${accentColor}-500`}/>
                                        <h3 className={`text-2xl font-bold leading-tight ${textMain}`}>
                                            {academicData?.curso || userData?.vinculo?.curso || 'Curso não identificado'}
                                        </h3>
                                    </div>
                                    <p className="text-gray-400 text-sm max-w-lg flex flex-col gap-1">
                                        {academicData?.matriz && <span>Matriz: {academicData.matriz}</span>}
                                        {userData?.campus && <span>Campus: {userData.campus}</span>}
                                    </p>
                                </div>

                                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div className="text-gray-400 text-[10px] font-bold uppercase">Ingresso</div>
                                        <div className={`text-lg font-black ${textMain}`}>{academicData?.ingresso || '-'}</div>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div className="text-gray-400 text-[10px] font-bold uppercase">Período</div>
                                        <div className={`text-lg font-black ${textMain}`}>{academicData?.periodo_referencia || '-'}º</div>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div className="text-gray-400 text-[10px] font-bold uppercase">I.R.A.</div>
                                        <div className={`text-lg font-black ${textMain}`}>{academicData?.ira || '-'}</div>
                                    </div>
                                     <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div className="text-gray-400 text-[10px] font-bold uppercase">Diploma</div>
                                        <div className={`text-lg font-black ${academicData?.emitiu_diploma ? `text-${accentColor}-500` : 'text-gray-500'}`}>
                                            {academicData?.emitiu_diploma ? 'Sim' : 'Não'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {/* Contact & Personal Data */}
                            <div className={`${cardBg} p-6 rounded-[2rem] border shadow-sm`}>
                                <h4 className={`text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2`}>
                                    <FileText size={14}/> Dados Cadastrais
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                        <div className={`p-2 rounded-full bg-${accentColor}-500/10 text-${accentColor}-500`}>
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Email Acadêmico</div>
                                            <div className={`text-sm font-medium ${textMain}`}>{academicData?.email_academico || '-'}</div>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                        <div className={`p-2 rounded-full bg-${accentColor}-500/10 text-${accentColor}-500`}>
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Email Escolar</div>
                                            <div className={`text-sm font-medium ${textMain}`}>{academicData?.email_escolar || '-'}</div>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                        <div className={`p-2 rounded-full bg-${accentColor}-500/10 text-${accentColor}-500`}>
                                            <Fingerprint size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Impressão Digital</div>
                                            <div className={`text-sm font-medium ${textMain}`}>{academicData?.impressao_digital ? 'Cadastrada' : 'Não cadastrada'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                        <div className={`p-2 rounded-full bg-${accentColor}-500/10 text-${accentColor}-500`}>
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Data Migração</div>
                                            <div className={`text-sm font-medium ${textMain}`}>{academicData?.data_migracao || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'wallpaper' ? (
                    <motion.div 
                        key="wallpaper"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full overflow-y-auto"
                    >
                        <div className="mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Escolha seu fundo</h3>
                            <p className={`text-sm ${subTextClass}`}>Personalize a aparência do seu painel escolhendo um dos wallpapers abaixo.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            {WALLPAPERS.map((wp, idx) => {
                                const isSelected = currentWallpaper === wp;
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => onWallpaperChange?.(wp)}
                                        className={`group relative rounded-3xl overflow-hidden cursor-pointer aspect-video border-4 transition-all duration-300 ${isSelected ? `border-${accentColor}-500 scale-[1.02] shadow-xl shadow-${accentColor}-500/20` : 'border-transparent hover:scale-[1.01]'}`}
                                    >
                                        <div className="absolute inset-0 bg-gray-900/10 group-hover:bg-transparent transition-colors z-10" />
                                        <img src={wp} alt={`Wallpaper ${idx + 1}`} className="w-full h-full object-cover" />
                                        
                                        {isSelected && (
                                            <div className={`absolute inset-0 z-20 bg-${accentColor}-500/20 flex items-center justify-center`}>
                                                <div className={`bg-${accentColor}-500 text-white p-3 rounded-full shadow-lg`}>
                                                    <Check size={32} strokeWidth={3} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full overflow-y-auto"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6">
                            {/* Left Column: Appearance & Integrations */}
                            <div className="space-y-8">
                                {/* Section: Theme Mode */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Modo</h3>
                                    <div className={`${cardBg} rounded-3xl p-2 border shadow-sm flex`}>
                                        <button 
                                            onClick={() => isDark && onToggleTheme?.()}
                                            className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${!isDark ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            <Sun size={20} className={!isDark ? 'text-orange-500' : ''} />
                                            <span className="font-bold text-sm">Claro</span>
                                        </button>
                                        <button 
                                            onClick={() => !isDark && onToggleTheme?.()}
                                            className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 shadow-md text-white' : 'text-gray-400 hover:text-gray-900'}`}
                                        >
                                            <Moon size={20} className={isDark ? 'text-blue-400' : ''} />
                                            <span className="font-bold text-sm">Escuro</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section: Theme Variant */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Estilo</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['default', 'monochrome', 'saturated', 'dynamic'] as ThemeVariant[]).map((v) => {
                                            const active = themeVariant === v;
                                            return (
                                                <button
                                                    key={v}
                                                    onClick={() => onThemeVariantChange(v)}
                                                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                                        active 
                                                        ? `border-${accentColor}-500 bg-${accentColor}-500/10 text-${accentColor}-500` 
                                                        : `${cardBg} text-gray-400 hover:border-gray-300`
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border-2 ${active ? `border-${accentColor}-500 bg-${accentColor}-500` : 'border-gray-300'}`} />
                                                    <span className="text-xs font-bold uppercase">
                                                        {v === 'default' ? 'Padrão' : 
                                                         v === 'monochrome' ? 'Mono' : 
                                                         v === 'saturated' ? 'Saturado' : 'Dinâmico'}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Section: Integrations */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Integrações</h3>
                                    <div className={`${cardBg} rounded-[2rem] border shadow-sm overflow-hidden`}>
                                        {/* Google Classroom */}
                                        <div className={`p-6 flex items-center justify-between ${isDark ? 'border-b border-white/5' : 'border-b border-gray-50'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                                                    <Monitor size={24} />
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-base ${textMain}`}>Classroom</div>
                                                    <div className="text-xs text-gray-400">Sincronizar tarefas</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setClassroomEnabled(!classroomEnabled)}
                                                className={`text-4xl transition-colors ${classroomEnabled ? `text-${accentColor}-500` : 'text-gray-300'}`}
                                            >
                                                {classroomEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: AI Config (Full Height) */}
                            <div className="flex flex-col h-full">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Inteligência Artificial</h3>
                                <div className={`${cardBg} rounded-[2rem] border shadow-sm p-8 relative overflow-hidden flex-1 min-h-[320px]`}>
                                    <div className={`absolute -right-10 -bottom-10 w-48 h-48 bg-${accentColor}-500/10 rounded-full blur-3xl pointer-events-none`} />
                                    
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-500`}`}>
                                                <Cpu size={28} />
                                            </div>
                                            <div>
                                                <div className={`font-bold text-lg ${textMain}`}>Gemini 2.5 Flash</div>
                                                <div className="text-xs text-gray-400">Assistente Virtual</div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                                            <ShieldCheck size={12} />
                                            Ativo
                                        </div>
                                    </div>

                                    {/* API Key Configuration */}
                                    <div className="relative z-10 space-y-6">
                                        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block flex items-center gap-2">
                                                <Key size={12} />
                                                Chave de API (Google AI Studio)
                                            </label>
                                            
                                            <div className="relative">
                                                <input 
                                                    type={showKey ? "text" : "password"}
                                                    value={apiKey}
                                                    onChange={handleApiKeyChange}
                                                    placeholder="Cole sua API Key aqui..."
                                                    className={`w-full bg-transparent border-b px-2 py-2 text-sm font-mono tracking-wider outline-none transition-colors ${
                                                        isDark ? `border-white/10 focus:border-${accentColor}-500 text-white placeholder:text-white/20` : `border-gray-200 focus:border-${accentColor}-500 text-gray-800 placeholder:text-gray-400`
                                                    }`}
                                                />
                                                <button 
                                                    onClick={() => setShowKey(!showKey)}
                                                    className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-${accentColor}-500 transition-colors`}
                                                >
                                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500">
                                                    {apiKey ? 'Chave personalizada salva localmente.' : 'Usando chave de ambiente padrão.'}
                                                </span>
                                                {apiKey && (
                                                    <button 
                                                        onClick={() => { setApiKey(''); localStorage.removeItem('gemini_api_key'); }}
                                                        className="text-[10px] font-bold text-red-400 hover:text-red-500"
                                                    >
                                                        RESTAURAR PADRÃO
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-400 leading-relaxed">
                                            Sua chave de API permite aumentar os limites de uso do assistente Gemini. 
                                            A chave é salva apenas no seu navegador.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
