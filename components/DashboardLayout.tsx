
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  BookOpen, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  ChevronRight,
  ArrowLeft,
  Clock,
  GraduationCap,
  MapPin,
  Moon,
  Sun,
  Copy,
  Bell,
  ListTodo,
  CheckSquare,
  Layout,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  CheckCircle,
  Lock,
  ArrowRight,
  User,
  AlertCircle,
  Flag,
  PartyPopper,
  CalendarDays,
  Coffee,
  Palmtree,
  ChevronLeft, 
  ChevronRight as ChevronRightIcon,
  CalendarRange
} from 'lucide-react';
import { InvertedCorner } from './InvertedCorner';
import { ViewState, ClassroomWork, SuapProfile, SuapPeriod, GradeInfo, ProcessedClass, SuapCompletionData, Holiday } from '../types';
import { AIChatWidget } from './AIChatWidget';

// -- Constants --
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// Theme Colors
const LIGHT_FRAME = 'bg-white';
const DARK_FRAME = 'bg-slate-950';
const LIGHT_CORNER = 'white';
const DARK_CORNER = '#020617'; // slate-950 hex

interface DashboardProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  currentWallpaper: string;
  primaryColor: string;   // Replaces Green (Success)
  secondaryColor: string; // Replaces Red (Warning)
  isLoggedIn: boolean;
  onLogin: () => void;
  userData: SuapProfile | null;
  currentPeriod: SuapPeriod | null;
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  completionData?: SuapCompletionData | null;
  holidays?: Holiday[];
}

interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

// --- CALENDAR HELPERS ---
const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const DashboardLayout: React.FC<DashboardProps> = ({ 
  currentView, 
  onChangeView, 
  isDarkMode, 
  onToggleTheme,
  currentWallpaper,
  primaryColor,
  secondaryColor,
  isLoggedIn,
  onLogin,
  userData,
  currentPeriod,
  grades,
  schedule,
  completionData,
  holidays = []
}) => {
  const [activeNav, setActiveNav] = useState<ViewState>(ViewState.DASHBOARD);
  const [rightTab, setRightTab] = useState<'overview' | 'mural' | 'holidays'>('overview');
  
  // ToDo List State
  const [todoInput, setTodoInput] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>([
      { id: '1', text: 'Organizar diretório do projeto', completed: false },
      { id: '2', text: 'Revisar anotações de POO', completed: true },
  ]);

  // Calculated States
  const [bestSubjectToSkip, setBestSubjectToSkip] = useState<GradeInfo | null>(null);
  const [nextClass, setNextClass] = useState<ProcessedClass | null>(null);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<{ date: Date, rect: DOMRect } | null>(null);

  useEffect(() => {
    setActiveNav(currentView);
  }, [currentView]);

  // Calculate "Pode Faltar" Logic and Schedule
  useEffect(() => {
      if (grades.length > 0) {
          const sorted = [...grades].sort((a, b) => {
              const remainingA = a.limit - a.absences;
              const remainingB = b.limit - b.absences;
              return remainingA - remainingB; 
          });
          const bottleneck = sorted[0]; 
          setBestSubjectToSkip(bottleneck);
      }

      if (schedule.length > 0) {
          const todayInt = new Date().getDay() + 1; 
          const todayClasses = schedule.filter(c => c.dayInt === todayInt);
          const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
          
          // Find next class today
          const upcoming = todayClasses.find(c => {
              const [h, m] = c.startTime.split(':').map(Number);
              return (h * 60 + m) > nowMinutes;
          });

          if (upcoming) setNextClass(upcoming);
          else if (todayClasses.length > 0 && nowMinutes < (8 * 60)) setNextClass(todayClasses[0]); // Early morning
      }
  }, [grades, schedule]);

  // Holiday Logic Helper
  const parseDateLocal = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
  };

  const upcomingHoliday = useMemo(() => {
      if (!holidays.length) return null;
      const today = new Date();
      today.setHours(0,0,0,0);

      const future = holidays.map(h => {
          const hDate = parseDateLocal(h.date);
          const diffTime = hDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...h, diffDays, jsDate: hDate };
      }).filter(h => h.diffDays >= 0).sort((a, b) => a.diffDays - b.diffDays);

      if (future.length > 0) return future[0];
      return null;
  }, [holidays]);

  const isTodayHoliday = upcomingHoliday?.diffDays === 0;

  const handleNavClick = (view: ViewState) => {
    setActiveNav(view);
    onChangeView(view);
  };

  const handleCopyMatricula = () => {
    if (userData?.matricula) {
        navigator.clipboard.writeText(userData.matricula);
    }
  };

  // ToDo Handlers
  const handleAddTodo = () => {
      if (!todoInput.trim()) return;
      const newTodo: TodoItem = {
          id: Date.now().toString(),
          text: todoInput,
          completed: false
      };
      setTodos([newTodo, ...todos]);
      setTodoInput('');
  };

  const handleToggleTodo = (id: string) => {
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTodo = (id: string) => {
      setTodos(todos.filter(t => t.id !== id));
  };

  const handleKeyDownTodo = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddTodo();
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    
    const days = [];
    // Add padding for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);

  const getEventsForDate = (date: Date) => {
      if (!date) return { classes: [], holiday: null };
      
      // Robust date string for comparison YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // 1. Check Holiday
      const holiday = holidays.find(h => h.date === dateStr);
      
      // 2. Check Classes (Day of Week)
      // SUAP uses 2=Mon, 3=Tue ... 
      // date.getDay() returns 0=Sun, 1=Mon
      const dayOfWeekInt = date.getDay() + 1;
      const classes = schedule.filter(s => s.dayInt === dayOfWeekInt);

      return { classes, holiday };
  };

  const frameBg = isDarkMode ? DARK_FRAME : LIGHT_FRAME;
  const frameText = isDarkMode ? 'text-white' : 'text-gray-900';
  const cornerColor = isDarkMode ? DARK_CORNER : LIGHT_CORNER;

  const userPhoto = userData?.foto 
      ? (userData.foto.startsWith('http') ? userData.foto : `https://suap.ifrn.edu.br${userData.foto}`)
      : DEFAULT_PROFILE_IMG;

  return (
    <div className={`relative w-full h-screen overflow-hidden flex font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}>
      
      {/* --- LOGIN OVERLAY --- */}
      <AnimatePresence>
        {!isLoggedIn && (
          <LoginModal 
             isDarkMode={isDarkMode} 
             primaryColor={primaryColor} 
             onLogin={onLogin} 
          />
        )}
      </AnimatePresence>

      {/* --- BACKGROUND LAYER --- */}
      <div 
        className="absolute inset-0 z-0 bg-no-repeat transition-transform duration-1000 ease-out"
        style={{ 
            backgroundImage: `url(${currentWallpaper})`,
            backgroundSize: 'cover', 
            backgroundPosition: 'center center', 
        }}
      />

      {/* --- FRAME ELEMENTS --- */}
      <div className={`absolute top-0 inset-x-0 h-4 z-50 transition-colors duration-500 ${frameBg}`} />
      <div className={`absolute bottom-0 inset-x-0 h-4 z-40 transition-colors duration-500 ${frameBg}`} />

      {/* 1. LEFT SIDEBAR */}
      <div className={`relative z-50 h-[calc(100vh-2rem)] my-4 w-24 flex flex-col items-center py-8 transition-colors duration-500 ${frameBg}`}>
        <div className="text-xs font-black tracking-widest mb-1 text-gray-400">ELECTRON</div>
        <div className={`text-xl font-black italic mb-10 transition-colors duration-500 ${frameText}`}>SUPACO</div>
        
        <nav className="flex flex-col gap-6 w-full items-center flex-1">
          <NavItem isDark={isDarkMode} icon={<Home />} active={activeNav === ViewState.DASHBOARD} onClick={() => handleNavClick(ViewState.DASHBOARD)} label="Dash" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<BookOpen />} active={activeNav === ViewState.GRADES} onClick={() => handleNavClick(ViewState.GRADES)} label="Notas" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<AlertTriangle />} active={activeNav === ViewState.ABSENCES} onClick={() => handleNavClick(ViewState.ABSENCES)} label="Faltas" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<CalendarIcon />} active={activeNav === ViewState.SCHEDULE} onClick={() => handleNavClick(ViewState.SCHEDULE)} label="Horário" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<Flag />} active={activeNav === ViewState.CONCLUSION} onClick={() => handleNavClick(ViewState.CONCLUSION)} label="Conclusão" activeColor={primaryColor} />
        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center">
           <button 
             onClick={onToggleTheme}
             className={`w-10 h-16 rounded-full border flex flex-col items-center justify-between p-1 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-200'}`}
           >
             <motion.div 
               className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-orange-400'}`}
               layout
               transition={{ type: "spring", stiffness: 700, damping: 30 }}
               style={{ y: isDarkMode ? 24 : 0 }}
             >
                {isDarkMode ? <Moon size={16} fill="currentColor" /> : <Sun size={16} fill="currentColor" />}
             </motion.div>
           </button>

           <button 
             onClick={() => handleNavClick(ViewState.PROFILE)}
             className={`w-10 h-10 rounded-full overflow-hidden border-2 p-0.5 hover:scale-110 transition-transform ${activeNav === ViewState.PROFILE ? `border-${primaryColor}-500 scale-110` : 'border-transparent'}`}
            >
              <img src={userPhoto} className="w-full h-full rounded-full object-cover" alt="Profile" />
           </button>
        </div>

        <div className="absolute top-0 -right-[40px] w-[40px] h-[40px] z-50">
             <InvertedCorner position="top-left" size={40} fill={cornerColor} />
        </div>
      </div>

      {/* 2. CENTER CONTENT AREA */}
      <div className="flex-1 h-full flex flex-col relative">
        
        {/* --- FLOATING HOLIDAY NOTIFICATION (Top Left - Subtle) --- */}
        <AnimatePresence>
            {isLoggedIn && upcomingHoliday && upcomingHoliday.diffDays <= 3 && (
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className={`absolute top-28 left-8 z-[70] pr-6 pl-2 py-2 rounded-2xl backdrop-blur-md border shadow-sm flex items-center gap-4 overflow-hidden group cursor-default transition-colors
                        ${isTodayHoliday
                            ? `bg-${primaryColor}-500/80 border-${primaryColor}-400 text-white shadow-${primaryColor}-500/20`
                            : (isDarkMode ? `bg-slate-900/60 border-white/10 text-white` : `bg-white/60 border-white/40 text-gray-900`)
                        }
                    `}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm relative
                         ${isTodayHoliday 
                            ? 'bg-white text-black' 
                            : (isDarkMode ? `bg-${primaryColor}-500/20 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-600`)
                         }`}
                    >
                        {isTodayHoliday ? <PartyPopper size={18} /> : <Palmtree size={18} />}
                    </div>
                    
                    <div className="flex flex-col">
                         <div className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isTodayHoliday ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {isTodayHoliday ? 'É hoje!' : `Em ${upcomingHoliday.diffDays} ${upcomingHoliday.diffDays === 1 ? 'dia' : 'dias'}`}
                         </div>
                         <div className="text-sm font-black leading-none">
                            {upcomingHoliday.name}
                         </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Top Navigation Notch */}
        <div className="flex-1 relative">
           <motion.div 
             initial={{ y: -150 }}
             animate={{ y: isLoggedIn ? 0 : -150 }}
             transition={{ type: 'spring', stiffness: 60, damping: 15, delay: isLoggedIn ? 0.2 : 0 }}
             className={`absolute top-0 left-1/2 -translate-x-1/2 mt-8 backdrop-blur-xl h-14 pl-2 pr-6 rounded-full flex items-center gap-4 shadow-lg z-[60] border transition-colors duration-500
                ${isDarkMode ? 'bg-slate-950/80 border-white/10' : 'bg-white/90 border-white/40'}
             `}
           >
              <button 
                onClick={() => handleNavClick(ViewState.DASHBOARD)}
                className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center group ${isDarkMode ? 'bg-white/10 text-white hover:bg-white hover:text-black' : 'bg-gray-100 hover:bg-black hover:text-white'}`}
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
              
              <TopBarItem 
                icon={<GraduationCap size={14} />}
                label={`${currentPeriod?.ano_letivo || '2025'}.${currentPeriod?.periodo_letivo || '1'}`} 
                indicator
                indicatorColor={primaryColor}
                isDark={isDarkMode}
              />

              <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
              
              <TopBarItem 
                icon={<Flag size={14} />}
                label={completionData ? `${completionData.percentual_cumprida}%` : '--%'}
                isDark={isDarkMode}
              />

              <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />

              <TopBarItem 
                label={nextClass ? `PRÓX: ${nextClass.name.split(' ').slice(0,2).join(' ')}` : "Sem mais aulas"}
                rightIcon={<ChevronRight size={14} />}
                isDark={isDarkMode}
              />
           </motion.div>

           {/* Main Student ID Card */}
           <div className="absolute bottom-[300px] left-0 pl-6 z-20">
                <motion.div 
                    initial={{ opacity: 0, x: -320 }}
                    animate={{ opacity: isLoggedIn ? 1 : 0, x: isLoggedIn ? 0 : -320 }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15, delay: isLoggedIn ? 0.4 : 0 }}
                    className="relative inline-block p-6 pr-6 rounded-[2rem] overflow-hidden w-[298px]"
                >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem]" />
                    <div className="relative z-10">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1 block">
                                {userData?.nome_usual || "Estudante"}
                            </span>
                            <h1 className="text-2xl font-black text-white tracking-tighter leading-[1] mb-1 drop-shadow-lg uppercase">
                                {userData?.vinculo?.curso?.split(' ').slice(0, 3).join(' ') || "CURSO"}
                            </h1>
                            <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium mt-1">
                                <MapPin size={12} />
                                <span>{userData?.campus || "Campus"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={`px-2.5 py-1.5 bg-${primaryColor}-500/20 border border-${primaryColor}-400/30 rounded-full flex items-center gap-2`}>
                                <span className="relative flex h-2 w-2">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${primaryColor}-400 opacity-75`}></span>
                                  <span className={`relative inline-flex rounded-full h-2 w-2 bg-${primaryColor}-500`}></span>
                                </span>
                                <span className={`text-[9px] font-bold text-${primaryColor}-100 uppercase tracking-wide`}>Matriculado</span>
                            </div>

                            <button 
                                onClick={handleCopyMatricula}
                                className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <span className="text-[9px] font-bold text-white/40 uppercase">Mat.</span>
                                <span className="font-mono text-xs font-bold text-white/90 tracking-wider border-b border-white/10 group-hover:border-white/50 transition-colors">
                                    {userData?.matricula || "---"}
                                </span>
                                <Copy size={12} className="text-white/40 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                            <div className="px-2">
                                <span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Média Geral</span>
                                <span className="text-lg font-black text-white">
                                    {userData?.vinculo?.matricula ? "7.5" : "-"}
                                </span>
                            </div>
                            <div className="w-[1px] h-8 bg-white/10"></div>
                            <div className="px-2">
                                <span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Frequência</span>
                                <span className={`text-lg font-black text-${primaryColor}-400`}>
                                    90%
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
           </div>

           {/* INTEGRATED CARD BLOCK (Bottom Left) - 'Pode Faltar' */}
           <motion.div 
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: isLoggedIn ? 0 : -350, opacity: isLoggedIn ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 60, damping: 15, delay: isLoggedIn ? 0.6 : 0 }}
              className="absolute bottom-4 left-0 z-[60]"
           >
               <div className="absolute -top-[40px] left-0 w-[40px] h-[40px]">
                   <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
               </div>

               <div className={`w-[322px] h-[260px] rounded-tr-[40px] p-6 pb-10 relative transition-colors duration-500 ${frameBg}`}>
                   {/* 'Pode Faltar' Card Content */}
                   <div className={`rounded-[2rem] p-6 border h-full flex flex-col justify-between group hover:shadow-lg transition-all duration-300 relative overflow-hidden
                      ${isTodayHoliday 
                         ? (isDarkMode ? `bg-indigo-950/30 border-indigo-900/50` : `bg-indigo-50 border-indigo-100`)
                         : (isDarkMode ? `bg-${primaryColor}-950/30 border-${primaryColor}-900/50` : `bg-${primaryColor}-50 border-${primaryColor}-100`)
                      }
                   `}>
                      {isTodayHoliday ? (
                          // HOLIDAY STATE
                          <>
                             <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-200/50'}`} />
                             <div className="flex justify-between items-start relative z-10">
                                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-200 text-indigo-800'}`}>
                                    Status
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                                    <Coffee size={16} className={`text-indigo-600`} />
                                </div>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className={`text-3xl font-black mb-1 leading-tight ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                    RELAXA! <br/> É FERIADO.
                                </div>
                                <div className={`text-xs font-medium mt-2 leading-snug ${isDarkMode ? 'text-indigo-300/70' : 'text-indigo-600'}`}>
                                    Aproveite o dia de folga: <b>{upcomingHoliday?.name}</b>.
                                </div>
                            </div>
                          </>
                      ) : bestSubjectToSkip ? (
                          // NORMAL STATE
                          <>
                            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? `bg-${primaryColor}-500/20` : `bg-${primaryColor}-200/50`}`} />
                            <div className="flex justify-between items-start relative z-10">
                                <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? `bg-${primaryColor}-900 text-${primaryColor}-300` : `bg-${primaryColor}-200 text-${primaryColor}-800`}`}>
                                    Status
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-white/10' : 'bg-white'}`}>
                                    <CheckCircle size={16} className={`text-${primaryColor}-600`} />
                                </div>
                            </div>
                            <div className="relative z-10 mt-2">
                                <div className={`text-3xl font-black mb-1 leading-tight ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-700`}`}>
                                    PODE <br/>FALTAR
                                </div>
                                <div className={`text-xs font-medium mt-2 leading-snug ${isDarkMode ? `text-${primaryColor}-300/70` : `text-${primaryColor}-600`}`}>
                                    Você pode faltar em <b>{bestSubjectToSkip.subject}</b> sem reprovar.
                                </div>
                            </div>
                            <div className="flex items-end gap-2 mt-1 relative z-10">
                                <div className={`text-4xl font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-800`}`}>
                                    {bestSubjectToSkip.limit - bestSubjectToSkip.absences}
                                </div>
                                <div className={`text-xs font-bold mb-2 ${isDarkMode ? `text-${primaryColor}-500` : `text-${primaryColor}-600`}`}>
                                    Aulas restantes
                                </div>
                            </div>
                          </>
                      ) : (
                           <div className="flex items-center justify-center h-full text-center opacity-50">
                               <p className="text-xs font-bold">Carregando...</p>
                           </div>
                      )}
                   </div>
               </div>

               <div className="absolute bottom-0 -right-[40px] w-[40px] h-[40px]">
                   <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
               </div>
           </motion.div>

           {/* AI CHAT WIDGET */}
           <AnimatePresence>
            {isLoggedIn && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute bottom-10 left-[322px] right-0 z-[70] flex justify-center items-end pointer-events-none"
              >
                  <div className="pointer-events-auto">
                      <AIChatWidget 
                        isDarkMode={isDarkMode} 
                        accentColor={primaryColor} 
                        userData={userData}
                        grades={grades}
                        schedule={schedule}
                        holidays={holidays}
                      />
                  </div>
              </motion.div>
            )}
           </AnimatePresence>

        </div>
      </div>

      {/* 3. RIGHT SIDEBAR - CONTENT */}
      <div className={`relative z-50 h-[calc(100vh-2rem)] my-4 w-[360px] flex flex-col p-8 transition-colors duration-500 ${frameBg}`}>
          
          <div className="absolute top-0 -left-[40px] w-[40px] h-[40px] z-50">
             <InvertedCorner position="top-right" size={40} fill={cornerColor} />
          </div>
          
          <div className="absolute bottom-0 -left-[40px] w-[40px] h-[40px] z-50">
             <InvertedCorner position="bottom-right" size={40} fill={cornerColor} />
          </div>

          {isLoggedIn ? (
             <motion.div 
                className="flex flex-col h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
             >
                <div className="flex justify-between items-start mb-6 pt-2 h-12 shrink-0">
                  <AnimatePresence mode="wait">
                      <motion.div 
                          key={rightTab}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="flex flex-col"
                      >
                          <h2 className={`text-2xl font-bold leading-none ${frameText}`}>
                              {rightTab === 'overview' ? 'Hoje' : rightTab === 'mural' ? 'Mural' : 'Feriados'}
                          </h2>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
                              <Clock size={12} /> <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                      </motion.div>
                  </AnimatePresence>

                  {/* Tab Switcher */}
                  <div className={`relative flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                      {(['overview', 'mural', 'holidays'] as const).map((tab) => (
                          <button 
                            key={tab}
                            onClick={() => setRightTab(tab)}
                            className={`relative z-10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors ${rightTab === tab ? (isDarkMode ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
                        >
                            {tab === 'overview' ? 'Hoje' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {rightTab === tab && (
                                <motion.div 
                                    layoutId="right-tab"
                                    className={`absolute inset-0 rounded-full -z-10 ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}
                                />
                            )}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                  <AnimatePresence mode="wait">
                      {rightTab === 'overview' ? (
                          <motion.div 
                              key="overview"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="h-full flex flex-col gap-4"
                          >
                              {/* CALENDAR WIDGET - Main Item */}
                              <div className={`rounded-[2rem] border p-6 relative flex flex-col shadow-sm transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                                  {/* Calendar Header */}
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

                                  {/* Calendar Grid */}
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
                                          if (!day) return <div key={i} onMouseEnter={() => setHoveredDate(null)} />;
                                          
                                          const { classes, holiday } = getEventsForDate(day);
                                          const isToday = day.toDateString() === new Date().toDateString();
                                          
                                          return (
                                              <div 
                                                  key={i}
                                                  onMouseEnter={(e) => {
                                                      setHoveredDate({ 
                                                          date: day, 
                                                          rect: e.currentTarget.getBoundingClientRect()
                                                      });
                                                  }}
                                                  className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300 group
                                                      ${isToday 
                                                          ? `bg-${primaryColor}-500 text-white shadow-lg shadow-${primaryColor}-500/30 scale-110 z-10` 
                                                          : (isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                                      }
                                                      ${holiday ? (isToday ? '' : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500')) : ''}
                                                  `}
                                              >
                                                  <span className="text-xs font-bold">{day.getDate()}</span>
                                                  
                                                  {/* Dot Indicators */}
                                                  <div className="flex gap-0.5 mt-0.5 h-1">
                                                      {holiday && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-red-500'}`} />}
                                                      {!holiday && classes.length > 0 && <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : `bg-${primaryColor}-400`}`} />}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>

                              {/* HOVER CARD POPUP (Fixed Position) */}
                              <AnimatePresence>
                                  {hoveredDate && (
                                      <motion.div 
                                          initial={{ opacity: 0, scale: 0.8, y: -5 }}
                                          animate={{ 
                                              opacity: 1, 
                                              scale: 1, 
                                              top: hoveredDate.rect.top - 12, 
                                              left: hoveredDate.rect.left + (hoveredDate.rect.width / 2),
                                              y: '-100%', // Move above
                                              x: '-50%' 
                                          }}
                                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                                          transition={{ 
                                              type: 'spring', 
                                              damping: 25, 
                                              stiffness: 300,
                                              mass: 0.8
                                          }}
                                          style={{ position: 'fixed', zIndex: 100, pointerEvents: 'none' }}
                                          className={`min-w-[180px] max-w-[240px] rounded-2xl p-4 shadow-xl border backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-gray-200'}`}
                                      >
                                          <div key={hoveredDate.date.toString()}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <div>
                                                      <div className="text-[10px] font-bold text-gray-400 uppercase">
                                                          {DAYS_OF_WEEK[hoveredDate.date.getDay()]}
                                                      </div>
                                                      <div className={`text-lg font-black ${frameText}`}>
                                                          {hoveredDate.date.getDate()} de {MONTH_NAMES[hoveredDate.date.getMonth()]}
                                                      </div>
                                                  </div>
                                                  {getEventsForDate(hoveredDate.date).holiday ? (
                                                      <div className="bg-red-500/10 text-red-500 p-1.5 rounded-lg">
                                                          <PartyPopper size={16} />
                                                      </div>
                                                  ) : getEventsForDate(hoveredDate.date).classes.length > 0 && (
                                                      <div className={`bg-${primaryColor}-500/10 text-${primaryColor}-500 p-1.5 rounded-lg`}>
                                                          <BookOpen size={16} />
                                                      </div>
                                                  )}
                                              </div>

                                              <div className="space-y-2">
                                                  {getEventsForDate(hoveredDate.date).holiday && (
                                                      <div className="text-xs font-bold text-red-500 bg-red-500/5 p-2 rounded-lg">
                                                          {getEventsForDate(hoveredDate.date).holiday?.name}
                                                      </div>
                                                  )}
                                                  
                                                  {getEventsForDate(hoveredDate.date).classes.length > 0 ? (
                                                      <div className="space-y-1">
                                                          {getEventsForDate(hoveredDate.date).classes.map((c, idx) => (
                                                              <div key={idx} className="flex justify-between text-xs">
                                                                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{c.name.substring(0, 20)}...</span>
                                                                  <span className="font-bold text-gray-400">{c.startTime}</span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  ) : !getEventsForDate(hoveredDate.date).holiday && (
                                                      <div className="text-xs text-gray-400 italic">Sem eventos</div>
                                                  )}
                                              </div>
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>

                              {/* Secondary List (Tasks) - Takes Remaining Space */}
                              <div className={`flex-1 rounded-[2rem] border p-5 flex flex-col overflow-hidden min-h-[120px] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                       <ListTodo size={12} /> Próximas Tarefas
                                   </h3>
                                   <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1">
                                       {todos.length > 0 ? todos.slice(0,3).map(todo => (
                                           <div key={todo.id} onClick={() => handleToggleTodo(todo.id)} className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${todo.completed ? 'opacity-50' : ''} ${isDarkMode ? 'bg-black/20 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                                               <div className={`w-3 h-3 rounded border flex items-center justify-center ${todo.completed ? `bg-${primaryColor}-500 border-${primaryColor}-500` : 'border-gray-400'}`}>
                                                   {todo.completed && <Check size={8} className="text-white" />}
                                               </div>
                                               <span className={`text-xs font-medium truncate ${todo.completed ? 'line-through' : ''} ${frameText}`}>{todo.text}</span>
                                           </div>
                                       )) : (
                                           <div className="text-center text-gray-500 text-xs py-4">Nenhuma tarefa.</div>
                                       )}
                                       <div className="mt-2 pt-2 border-t border-dashed border-gray-500/20 flex gap-2">
                                            <input 
                                                value={todoInput}
                                                onChange={(e) => setTodoInput(e.target.value)}
                                                onKeyDown={handleKeyDownTodo}
                                                placeholder="+ Nova"
                                                className="bg-transparent text-xs outline-none flex-1 text-gray-500"
                                            />
                                            <button onClick={handleAddTodo} disabled={!todoInput} className={`text-${primaryColor}-500 disabled:opacity-50`}>
                                                <Plus size={14} />
                                            </button>
                                       </div>
                                   </div>
                              </div>

                              {/* DISCRETE NEXT HOLIDAY WIDGET (Bottom) */}
                              {upcomingHoliday && (
                                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/5 text-white/50' : 'bg-gray-50 text-gray-400'}`}>
                                        <CalendarRange size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                                            Próximo Feriado
                                        </div>
                                        <div className={`text-xs font-bold truncate ${frameText}`}>
                                            {upcomingHoliday.name}
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        {new Date(upcomingHoliday.date + 'T00:00:00').getDate()}/{new Date(upcomingHoliday.date + 'T00:00:00').getMonth() + 1}
                                    </div>
                                </div>
                              )}
                          </motion.div>
                      ) : rightTab === 'mural' ? (
                          /* --- MURAL CONTENT (Placeholder for notifications/news) --- */
                          <motion.div key="mural" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center text-gray-500">
                               <div className="text-center">
                                   <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                   <p className="text-xs font-bold uppercase">Sem avisos novos</p>
                               </div>
                          </motion.div>
                      ) : (
                          /* --- HOLIDAYS LIST VIEW (Fallback/Full List) --- */
                           <motion.div 
                                key="holidays-list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full overflow-y-auto custom-scroll pr-2 space-y-3"
                           >
                               {holidays.map((h, i) => (
                                   <div key={i} className={`p-3 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                            <span className="text-xs font-black">{new Date(h.date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold truncate ${frameText}`}>{h.name}</div>
                                            <div className="text-[10px] text-gray-500">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long' })}</div>
                                        </div>
                                   </div>
                               ))}
                           </motion.div>
                      )}
                  </AnimatePresence>
                </div>
             </motion.div>
          ) : (
             /* --- EMPTY STATE FOR RIGHT SIDEBAR --- */
             <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                 <div className={`absolute w-48 h-48 rounded-full blur-3xl top-1/4 right-10 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/50'}`} />
                 <div className={`absolute w-64 h-64 rounded-full blur-3xl bottom-10 -left-10 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/50'}`} />
             </div>
          )}
      </div>

    </div>
  );
};

// --- LOGIN MODAL COMPONENT ---
const LoginModal: React.FC<{ isDarkMode: boolean, primaryColor: string, onLogin: () => void }> = ({ isDarkMode, primaryColor, onLogin }) => {
    const [mat, setMat] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mat || !pass) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            const response = await fetch('https://suap.ifrn.edu.br/api/token/pair', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: mat,
                    password: pass
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('suap_access_token', data.access);
                localStorage.setItem('suap_refresh_token', data.refresh);
                localStorage.setItem('suap_username', mat);
                onLogin();
            } else {
                setError('Matrícula ou senha incorretos.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão com o SUAP. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div 
           className="fixed inset-0 z-[100] flex items-center justify-center"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

            <motion.div 
               className={`relative w-full max-w-lg p-12 rounded-[2.5rem] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-white/40'} backdrop-blur-xl`}
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 1.05, opacity: 0, y: -20 }}
               transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full blur-[100px] opacity-30 bg-${primaryColor}-500`} />
                <div className={`absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-30 bg-${primaryColor}-500`} />
                
                <div className="relative z-10 text-center mb-10">
                    <div className="text-xs font-black tracking-widest mb-2 text-gray-400">ELECTRON</div>
                    <h2 className={`text-4xl font-black italic mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>SUPACO</h2>
                    <p className={`text-base leading-relaxed max-w-xs mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Bem-vindo ao Supaco Desktop. <br/>
                        Uma experiência acadêmica discreta.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div className="space-y-1">
                        <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-black/30 border-white/10 focus-within:border-white/30' : 'bg-white/50 border-gray-200 focus-within:border-gray-400'}`}>
                            <User size={20} className="text-gray-400" />
                            <input 
                                type="text" 
                                value={mat}
                                onChange={(e) => setMat(e.target.value)}
                                placeholder="Matrícula"
                                className={`bg-transparent outline-none text-base font-medium flex-1 ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-black/30 border-white/10 focus-within:border-white/30' : 'bg-white/50 border-gray-200 focus-within:border-gray-400'}`}>
                            <Lock size={20} className="text-gray-400" />
                            <input 
                                type="password" 
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                placeholder="Senha"
                                className={`bg-transparent outline-none text-base font-medium flex-1 ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20`}
                        >
                            <AlertCircle size={14} />
                            {error}
                        </motion.div>
                    )}

                    <button 
                        type="submit"
                        disabled={!mat || !pass || isLoading}
                        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all mt-2
                            ${!mat || !pass ? 'opacity-50 cursor-not-allowed bg-gray-500 text-white' : `bg-${primaryColor}-500 text-white hover:scale-[1.02] hover:shadow-xl hover:shadow-${primaryColor}-500/20`}
                        `}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Entrar
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <a href="#" className={`text-xs font-bold hover:underline ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Esqueci minha senha
                    </a>
                </div>
            </motion.div>
        </motion.div>
    );
};

const TopBarItem: React.FC<{ 
    label: string, 
    icon?: React.ReactNode, 
    rightIcon?: React.ReactNode,
    indicator?: boolean,
    indicatorColor?: string,
    children?: React.ReactNode,
    isDark?: boolean
}> = ({ label, icon, rightIcon, indicator, indicatorColor, children, isDark }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div 
            className="relative h-full flex items-center"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button 
                className={`flex items-center gap-2 text-xs font-bold group uppercase tracking-wide px-2 py-1 rounded-lg transition-colors 
                    ${isDark 
                        ? (isOpen ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white')
                        : (isOpen ? 'bg-gray-100 text-black' : 'text-gray-600 hover:text-black')
                    }
                `}
            >
                {icon}
                <span>{label}</span>
                {indicator && <span className={`w-1.5 h-1.5 rounded-full bg-${indicatorColor}-500 animate-pulse`} />}
                {rightIcon && <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>{rightIcon}</span>}
            </button>

            <AnimatePresence>
                {isOpen && children && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 rounded-2xl shadow-2xl border overflow-hidden z-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const NavItem: React.FC<{ icon: React.ReactNode, active?: boolean, onClick: () => void, label?: string, isDark?: boolean, activeColor: string }> = ({ icon, active, onClick, label, isDark, activeColor }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 relative group ${
      active ? `text-${activeColor}-500` : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-800')
    }`}
  >
    {active && (
        <motion.div 
            layoutId="active-nav"
            className={`absolute inset-0 rounded-2xl ${isDark ? `bg-${activeColor}-500/10` : `bg-${activeColor}-50`}`}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
    )}
    {active && (
        <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-${activeColor}-500 rounded-r-full`} />
    )}
    <div className="relative z-10 flex flex-col items-center gap-1">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20, strokeWidth: active ? 2.5 : 2 })}
        {label && <span className="text-[8px] font-bold">{label}</span>}
    </div>
  </button>
);
