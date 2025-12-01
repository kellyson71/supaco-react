
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Trophy, ChevronLeft, ChevronRight as ChevronRightIcon, 
  ListTodo, Plus, ArrowRight, Check, Trash2, Book, CalendarDays, FastForward, Sparkles, Hourglass, MapPin
} from 'lucide-react';
import { InvertedCorner } from '../InvertedCorner';
import { TodoItem, ClassroomWork, Holiday, Achievement } from '../../types';

interface RightSidebarProps {
  rightTab: 'overview' | 'tasks' | 'holidays' | 'achievements';
  onRightTabChange: (tab: 'overview' | 'tasks' | 'holidays' | 'achievements') => void;
  isDarkMode: boolean;
  frameBg: string;
  frameText: string;
  cornerColor: string;
  primaryColor: string;
  showContent: boolean;
  // Data Props
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  holidays: Holiday[];
  classroomWork: ClassroomWork[];
  todos: TodoItem[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onRemoveTodo: (id: string) => void;
  unlockedAchievements: string[];
  onOpenProfile: () => void;
  schedule: any[]; // ProcessedClass[]
  // Calendar Logic passed down or implemented here? Let's implement rendering logic here using props
  getEventsForDate: (date: Date) => { classes: any[], holiday: any, tasks: any[] };
  days: (Date | null)[];
  MONTH_NAMES: string[];
  CURRENT_VERSION: string;
  setShowChangelog: (v: boolean) => void;
}

const CalendarTooltip = ({ date, x, y, events, isDarkMode, primaryColor }: any) => {
    if (x === undefined || y === undefined) return null;
    
    const { classes, holiday, tasks } = events;
    
    // Group classes by name to show summary (e.g. "2 Matemática")
    const groupedClasses = classes.reduce((acc: any[], curr: any) => {
        const existing = acc.find((c: any) => c.name === curr.name);
        if (existing) {
            existing.count += 1;
        } else {
            acc.push({ ...curr, count: 1 });
        }
        return acc;
    }, []);

    const hasEvents = groupedClasses.length > 0 || holiday || tasks.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-90%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-100%" }}
            exit={{ opacity: 0, scale: 0.8, x: "-50%", y: "-90%" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ 
                position: 'fixed', 
                top: y - 15,
                left: x,
                zIndex: 9999,
                pointerEvents: 'none'
            }}
            className={`p-3 rounded-xl shadow-xl backdrop-blur-md border min-w-[140px] max-w-[200px] flex flex-col gap-2 pointer-events-none
                ${isDarkMode ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-gray-100'}
            `}
        >
            <div className={`text-[9px] font-black uppercase tracking-widest pb-1.5 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                <span>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                <span>{date.getDate()}</span>
            </div>

            <div className="space-y-1">
                {holiday && (
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 mb-1">
                        <Sparkles size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold truncate">{holiday.name}</span>
                    </div>
                )}

                {groupedClasses.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {groupedClasses.map((group: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    {group.count === 1 && (
                                        <div className={`w-1 h-1 rounded-full shrink-0 bg-${primaryColor}-500`} />
                                    )}
                                    <span className={`text-[10px] font-bold truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {group.name}
                                    </span>
                                </div>
                                {group.count > 1 && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[4px] leading-none ${isDarkMode ? `bg-${primaryColor}-500/20 text-${primaryColor}-300` : `bg-${primaryColor}-100 text-${primaryColor}-700`}`}>
                                        {group.count}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : null}

                {tasks.length > 0 && (
                    <div className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed ${isDarkMode ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' : 'border-indigo-300 text-indigo-600 bg-indigo-50'}`}>
                        <Book size={10} />
                        <span className="text-[9px] font-bold">{tasks.length} Entregas</span>
                    </div>
                )}

                {!hasEvents && (
                    <div className="text-center py-1 opacity-30">
                        <span className="text-[9px] font-bold uppercase">Livre</span>
                    </div>
                )}
            </div>
            
            {/* Arrow Pointer */}
            <div 
                className={`absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-b border-r
                    ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'}
                `} 
            />
        </motion.div>
    );
};

export const RightSidebar: React.FC<RightSidebarProps> = ({
  rightTab, onRightTabChange, isDarkMode, frameBg, frameText, cornerColor, primaryColor, showContent,
  currentDate, setCurrentDate, holidays, classroomWork, todos, onAddTodo, onToggleTodo, onRemoveTodo,
  unlockedAchievements, onOpenProfile, days, getEventsForDate, MONTH_NAMES, CURRENT_VERSION, setShowChangelog
}) => {
  const [todoInput, setTodoInput] = useState('');
  const [hoveredDate, setHoveredDate] = useState<{ date: Date, x: number, y: number } | null>(null);
  
  // Time Warp State
  const [isTimeWarping, setIsTimeWarping] = useState(false);
  const [warpDays, setWarpDays] = useState(0);

  const handleAddTodoClick = () => {
    if (!todoInput.trim()) return;
    onAddTodo(todoInput);
    setTodoInput('');
  };

  const handleKeyDownTodo = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTodoClick();
  };

  const handleTimeSkip = () => {
      // Find next holiday
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const futureHolidays = holidays
        .map(h => ({ ...h, jsDate: new Date(h.date + 'T00:00:00') }))
        .filter(h => h.jsDate >= today)
        .sort((a, b) => a.jsDate.getTime() - b.jsDate.getTime());

      if (futureHolidays.length > 0) {
          const next = futureHolidays[0];
          const diffTime = Math.abs(next.jsDate.getTime() - today.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setWarpDays(diffDays);
          setIsTimeWarping(true);
          
          // Simulation
          setTimeout(() => {
              setIsTimeWarping(false);
          }, 4000);
      }
  };

  return (
    <div className={`hidden md:flex relative z-50 h-[calc(100vh-2rem)] my-4 w-[360px] flex-col p-8 transition-colors duration-500 ${frameBg}`}>
      <div className="absolute top-0 -left-[40px] w-[40px] h-[40px] z-50">
         <InvertedCorner position="top-right" size={40} fill={cornerColor} />
      </div>
      
      <div className="absolute bottom-0 -left-[40px] w-[40px] h-[40px] z-50">
         <InvertedCorner position="bottom-right" size={40} fill={cornerColor} />
      </div>

      {showContent ? (
         <motion.div 
            className="flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
         >
            <div className="flex flex-col gap-4 mb-6 shrink-0">
              
              {/* Tab Switcher */}
              <div className={`self-start relative flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                  {(['overview', 'tasks', 'holidays', 'achievements'] as const).map((tab) => (
                      <button 
                        key={tab}
                        onClick={() => onRightTabChange(tab)}
                        className={`relative z-10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors flex items-center justify-center ${rightTab === tab ? (isDarkMode ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
                        title={tab}
                    >
                        {tab === 'achievements' ? <Trophy size={14} /> : (
                            tab === 'overview' ? 'Hoje' : tab === 'tasks' ? 'Tarefas' : 'Feriados'
                        )}
                        {rightTab === tab && (
                            <motion.div 
                                layoutId="right-tab"
                                className={`absolute inset-0 rounded-full -z-10 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}
                            />
                        )}
                    </button>
                  ))}
              </div>

              {/* Title & Date */}
              <AnimatePresence mode="wait">
                  <motion.div 
                      key={rightTab}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex flex-col"
                  >
                      <h2 className={`text-3xl font-black leading-tight tracking-tight ${frameText}`}>
                          {rightTab === 'overview' ? 'Visão Geral' : rightTab === 'tasks' ? 'Tarefas' : rightTab === 'holidays' ? 'Feriados' : 'Conquistas'}
                      </h2>
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full bg-${primaryColor}-500`} />
                          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                  </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar Content */}
            <div 
                className="flex-1 relative overflow-hidden flex flex-col custom-scroll overflow-y-auto"
                onScroll={() => setHoveredDate(null)}
            >
              <AnimatePresence mode="wait">
                  {rightTab === 'overview' && (
                      <motion.div 
                          key="overview"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="h-full flex flex-col gap-4"
                      >
                          {/* CALENDAR WIDGET */}
                          <div className={`rounded-[2rem] border p-6 relative flex flex-col shadow-sm transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-4">
                                  <span className={`text-lg font-black capitalize ${frameText}`}>
                                      {MONTH_NAMES[currentDate.getMonth()]} <span className="text-gray-500">{currentDate.getFullYear()}</span>
                                  </span>
                                  <div className="flex gap-1">
                                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                                          <ChevronLeft size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                      </button>
                                      <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                                          <ChevronRightIcon size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                                      </button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-7 gap-2 mb-2">
                                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                      <div key={i} className="text-center text-[10px] font-bold text-gray-500 uppercase">{d}</div>
                                  ))}
                              </div>
                              
                              <div 
                                  className="grid grid-cols-7 gap-2 flex-1 relative"
                                  onMouseLeave={() => setHoveredDate(null)}
                              >
                                  {days.map((day, i) => {
                                      if (!day) return <div key={i} />;
                                      
                                      const { classes, holiday, tasks } = getEventsForDate(day);
                                      const isToday = day.toDateString() === new Date().toDateString();
                                      
                                      return (
                                          <div 
                                              key={i}
                                              onMouseEnter={(e) => setHoveredDate({ date: day, x: e.clientX, y: e.clientY })}
                                              onMouseMove={(e) => setHoveredDate({ date: day, x: e.clientX, y: e.clientY })}
                                              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300 group
                                                  ${isToday 
                                                      ? `bg-${primaryColor}-500 text-white shadow-lg shadow-${primaryColor}-500/30 scale-110 z-10` 
                                                      : (isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                                  }
                                                  ${holiday ? (isToday ? '' : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500')) : ''}
                                              `}
                                          >
                                              <span className="text-xs font-bold">{day.getDate()}</span>
                                              <div className="flex gap-0.5 mt-0.5 h-1">
                                                  {holiday && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-red-500'}`} />}
                                                  {!holiday && classes.length > 0 && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : `bg-${primaryColor}-400`}`} />}
                                                  {tasks.length > 0 && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : `bg-${primaryColor}-300`}`} />}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                        
                          {/* TODO LIST */}
                          <div className={`rounded-[2rem] border p-5 flex flex-col flex-1 shadow-sm transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-3">
                                  <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <ListTodo size={14} /> Tarefas
                                  </h3>
                                  <span className="text-[10px] font-bold opacity-50">{todos.filter(t => !t.completed).length} pendentes</span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-3 bg-gray-50 dark:bg-black/20 p-2 rounded-xl border border-gray-200 dark:border-white/5">
                                  <Plus size={16} className="text-gray-400" />
                                  <input 
                                      type="text" 
                                      value={todoInput}
                                      onChange={(e) => setTodoInput(e.target.value)}
                                      onKeyDown={handleKeyDownTodo}
                                      placeholder="Nova tarefa..."
                                      className={`bg-transparent outline-none text-xs font-bold w-full ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-800 placeholder:text-gray-400'}`}
                                  />
                                  <button onClick={handleAddTodoClick} className={`p-1.5 rounded-lg transition-colors ${todoInput.trim() ? `bg-${primaryColor}-500 text-white` : 'bg-transparent text-gray-400'}`}>
                                      <ArrowRight size={14} />
                                  </button>
                              </div>

                              <div className="flex-1 overflow-y-auto custom-scroll space-y-2 max-h-[150px]">
                                  {todos.length === 0 ? (
                                      <div className="text-center py-6 opacity-40 text-xs font-bold">Sem tarefas.</div>
                                  ) : (
                                      todos.map((todo) => (
                                          <div key={todo.id} className="flex items-center gap-3 group">
                                              <button 
                                                  onClick={() => onToggleTodo?.(todo.id)}
                                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${todo.completed ? `bg-${primaryColor}-500 border-${primaryColor}-500 text-white` : (isDarkMode ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-400')}`}
                                              >
                                                  {todo.completed && <Check size={12} />}
                                              </button>
                                              <span className={`text-xs font-medium flex-1 truncate transition-all ${todo.completed ? 'opacity-40 line-through' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                                                  {todo.text}
                                              </span>
                                              <button onClick={() => onRemoveTodo?.(todo.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 hover:text-red-500 rounded">
                                                  <Trash2 size={12} />
                                              </button>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  )}

                  {rightTab === 'tasks' && (
                      <motion.div 
                        key="tasks"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full flex flex-col gap-3"
                      >
                        {classroomWork.length > 0 ? (
                            classroomWork.map((work) => (
                                <div key={work.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60`}>{work.courseName}</span>
                                        <span className={`text-[10px] font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>
                                            {work.jsDate?.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                        </span>
                                    </div>
                                    <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{work.title}</h4>
                                    <a href={work.alternateLink} target="_blank" rel="noopener" className="text-[10px] font-bold underline opacity-50 hover:opacity-100 mt-2 block">Abrir no Classroom</a>
                                </div>
                            ))
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center">
                                <Book size={32} className="mb-2" />
                                <p className="text-xs font-bold">Nenhuma tarefa pendente.</p>
                            </div>
                        )}
                      </motion.div>
                  )}

                  {rightTab === 'holidays' && (
                      <motion.div 
                        key="holidays"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full flex flex-col relative"
                      >
                        {/* Time Warp Overlay */}
                        <AnimatePresence>
                            {isTimeWarping && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[2rem] text-center p-6 backdrop-blur-xl ${isDarkMode ? 'bg-black/80' : 'bg-white/90'}`}
                                >
                                    <div className={`relative mb-6`}>
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className={`absolute inset-[-10px] rounded-full border-2 border-dashed ${isDarkMode ? `border-${primaryColor}-500` : 'border-black'}`}
                                        />
                                        <Hourglass size={48} className={isDarkMode ? `text-${primaryColor}-400` : 'text-black'} />
                                    </div>
                                    <motion.h3 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className={`text-lg font-black uppercase mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}
                                    >
                                        Distorção Temporal
                                    </motion.h3>
                                    <motion.p 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-xs font-mono opacity-70"
                                    >
                                        carregando distorcao do tempo, tempo estimado: {warpDays} dias
                                    </motion.p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Feature Button */}
                        {holidays.length > 0 && (
                            <button 
                                onClick={handleTimeSkip}
                                className={`w-full mb-4 p-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all
                                    ${isDarkMode 
                                        ? `bg-gradient-to-r from-${primaryColor}-900/20 to-${primaryColor}-500/10 border border-${primaryColor}-500/20 hover:border-${primaryColor}-500/50 text-${primaryColor}-200` 
                                        : `bg-${primaryColor}-50 text-${primaryColor}-700 hover:bg-${primaryColor}-100`
                                    }
                                `}
                            >
                                <FastForward size={14} /> Pular pra Feriados
                            </button>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scroll space-y-3">
                            {holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 10).map((h, i) => (
                                <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        <CalendarDays size={18} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{h.name}</div>
                                        <div className="text-[10px] font-medium opacity-50">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                                    </div>
                                </div>
                            ))}
                            {holidays.length === 0 && <p className="text-center text-xs opacity-50 mt-10">Sem feriados próximos.</p>}
                        </div>
                      </motion.div>
                  )}

                  {rightTab === 'achievements' && (
                    <motion.div 
                        key="achievements"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="h-full flex flex-col gap-3"
                    >
                        <div className={`p-6 rounded-[2rem] border text-center ${isDarkMode ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                            <Trophy size={32} className={`mx-auto mb-2 text-${primaryColor}-500`} />
                            <div className="text-2xl font-black">{unlockedAchievements.length}</div>
                            <div className="text-[10px] font-bold uppercase opacity-50">Conquistas Desbloqueadas</div>
                        </div>
                        
                        <div className="text-center mt-4">
                            <p className="text-xs opacity-50">Veja todas as conquistas no seu Perfil.</p>
                            <button onClick={onOpenProfile} className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold uppercase ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                Ir para Perfil
                            </button>
                        </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* VERSION FOOTER */}
            <div className="mt-4 pt-4 border-t border-dashed border-gray-500/10 flex justify-between items-center opacity-50 hover:opacity-100 transition-opacity">
                <button onClick={() => setShowChangelog(true)} className="flex items-center gap-2 text-[10px] font-mono font-bold hover:text-blue-500 transition-colors">
                    <span>v2.6.0</span>
                </button>
                <div className="text-[10px] font-bold">Electron</div>
            </div>

            <AnimatePresence>
                {hoveredDate && (
                    <CalendarTooltip 
                        key="calendar-tooltip" // Keeps tooltip mounted for fluid animations
                        date={hoveredDate.date} 
                        x={hoveredDate.x}
                        y={hoveredDate.y}
                        events={getEventsForDate(hoveredDate.date)}
                        isDarkMode={isDarkMode}
                        primaryColor={primaryColor}
                    />
                )}
            </AnimatePresence>

         </motion.div>
      ) : (
         <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
             <Trophy size={48} className="mb-4" />
             <p className="text-sm font-bold max-w-[200px]">Faça login para ver seu resumo diário.</p>
         </div>
      )}
    </div>
  );
};
