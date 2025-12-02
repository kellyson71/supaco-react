
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Sparkles, Lock, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { ClassroomWork } from '../../types';
import { ClassroomAIOverlay } from './ClassroomAIOverlay';

interface ClassroomModalProps {
  classroomWork: ClassroomWork[];
  isClassroomLinked: boolean;
  onRequestSettings: () => void;
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
  internalApiKey?: string;
  onOpenChatWithContext?: (messages: any[], pendingMessage?: string) => void;
  onOpenSettings?: () => void;
  onRefresh?: () => void;
}

const ClassroomIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
    <div 
        className={className}
        style={{
            width: size,
            height: size,
            maskImage: 'url("https://img.icons8.com/?size=100&id=31054&format=png&color=000000")',
            WebkitMaskImage: 'url("https://img.icons8.com/?size=100&id=31054&format=png&color=000000")',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            backgroundColor: 'currentColor'
        }}
    />
);

export const ClassroomModal: React.FC<ClassroomModalProps> = ({ 
    classroomWork, 
    isClassroomLinked, 
    onRequestSettings, 
    isDark, 
    accentColor, 
    secondaryColor,
    isPremium,
    onOpenPremiumModal,
    internalApiKey,
    onOpenChatWithContext,
    onOpenSettings,
    onRefresh
}) => {
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');
  const [solvingWork, setSolvingWork] = useState<ClassroomWork | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isClassroomLinked) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${isDark ? 'bg-white/5 text-gray-400 shadow-black/50' : 'bg-white text-gray-500 shadow-gray-200'}`}>
                  <ClassroomIcon size={48} />
              </div>
              <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Conectar Classroom</h2>
              <p className="opacity-60 max-w-sm mb-8 text-sm leading-relaxed">
                  Centralize suas tarefas. Vincule sua conta Google institucional para acompanhar prazos e atividades.
              </p>
              <button 
                onClick={onRequestSettings}
                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-xl
                    ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
                `}
              >
                  Vincular Agora
              </button>
          </div>
      )
  }

  const getApiKey = () => {
      let key = localStorage.getItem('gemini_api_key') || internalApiKey;
      if (!key && process.env.API_KEY) key = process.env.API_KEY;
      return key;
  };

  const startAnalysis = (work: ClassroomWork) => {
      if (!isPremium) {
          onOpenPremiumModal?.();
          return;
      }
      setSolvingWork(work);
  };

  const handleManualRefresh = async () => {
      if (onRefresh) {
          setIsRefreshing(true);
          await Promise.resolve(onRefresh());
          setTimeout(() => setIsRefreshing(false), 1000);
      }
  };

  const filteredWork = classroomWork.filter(w => {
      if (filter === 'pending') return !w.jsDate || w.jsDate >= new Date();
      return w.jsDate && w.jsDate < new Date();
  });

  return (
    <div className="h-full flex flex-col pb-20 relative">
        
        {/* Header Toolbar */}
        <div id="classroom-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 relative z-10">
             <div>
                 <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className={`text-${accentColor}-500`}>
                        <ClassroomIcon size={24} />
                    </div>
                    Classroom
                 </h2>
                 <p className="text-xs font-medium opacity-60">Gerencie suas entregas e atividades pendentes.</p>
             </div>

             <div className="flex items-center gap-2 self-start md:self-auto">
                <button 
                    onClick={handleManualRefresh}
                    className={`p-2.5 rounded-xl transition-all border ${isDark ? 'bg-black/20 border-white/10 hover:bg-white/10 text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800'}`}
                    title="Recarregar Atividades"
                >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>

                <div className={`p-1 rounded-xl flex border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                    <button 
                        onClick={() => setFilter('pending')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'pending' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                    >
                        Pendentes
                    </button>
                    <button 
                        onClick={() => setFilter('history')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${filter === 'history' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                    >
                        Histórico
                    </button>
                </div>
            </div>
        </div>

        {/* AI SOLVER OVERLAY */}
        <AnimatePresence>
            {solvingWork && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`absolute inset-0 z-50 rounded-[2.5rem] overflow-hidden shadow-2xl border ${isDark ? 'border-white/20' : 'border-gray-200'}`}
                >
                    <ClassroomAIOverlay 
                        work={solvingWork}
                        onClose={() => setSolvingWork(null)}
                        isDark={isDark}
                        apiKey={getApiKey()}
                        onOpenChatWithContext={onOpenChatWithContext}
                    />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Masonry Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-2 pb-10">
            {filteredWork.map((work, idx) => {
                const now = new Date();
                const isLate = work.jsDate && work.jsDate < now;
                const isDueToday = work.jsDate && 
                    work.jsDate.getDate() === now.getDate() &&
                    work.jsDate.getMonth() === now.getMonth() &&
                    work.jsDate.getFullYear() === now.getFullYear();

                const dueStr = work.jsDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const timeStr = work.jsDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                    <motion.div
                        id={idx === 0 ? "classroom-item-0" : undefined}
                        key={work.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group relative flex flex-col rounded-[2.5rem] border transition-all duration-300 overflow-hidden
                            ${isDueToday 
                                ? (isDark ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15' : 'bg-amber-50 border-amber-200 hover:shadow-xl')
                                : (isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl')}
                        `}
                        whileHover={{ scale: 1.02, zIndex: 10 }}
                    >
                        {/* Interactive Area */}
                        <div className="flex flex-col h-full p-8 pb-20 relative z-10">
                            {/* Course Pill */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider max-w-[70%] truncate shadow-sm
                                    ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}
                                `}>
                                    {work.courseName}
                                </div>
                                {isLate ? (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">
                                        <AlertCircle size={10} /> Atrasado
                                    </div>
                                ) : isDueToday ? (
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                        <AlertCircle size={10} className="animate-pulse" /> Entrega Hoje
                                    </div>
                                ) : (
                                    <div className={`w-2.5 h-2.5 rounded-full bg-${accentColor}-500 shadow-[0_0_10px_var(--color-${accentColor}-500)]`} />
                                )}
                            </div>

                            <a href={work.alternateLink} target="_blank" rel="noopener noreferrer" className="block mb-4 group/title">
                                <h3 className={`text-lg font-black leading-tight group-hover/title:underline decoration-2 underline-offset-4 decoration-${accentColor}-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {work.title}
                                </h3>
                            </a>
                            
                            {/* Description - Expanded on Hover via CSS/Layout */}
                            <div className="relative overflow-hidden mb-4 max-h-[60px] group-hover:max-h-[300px] transition-all duration-500 ease-in-out cursor-default">
                                <p className={`text-xs opacity-60 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {work.description || "Sem descrição disponível."}
                                </p>
                                {/* Fade out for truncated text */}
                                <div className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t group-hover:opacity-0 transition-opacity duration-300 ${isDark ? 'from-[#1e293b]' : 'from-white'} ${isDueToday ? (isDark ? 'from-[#1e1c15]' : 'from-amber-50') : ''}`} />
                            </div>

                            {/* Footer Info */}
                            <div className={`mt-auto flex items-center gap-4 text-xs font-bold ${isDueToday ? 'text-amber-500 opacity-100' : 'opacity-50'}`}>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} /> {dueStr || 'S/ Data'}
                                </div>
                                {timeStr && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} /> {timeStr}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Bar - Slides up or appears on hover */}
                        <div 
                            id={idx === 0 ? "classroom-action-0" : undefined}
                            className={`absolute bottom-6 left-6 right-6 z-20 transition-all duration-300 delay-75
                                opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
                            `}
                        >
                             <button 
                                onClick={() => startAnalysis(work)}
                                className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-transform hover:scale-105 active:scale-95 shadow-lg
                                    ${isPremium 
                                        ? `bg-violet-600 text-white shadow-violet-600/30`
                                        : `bg-gray-200 dark:bg-white/10 text-gray-500`}
                                `}
                            >
                                {isPremium ? <Sparkles size={14} fill="currentColor" /> : <Lock size={14} />}
                                {isPremium ? 'Resolver com IA' : 'IA (Premium)'}
                            </button>
                        </div>
                    </motion.div>
                )
            })}
            
            {filteredWork.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                    <Check size={64} className="mb-4" />
                    <p className="text-lg font-bold uppercase">Nada Pendente</p>
                </div>
            )}
        </div>
    </div>
  );
};