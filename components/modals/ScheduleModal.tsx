import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Coffee, Calendar, User, ArrowRight, Layers } from 'lucide-react';
import { ProcessedClass } from '../../types';

interface ScheduleModalProps {
  schedule: ProcessedClass[];
  isDark: boolean;
  accentColor: string;
  secondaryColor: string;
}

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const SUBJECT_COLORS = ['blue', 'emerald', 'violet', 'amber', 'rose', 'cyan', 'fuchsia', 'lime', 'indigo', 'orange', 'teal', 'sky', 'pink'];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, isDark, accentColor, secondaryColor }) => {
  const [activeDay, setActiveDay] = useState<string>('Segunda');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update active day based on today
  useEffect(() => {
      const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
      const found = DAYS.find(d => d.toLowerCase() === today.toLowerCase());
      if (found) setActiveDay(found);
  }, []);

  const getSubjectColor = (subjectName: string) => {
      let hash = 0;
      for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
      return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
  };

  const groupConsecutiveClasses = (classes: ProcessedClass[]) => {
      if (classes.length === 0) return [];
      
      const grouped: Array<ProcessedClass & { periods: number }> = [];
      
      classes.forEach((current, index) => {
          if (index === 0) {
              grouped.push({ ...current, periods: 1 });
              return;
          }

          const prev = grouped[grouped.length - 1];
          
          // Check if same subject and same room (consecutive block)
          if (prev.name === current.name && prev.room === current.room) {
              // Extend the previous block
              prev.endTime = current.endTime;
              prev.periods += 1;
          } else {
              // New block
              grouped.push({ ...current, periods: 1 });
          }
      });

      return grouped;
  };

  const todayIndex = new Date().getDay(); // 0-6

  return (
    <div className="pb-24 h-full flex flex-col space-y-4">
        
        {/* HEADER */}
        <div className="flex items-center gap-2 shrink-0">
            <div className={`p-2 rounded-lg ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                <Calendar size={18} />
            </div>
            <div>
                 <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Horário Semanal</h2>
                 <p className="text-xs font-medium opacity-60 hidden md:block">Visão completa da sua semana acadêmica.</p>
            </div>
        </div>

        {/* MOBILE DAY SELECTOR (Visible only on < lg) */}
        {!isDesktop && (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-4 px-4 shrink-0">
                {DAYS.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap
                            ${activeDay === day 
                                ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/25` 
                                : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50')}
                        `}
                    >
                        {day}
                    </button>
                ))}
            </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden pr-1">
            
            {/* DESKTOP: FULL WEEK COLUMNS */}
            {isDesktop ? (
                <div className="h-full grid grid-cols-5 gap-4">
                    {DAYS.map((day, idx) => {
                         const dayClasses = schedule.filter(c => c.day.includes(day));
                         const groupedClasses = groupConsecutiveClasses(dayClasses);
                         const isToday = (idx + 1) === todayIndex; // 1=Mon

                         return (
                             <div key={day} className={`h-full flex flex-col rounded-[2rem] border overflow-hidden relative ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50/50 border-gray-100'} ${isToday ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`}>
                                  {/* Column Header */}
                                  <div className={`p-4 text-center border-b ${isDark ? 'border-white/5' : 'border-gray-200/50'} ${isToday ? `bg-${accentColor}-500 text-white` : ''}`}>
                                      <h3 className={`text-xs font-black uppercase tracking-widest ${isToday ? 'text-white' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>{day}</h3>
                                  </div>
                                  
                                  {/* Classes Scroll Area */}
                                  <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2">
                                      {groupedClasses.map((c, i) => {
                                          const color = getSubjectColor(c.name);
                                          return (
                                              <div key={i} className={`p-3 rounded-2xl border-l-4 transition-all hover:scale-[1.02] group relative ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm hover:shadow-md'} border-${color}-500`}>
                                                   <div className="flex justify-between items-center mb-2">
                                                       <div className={`text-[10px] font-mono font-bold opacity-60 flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                                            {c.startTime} <ArrowRight size={8} /> {c.endTime}
                                                       </div>
                                                       {c.periods > 1 && (
                                                           <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-${color}-500/10 text-${color}-500`}>
                                                               <Layers size={10} /> {c.periods}x
                                                           </div>
                                                       )}
                                                   </div>
                                                   <p className={`text-xs font-bold leading-tight line-clamp-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.name}</p>
                                                   <div className="flex items-center gap-1 text-[9px] opacity-40 font-bold uppercase">
                                                       <MapPin size={10} /> {c.room}
                                                   </div>
                                              </div>
                                          )
                                      })}
                                      {groupedClasses.length === 0 && (
                                          <div className="h-full flex flex-col items-center justify-center opacity-20">
                                              <Coffee size={24} />
                                          </div>
                                      )}
                                  </div>
                             </div>
                         )
                    })}
                </div>
            ) : (
                /* MOBILE: SINGLE DAY VIEW */
                <div className="space-y-3">
                     {groupConsecutiveClasses(schedule.filter(c => c.day.includes(activeDay))).map((c, idx) => {
                         const color = getSubjectColor(c.name);
                         return (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={idx} 
                                className={`flex gap-4 p-4 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}
                            >
                                <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-dashed border-gray-500/20 pr-4">
                                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.startTime}</span>
                                    <div className={`w-[1px] h-3 my-0.5 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                                    <span className="text-[10px] opacity-50 font-bold">{c.endTime}</span>
                                </div>
                                
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className={`text-[9px] font-bold uppercase tracking-wide text-${color}-500`}>
                                            {c.periods > 1 ? `${c.periods} Aulas Seguidas` : 'Aula Regular'}
                                        </div>
                                        {c.periods > 1 && <Layers size={12} className={`text-${color}-500 opacity-50`} />}
                                    </div>
                                    
                                    <h3 className={`text-base font-bold leading-tight mb-2 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name}</h3>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                            <MapPin size={10} /> {c.room}
                                        </div>
                                        {c.professors[0] && (
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                <User size={10} /> {c.professors[0].split(' ')[0]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                         )
                     })}
                     {schedule.filter(c => c.day.includes(activeDay)).length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-30">
                             <Coffee size={48} className="mb-4" />
                             <span className="text-sm font-bold uppercase">Dia Livre</span>
                        </div>
                     )}
                </div>
            )}

        </div>
    </div>
  );
};