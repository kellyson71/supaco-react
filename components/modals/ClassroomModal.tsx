import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, AlertCircle, ExternalLink, Filter, CheckCircle, Monitor, Calendar, Clock, ArrowUpRight } from 'lucide-react';
import { ClassroomWork } from '../../types';

interface ClassroomModalProps {
  classroomWork: ClassroomWork[];
  isClassroomLinked: boolean;
  onRequestSettings: () => void;
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
}

export const ClassroomModal: React.FC<ClassroomModalProps> = ({ classroomWork, isClassroomLinked, onRequestSettings, isDark, accentColor, secondaryColor }) => {
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');

  if (!isClassroomLinked) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${isDark ? 'bg-white/5 text-gray-400 shadow-black/50' : 'bg-white text-gray-500 shadow-gray-200'}`}>
                  <Monitor size={48} />
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

  const filteredWork = classroomWork.filter(w => {
      if (filter === 'pending') return !w.jsDate || w.jsDate >= new Date();
      return w.jsDate && w.jsDate < new Date();
  });

  return (
    <div className="h-full flex flex-col pb-20">
        
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
             <div>
                 <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <Monitor size={24} className={`text-${accentColor}-500`} />
                    Classroom
                 </h2>
                 <p className="text-xs font-medium opacity-60">Gerencie suas entregas e atividades pendentes.</p>
             </div>

             <div className={`p-1 rounded-xl flex border self-start md:self-auto ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
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

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
            {filteredWork.map((work, idx) => {
                const isLate = work.jsDate && work.jsDate < new Date();
                const dueStr = work.jsDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const timeStr = work.jsDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return (
                    <motion.a 
                        key={work.id}
                        href={work.alternateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group relative flex flex-col p-6 rounded-[2rem] border transition-all hover:-translate-y-1 hover:shadow-xl
                            ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm'}
                        `}
                    >
                        {/* Status Pill */}
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider max-w-[70%] truncate
                                ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}
                            `}>
                                {work.courseName}
                            </div>
                            {isLate ? (
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            ) : (
                                <div className={`w-2 h-2 rounded-full bg-${accentColor}-500 shadow-[0_0_8px_var(--color-${accentColor}-500)]`} />
                            )}
                        </div>

                        {/* Content */}
                        <h3 className={`text-base font-bold leading-snug mb-4 line-clamp-3 group-hover:underline decoration-2 decoration-${accentColor}-500 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {work.title}
                        </h3>

                        {/* Footer Info */}
                        <div className="mt-auto pt-4 border-t border-dashed border-gray-500/20 flex items-center justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs font-bold opacity-80">
                                    <Calendar size={12} /> {dueStr || 'S/ Data'}
                                </div>
                                {timeStr && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-50 mt-0.5 ml-0.5">
                                        <Clock size={10} /> {timeStr}
                                    </div>
                                )}
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/5 group-hover:bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                                <ArrowUpRight size={16} />
                            </div>
                        </div>
                    </motion.a>
                )
            })}
            
            {filteredWork.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
                    <CheckCircle size={64} className="mb-4" />
                    <p className="text-lg font-bold uppercase">Nada Pendente</p>
                </div>
            )}
        </div>
    </div>
  );
};