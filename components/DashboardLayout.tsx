

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
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
  CalendarRange,
  Monitor,
  Book,
  Menu,
  Layers,
  ThumbsUp,
  Shield,
  Link2,
  Maximize2,
  Minimize2,
  Trophy,
  Target,
  Zap,
  ShieldCheck,
  Brain,
  GitCommit
} from 'lucide-react';
import { InvertedCorner } from './InvertedCorner';
import { ViewState, ClassroomWork, SuapProfile, SuapPeriod, GradeInfo, ProcessedClass, SuapCompletionData, Holiday, TodoItem, SuapMeusDadosAluno, Achievement } from '../types';
import { ACHIEVEMENTS_LIST, getRarityColor, getRarityLabel } from '../achievements';
import { AIChatWidget } from './AIChatWidget';
import { PomodoroWidget } from './PomodoroWidget';
import { SecureStorage } from '../services/SecureStorage';
import { ChangelogModal } from './modals/ChangelogModal';

// -- Constants --
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";
const SUPACO_INTERNAL_KEY = process.env.API_KEY || "AIzaSyD-PREMIUM-PLACEHOLDER-KEY-FOR-SUPACO-APP";
const CURRENT_VERSION = "2.0.0";

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
  academicData?: SuapMeusDadosAluno | null;
  currentPeriod: SuapPeriod | null;
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  completionData?: SuapCompletionData | null;
  holidays?: Holiday[];
  classroomWork?: ClassroomWork[];
  rightTab: 'overview' | 'tasks' | 'holidays' | 'achievements';
  onRightTabChange: (tab: 'overview' | 'tasks' | 'holidays' | 'achievements') => void;
  onOpenSettings: () => void;
  userPhoto: string; // New Prop for resolved photo URL
  onRefresh?: () => void; // New prop for manual refresh
  isClassroomLinked?: boolean;
  // Todo Props
  todos?: TodoItem[];
  onAddTodo?: (text: string) => void;
  onToggleTodo?: (id: string) => void;
  onRemoveTodo?: (id: string) => void;
  classroomStatus?: 'connected' | 'disconnected' | 'expired';
}

// --- HOLOGRAPHIC CARD COMPONENT ---
const HolographicCard = ({ children, primaryColor, isPremium }: { children?: React.ReactNode, primaryColor: string, isPremium?: boolean }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);
    const glareX = useTransform(x, [-100, 100], [0, 100]);
    const glareY = useTransform(y, [-100, 100], [0, 100]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <div style={{ perspective: 1000 }} className="w-full h-full">
            <motion.div
                style={{ 
                    transformStyle: "preserve-3d",
                    rotateX,
                    rotateY
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative w-full h-full rounded-[2rem] transition-all duration-200 ease-out"
            >
                <div 
                    className={`absolute inset-0 bg-white/10 backdrop-blur-md rounded-[2rem] shadow-xl overflow-hidden border-2 border-${primaryColor}-500/50`}
                >
                    {/* Glare Effect */}
                    <motion.div 
                        style={{
                            background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.2) 50%, transparent 54%)',
                            backgroundSize: '200% 200%',
                            backgroundPositionX: glareX + '%',
                            backgroundPositionY: glareY + '%',
                            opacity: 0.7,
                            pointerEvents: 'none'
                        }}
                        className="absolute inset-0 z-20 mix-blend-overlay"
                    />
                    {/* Content */}
                    <div className="relative z-10 p-5 md:p-6 h-full flex flex-col justify-between">
                        {children}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- ACHIEVEMENT NOTIFICATION COMPONENT ---
const AchievementNotification = ({ achievement, onClose, isDarkMode }: { achievement: Achievement, onClose: () => void, isDarkMode: boolean }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000); // Auto close after 5s
        return () => clearTimeout(timer);
    }, [onClose]);

    const color = getRarityColor(achievement.rarity);
    
    // Rarity styles
    const rarityStyles = {
        common: 'from-slate-400 via-gray-500 to-slate-600 shadow-gray-500/30',
        rare: 'from-cyan-400 via-blue-500 to-indigo-600 shadow-blue-500/30',
        epic: 'from-fuchsia-400 via-purple-500 to-violet-600 shadow-purple-500/30',
        legendary: 'from-yellow-300 via-amber-500 to-orange-600 shadow-amber-500/40'
    };

    const gradient = rarityStyles[achievement.rarity];

    return (
        <motion.div 
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] cursor-pointer"
            onClick={onClose}
        >
            <div className={`p-1.5 rounded-[2rem] bg-gradient-to-r ${gradient} shadow-2xl`}>
                <div className={`px-6 py-4 rounded-[1.7rem] flex items-center gap-4 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-${color}-500/20 text-${color}-500 relative`}>
                        <achievement.icon size={24} />
                        {achievement.rarity === 'legendary' && (
                            <div className="absolute inset-0 rounded-xl bg-amber-400/20 animate-pulse" />
                        )}
                    </div>
                    <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${gradient} mb-0.5`}>
                            {getRarityLabel(achievement.rarity)} Desbloqueado!
                        </div>
                        <h3 className={`text-lg font-black leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{achievement.title}</h3>
                        <p className={`text-xs opacity-60 mt-1 max-w-[200px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{achievement.description}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// --- FOCUS MODE OVERLAY ---
const FocusModeOverlay = ({ onClose, nextClass, isDarkMode, primaryColor }: any) => {
    const [notes, setNotes] = useState(localStorage.getItem('focus_mode_notes') || '');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            // Calculate Time Left in Class
            if (nextClass) {
                const [endH, endM] = nextClass.endTime.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(endH, endM, 0);
                
                // Handle late night classes crossing midnight (edge case, simplified here)
                const diff = endDate.getTime() - now.getTime();
                if (diff > 0) {
                    const m = Math.floor(diff / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${m}m ${s}s`);
                } else {
                    setTimeLeft('Encerrada');
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [nextClass]);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        localStorage.setItem('focus_mode_notes', e.target.value);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-0 z-[300] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        >
            <button onClick={onClose} className={`absolute top-6 right-6 p-4 rounded-full ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                <Minimize2 size={24} className={isDarkMode ? 'text-white' : 'text-black'} />
            </button>

            <div className="max-w-4xl w-full flex flex-col md:flex-row gap-12 items-center justify-center h-full">
                
                {/* Clock & Status */}
                <div className="flex-1 text-center md:text-left space-y-8">
                    <div>
                        <h2 className={`text-sm font-bold uppercase tracking-[0.3em] mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Modo Foco</h2>
                        <div className={`text-9xl font-black font-mono tabular-nums leading-none tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`text-xl font-bold mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>

                    {nextClass ? (
                        <div className={`p-8 rounded-[2rem] border ${isDarkMode ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                             <div className="flex justify-between items-start mb-2">
                                <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>Aula Atual</div>
                                <div className={`px-2 py-1 rounded bg-black/10 dark:bg-white/10 text-xs font-mono font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{timeLeft} restantes</div>
                             </div>
                             <h3 className={`text-4xl font-black leading-tight mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{nextClass.name}</h3>
                             <div className="flex items-center gap-6 opacity-80">
                                 <div className="flex items-center gap-2"><Clock size={20} /> <span className="text-xl font-bold">{nextClass.startTime} - {nextClass.endTime}</span></div>
                                 <div className="flex items-center gap-2"><MapPin size={20} /> <span className="text-xl font-bold">{nextClass.room}</span></div>
                             </div>
                        </div>
                    ) : (
                        <div className="opacity-50 text-xl font-bold p-8 border border-dashed border-gray-500/30 rounded-[2rem]">
                            Nenhuma aula agora. Aproveite para estudar.
                        </div>
                    )}
                </div>

                {/* Quick Notes */}
                <div className="w-full md:w-1/3 h-[400px] flex flex-col">
                    <label className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <CheckSquare size={16} /> Anotações Rápidas
                    </label>
                    <textarea
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Rascunho da aula..."
                        className={`flex-1 w-full rounded-[2rem] p-6 text-lg font-medium resize-none outline-none border transition-all
                            ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-white/30 text-gray-200 placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-800 placeholder:text-gray-300'}
                        `}
                    />
                </div>

            </div>
        </motion.div>
    );
};

// --- NAVIGATION ITEM ---
const NavItem = ({ icon, active, onClick, label, activeColor, isDark }: any) => (
  <button 
    onClick={onClick}
    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group relative
      ${active 
        ? `bg-${activeColor}-500 text-white shadow-lg shadow-${activeColor}-500/40 scale-110` 
        : (isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600')
      }
    `}
    title={label}
  >
    {React.cloneElement(icon, { size: 20 })}
    {active && (
      <motion.div 
        layoutId="activeNavIndicator"
        className="absolute -right-2 w-1 h-6 rounded-full bg-white"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </button>
);

// --- TOP BAR ITEM ---
const TopBarItem = ({ icon, label, onClick, active, indicator, indicatorColor, rightIcon, children, isDark }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button 
                onClick={onClick}
                className={`h-8 md:h-10 px-3 md:px-4 rounded-full flex items-center gap-2 transition-all text-xs md:text-sm font-bold border
                    ${active 
                        ? (isDark ? 'bg-white text-black border-transparent' : 'bg-black text-white border-transparent')
                        : (isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                    }
                `}
            >
                {indicator && (
                    <span className={`w-2 h-2 rounded-full bg-${indicatorColor}-500 ${indicatorColor === 'green' ? 'animate-pulse' : ''}`} />
                )}
                {icon}
                <span>{label}</span>
                {rightIcon && <span className="opacity-50">{rightIcon}</span>}
            </button>

            {/* Dropdown / Tooltip Content */}
            <AnimatePresence>
                {isHovered && children && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`absolute top-full mt-2 left-0 z-50 rounded-2xl shadow-xl border overflow-hidden
                            ${isDark ? 'bg-slate-900/90 border-white/20 backdrop-blur-xl' : 'bg-white/90 border-gray-200 backdrop-blur-xl'}
                        `}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- LOGIN MODAL ---
const LoginModal = ({ isDarkMode, primaryColor, onLogin }: any) => {
    // This is a simplified placeholder as login is handled in LandingPage usually
    // But kept here if user logs out and needs to log back in without full reload
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className={`p-8 rounded-[2rem] shadow-2xl ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
                <h2 className="text-2xl font-black mb-4">Bem-vindo de volta</h2>
                <button onClick={onLogin} className={`w-full py-3 rounded-xl font-bold bg-${primaryColor}-500 text-white`}>
                    Entrar
                </button>
            </div>
        </div>
    )
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
  academicData,
  currentPeriod,
  grades,
  schedule,
  completionData,
  holidays = [],
  classroomWork = [],
  rightTab,
  onRightTabChange,
  onOpenSettings,
  userPhoto,
  onRefresh,
  isClassroomLinked = false,
  todos = [],
  onAddTodo,
  onToggleTodo,
  onRemoveTodo,
  classroomStatus
}) => {
  const [activeNav, setActiveNav] = useState<ViewState>(ViewState.DASHBOARD);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Achievement State
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievementNotification, setShowAchievementNotification] = useState<Achievement | null>(null);

  // ToDo Input State
  const [todoInput, setTodoInput] = useState('');

  // Calculated States
  const [bestSubjectToSkip, setBestSubjectToSkip] = useState<GradeInfo | null>(null);
  const [worstSubjectToSkip, setWorstSubjectToSkip] = useState<GradeInfo | null>(null);
  const [nextClass, setNextClass] = useState<ProcessedClass | null>(null);
  const [nextClassGrade, setNextClassGrade] = useState<GradeInfo | null>(null);
  const [nextClassContext, setNextClassContext] = useState<string>(''); // "Hoje", "Amanhã"
  
  // Carousel State - UNIFIED
  const [carouselIndex, setCarouselIndex] = useState(0); 
  const TOTAL_SLIDES = 3;

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<{ date: Date, rect: DOMRect } | null>(null);
  
  // Premium check
  const isPremium = localStorage.getItem('suap_user_is_premium') === 'true';

  useEffect(() => {
    setActiveNav(currentView);
  }, [currentView]);

  // --- ACHIEVEMENT LOGIC ---
  useEffect(() => {
    if (grades.length > 0 && userData && isLoggedIn) {
        const storedAchievements = SecureStorage.loadItem(userData.matricula || '', 'achievements') || [];
        const newUnlocks: string[] = [];
        let lastUnlock: Achievement | null = null;

        ACHIEVEMENTS_LIST.forEach(ach => {
            if (!storedAchievements.includes(ach.id)) {
                if (ach.condition(grades, userData)) {
                    newUnlocks.push(ach.id);
                    lastUnlock = ach;
                }
            }
        });

        if (newUnlocks.length > 0) {
            const updated = [...storedAchievements, ...newUnlocks];
            SecureStorage.saveItem(userData.matricula || '', 'achievements', updated);
            setUnlockedAchievements(updated);
            
            // Trigger Sync
            SecureStorage.syncToCloud(userData.matricula || '');

            // Trigger Notification for the last one (simplification)
            if (lastUnlock) {
                setShowAchievementNotification(lastUnlock);
            }
        } else {
            setUnlockedAchievements(storedAchievements);
        }
    }
  }, [grades, userData, isLoggedIn]);

  const handleRefreshClick = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      // Simulate spinning for UX feedback
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };

  // Calculate Overall Stats (Average & Frequency)
  const stats = useMemo(() => {
    // 1. Calculate Average (Prioritize IRA from academicData)
    let average = '-';
    
    if (academicData?.ira) {
        average = academicData.ira.replace(',', '.');
    } else if (grades && grades.length > 0) {
        // Fallback: Calculate from visible grades
        const validGrades = grades.filter(g => 
            g.average !== '-' && 
            g.average !== null && 
            g.average !== undefined &&
            !isNaN(Number(g.average))
        );
        if (validGrades.length > 0) {
             average = (validGrades.reduce((acc, g) => acc + Number(g.average), 0) / validGrades.length).toFixed(1);
        }
    }

    // 2. Calculate Frequency (Weighted by totalHours from grades)
    let frequency = '-';
    if (grades && grades.length > 0) {
        const gradesWithHours = grades.filter(g => g.totalHours > 0);
        const totalHours = gradesWithHours.reduce((acc, g) => acc + g.totalHours, 0);
        
        if (totalHours > 0) {
            // Weighted Average: (Sum(freq * hours) / TotalHours)
            const weightedSum = gradesWithHours.reduce((acc, g) => acc + (g.frequency * g.totalHours), 0);
            frequency = Math.round(weightedSum / totalHours) + '%';
        } else {
             // Fallback: Simple average of frequency field
             const validFreqs = grades.filter(g => typeof g.frequency === 'number');
             if (validFreqs.length > 0) {
                 frequency = Math.round(validFreqs.reduce((acc, g) => acc + g.frequency, 0) / validFreqs.length) + '%';
             }
        }
    }

    return { average, frequency };
  }, [grades, academicData]);

  // Calculate "Pode Faltar" Logic and Schedule
  useEffect(() => {
      if (grades.length > 0) {
          // Sort for Best (Most remaining)
          const sorted = [...grades].sort((a, b) => {
              const remainingA = a.limit - a.absences;
              const remainingB = b.limit - b.absences;
              return remainingB - remainingA; // Descending
          });
          setBestSubjectToSkip(sorted[0]);

          // Sort for Critical (Least remaining but not failed)
          const risks = grades.filter(g => g.absences <= g.limit).sort((a, b) => {
              const remainingA = a.limit - a.absences;
              const remainingB = b.limit - b.absences;
              return remainingA - remainingB; // Ascending
          });
          if(risks.length > 0) setWorstSubjectToSkip(risks[0]);
      }

      if (schedule.length > 0) {
          const findNext = () => {
              const now = new Date();
              const currentDayInt = now.getDay() + 1; // 1=Sun, 2=Mon...
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              
              // Check up to 7 days ahead
              for(let d = 0; d < 7; d++) {
                  let targetDayInt = currentDayInt + d;
                  // Handle week wrap
                  if (targetDayInt > 7) targetDayInt = (targetDayInt % 7) || 7;

                  const classesThatDay = schedule.filter(c => c.dayInt === targetDayInt);
                  
                  if (d === 0) {
                      // Today: find classes later than now
                      const upcoming = classesThatDay.find(c => {
                          const [h, m] = c.startTime.split(':').map(Number);
                          return (h * 60 + m) > currentMinutes;
                      });
                      if (upcoming) {
                          setNextClassContext('Hoje');
                          return upcoming;
                      }
                  } else {
                      // Future day: first class
                      if (classesThatDay.length > 0) {
                          setNextClassContext(d === 1 ? 'Amanhã' : classesThatDay[0].day);
                          return classesThatDay[0];
                      }
                  }
              }
              return null;
          };

          const upcoming = findNext();
          setNextClass(upcoming);
          
          if (upcoming && grades.length > 0) {
              // Try to find matching grade by name (fuzzy match)
              const match = grades.find(g => 
                  upcoming.name.toLowerCase().includes(g.subject.toLowerCase()) ||
                  g.subject.toLowerCase().includes(upcoming.name.toLowerCase())
              );
              setNextClassGrade(match || null);
          }
      }
  }, [grades, schedule]);

  // Status Card Config Helper
  const getStatusConfig = (grade: GradeInfo | null) => {
      if (!grade) return { text: "Sem dados", color: "gray", sub: "---" };
      
      const remaining = grade.limit - grade.absences;
      const percentage = grade.absences / grade.limit;

      if (remaining < 0) return { text: "Reprovado", color: secondaryColor, sub: "Limite excedido" };
      if (remaining === 0) return { text: "No Limite", color: secondaryColor, sub: "0 restantes" };
      if (remaining <= 2) return { text: "Crítico", color: "orange", sub: `${remaining} restantes` };
      if (remaining <= 4) return { text: "Cuidado", color: "orange", sub: `${remaining} restantes` };
      if (percentage < 0.5) return { text: "Tranquilo", color: primaryColor, sub: `${remaining} restantes` };
      
      return { text: "Moderado", color: primaryColor, sub: `${remaining} restantes` };
  };

  const handleNextSlide = () => {
      setCarouselIndex((prev) => (prev + 1) % TOTAL_SLIDES);
  };
  
  const handlePrevSlide = () => {
      setCarouselIndex((prev) => (prev === 0 ? TOTAL_SLIDES - 1 : prev - 1));
  };

  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -50) {
        handleNextSlide();
    } else if (info.offset.x > 50) {
        handlePrevSlide();
    }
  };

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
  const nextTask = classroomWork[0]; // Nearest task

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
  const handleAddTodoClick = () => {
      if (!todoInput.trim()) return;
      onAddTodo?.(todoInput);
      setTodoInput('');
  };

  const handleKeyDownTodo = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAddTodoClick();
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
      if (!date) return { classes: [], holiday: null, tasks: [] };
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const holiday = holidays.find(h => h.date === dateStr);
      const dayOfWeekInt = date.getDay() + 1;
      const classes = schedule.filter(s => s.dayInt === dayOfWeekInt);
      const tasks = classroomWork.filter(w => 
          w.jsDate && 
          w.jsDate.getDate() === date.getDate() &&
          w.jsDate.getMonth() === date.getMonth() &&
          w.jsDate.getFullYear() === date.getFullYear()
      );

      return { classes, holiday, tasks };
  };

  const renderSlideContent = (index: number) => {
    if (index === 0) {
        // STATUS CARD + TODAY'S SCHEDULE
        const todayInt = new Date().getDay() + 1;
        const todaysClasses = schedule.filter(s => s.dayInt === todayInt).sort((a,b) => a.startTime.localeCompare(b.startTime));

        return (
            <div className="h-full flex flex-col gap-3 relative overflow-hidden">
                <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-50 ${isDarkMode ? `bg-${primaryColor}-500/20` : `bg-${primaryColor}-300/40`}`} />
                
                {/* Header */}
                <div className="flex justify-between items-start relative z-10 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg transition-colors backdrop-blur-md
                        ${isDarkMode ? `bg-${primaryColor}-900/40 text-${primaryColor}-300` : `bg-${primaryColor}-100/80 text-${primaryColor}-700`}
                    `}>
                        {nextClass ? 'Próxima Aula' : 'Hoje'}
                    </span>
                    {todaysClasses.length > 0 && (
                        <div className={`text-[9px] font-bold px-2 py-1 rounded-lg border backdrop-blur-sm ${isDarkMode ? 'border-white/10 text-white/40' : 'border-black/5 text-black/40'}`}>
                            {todaysClasses.length} Aulas
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex-1 flex flex-col min-h-0">
                    {/* Primary Status (Next Class Risk or General Status) */}
                    <div className="shrink-0 mb-3">
                        {nextClassGrade ? (
                            <div className="bg-gradient-to-br from-transparent to-white/5 rounded-2xl p-0.5 group cursor-pointer" onClick={() => setIsFocusMode(true)}>
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[160px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {nextClass?.name}
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <Maximize2 size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                         <div className="text-[10px] font-mono opacity-60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[9px]">{nextClass?.startTime}</div>
                                    </div>
                                </div>
                                
                                {(() => {
                                    const conf = getStatusConfig(nextClassGrade);
                                    const remaining = nextClassGrade.limit - nextClassGrade.absences;
                                    return (
                                        <div className="flex items-center gap-3">
                                            <div className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-sm flex-1
                                                ${conf.color === 'red' || conf.color === secondaryColor 
                                                    ? (isDarkMode ? `bg-${secondaryColor}-500/20 text-${secondaryColor}-400 ring-1 ring-${secondaryColor}-500/20` : `bg-${secondaryColor}-100 text-${secondaryColor}-600 ring-1 ring-${secondaryColor}-200`)
                                                    : conf.color === 'orange'
                                                        ? (isDarkMode ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/20' : 'bg-orange-100 text-orange-600 ring-1 ring-orange-200')
                                                        : (isDarkMode ? `bg-${primaryColor}-500/20 text-${primaryColor}-400 ring-1 ring-${primaryColor}-500/20` : `bg-${primaryColor}-100 text-${primaryColor}-600 ring-1 ring-${primaryColor}-200`)
                                                }
                                            `}>
                                                {conf.color === 'orange' || conf.color === secondaryColor || conf.color === 'red' ? <AlertTriangle size={14}/> : <CheckCircle size={14} />}
                                                {conf.text}
                                            </div>
                                            <div className="flex flex-col items-end leading-none pr-1">
                                                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                    {remaining}
                                                </span>
                                                <span className="text-[7px] font-bold uppercase opacity-50">Restantes</span>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        ) : bestSubjectToSkip ? (
                             <div className="px-1">
                                <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Sugestão
                                </div>
                                <div className={`text-lg font-black leading-tight mb-2 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {bestSubjectToSkip.subject}
                                </div>
                                <div className={`text-[10px] font-bold flex items-center gap-1.5 ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>
                                    <ThumbsUp size={12} />
                                    <span>{bestSubjectToSkip.limit - bestSubjectToSkip.absences} faltas disponíveis.</span>
                                </div>
                             </div>
                        ) : (
                            <div className="py-4 opacity-60 text-xs font-bold text-center border-2 border-dashed border-gray-500/10 rounded-xl">
                                Sem dados de faltas.
                            </div>
                        )}
                    </div>

                    {/* Today's Schedule List */}
                    <div className="flex-1 flex flex-col min-h-0 border-t border-dashed border-gray-500/10 pt-2">
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-2 pl-1">Cronograma de Hoje</div>
                        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-1.5">
                            {todaysClasses.length > 0 ? (
                                todaysClasses.map((c, i) => {
                                    const isNext = nextClass && c.startTime === nextClass.startTime && c.name === nextClass.name;
                                    
                                    return (
                                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${isNext ? (isDarkMode ? `bg-white/10 shadow-sm border border-white/5` : `bg-white shadow-sm border border-gray-100`) : 'opacity-70 hover:opacity-100'}`}>
                                            <div className={`w-1 h-8 rounded-full shrink-0 ${isNext ? `bg-${primaryColor}-500` : `bg-gray-300 dark:bg-white/20`}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[10px] font-bold truncate leading-tight ${isNext ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>
                                                    {c.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex items-center gap-1 text-[9px] opacity-70">
                                                        <Clock size={8} /> {c.startTime}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[9px] opacity-70">
                                                        <MapPin size={8} /> {c.room}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-1">
                                    <Coffee size={20} />
                                    <span className="text-[10px] font-bold uppercase">Folga</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    } else if (index === 1) {
        // HOLIDAY CARD (Unchanged)
        return (
            <div className="h-full flex flex-col gap-4">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-200/50'}`} />
                <div className="flex justify-between items-start relative z-10">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-200 text-indigo-800'}`}>
                        Próximo Feriado
                    </span>
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center gap-2">
                    {upcomingHoliday ? (
                        <>
                            <div className={`text-3xl font-black leading-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                {isTodayHoliday ? "É FERIADO!" : "FALTA POUCO"}
                            </div>
                            <div className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                                {upcomingHoliday.name}
                            </div>
                            <div className={`text-xs font-medium opacity-70 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                {isTodayHoliday ? "Aproveite seu dia de folga." : `Em ${upcomingHoliday.diffDays} ${upcomingHoliday.diffDays === 1 ? 'dia' : 'dias'}.`}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`text-2xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                SEM FOLGA
                            </div>
                            <div className={`text-xs font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                Nenhum feriado próximo encontrado.
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    } else {
        // TASKS CARD (Unchanged)
        if (!isClassroomLinked) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-4">
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? `bg-gray-500/10` : `bg-gray-200/50`}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-white/10' : 'bg-gray-100 text-gray-400'}`}>
                         <Link2 size={24} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Classroom</h3>
                        <p className="text-[10px] opacity-60 max-w-[150px] mx-auto leading-relaxed">Conecte sua conta Google para ver tarefas aqui.</p>
                    </div>
                    <button 
                        onClick={onOpenSettings}
                        className={`text-[10px] font-bold uppercase tracking-wide px-4 py-2 rounded-xl transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        Vincular
                    </button>
                </div>
            )
        }

        return (
            <div className="h-full flex flex-col gap-4">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? `bg-${primaryColor}-500/10` : `bg-${primaryColor}-200/30`}`} />
                <div className="flex justify-between items-start relative z-10">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? `bg-${primaryColor}-900/50 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-700`}`}>
                        Classroom
                    </span>
                    {/* Add re-connect warning here if needed or rely on main nav */}
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    {nextTask ? (
                        <div className="flex flex-col gap-2">
                            <div>
                                <div className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? `text-${primaryColor}-500/80` : `text-${primaryColor}-600`}`}>
                                    Próxima Entrega
                                </div>
                                <div className={`text-lg font-black leading-tight line-clamp-3 ${isDarkMode ? `text-${primaryColor}-50` : 'text-gray-800'}`}>
                                    {nextTask.title}
                                </div>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block w-fit ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                {nextTask.courseName}
                            </div>
                            <div className="pt-2 border-t border-dashed border-gray-500/20 flex justify-between items-center mt-auto">
                                <div className={`text-xs font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>
                                    {nextTask.jsDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                                </div>
                                <div className={`text-xs font-bold opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                                    {nextTask.jsDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center opacity-50">
                            <Book size={24} className="mx-auto mb-2" />
                            <p className="text-xs font-bold">Nenhuma tarefa pendente.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
  };

  const frameBg = isDarkMode ? DARK_FRAME : LIGHT_FRAME;
  const frameText = isDarkMode ? 'text-white' : 'text-gray-900';
  const cornerColor = isDarkMode ? DARK_CORNER : LIGHT_CORNER;

  // PREMIUM BORDER STYLE (Used for profile photos)
  const premiumBorderLines = isPremium ? {
     content: '""',
     position: 'absolute' as const,
     inset: 0,
     borderRadius: '100%',
     borderTop: '3px solid #ef4444',    // Red
     borderLeft: '3px solid #eab308',   // Yellow
     borderBottom: '3px solid #3b82f6', // Blue
     borderRight: '1.5px solid #22c55e',// Green (Thinner)
     pointerEvents: 'none' as const
  } : {};

  return (
    <div className={`relative w-full h-[100dvh] md:h-screen overflow-hidden flex flex-col md:flex-row font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}>
      
      {/* --- ACHIEVEMENT NOTIFICATION --- */}
      <AnimatePresence>
          {showAchievementNotification && (
              <AchievementNotification 
                  achievement={showAchievementNotification} 
                  onClose={() => setShowAchievementNotification(null)}
                  isDarkMode={isDarkMode}
              />
          )}
      </AnimatePresence>

      {/* --- FOCUS MODE OVERLAY --- */}
      <AnimatePresence>
          {isFocusMode && (
              <FocusModeOverlay 
                  onClose={() => setIsFocusMode(false)}
                  nextClass={nextClass}
                  isDarkMode={isDarkMode}
                  primaryColor={primaryColor}
              />
          )}
      </AnimatePresence>
      
      {/* --- CHANGELOG MODAL --- */}
      <AnimatePresence>
          {showChangelog && (
              <ChangelogModal 
                  onClose={() => setShowChangelog(false)}
                  isDark={isDarkMode}
                  primaryColor={primaryColor}
              />
          )}
      </AnimatePresence>

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

      {/* --- FRAME ELEMENTS (Desktop Only) --- */}
      <div className={`hidden md:block absolute top-0 inset-x-0 h-4 z-50 transition-colors duration-500 ${frameBg}`} />
      <div className={`hidden md:block absolute bottom-0 inset-x-0 h-4 z-40 transition-colors duration-500 ${frameBg}`} />

      {/* 1. LEFT SIDEBAR (Desktop Only) */}
      <div id="tut-nav-desktop" className={`hidden md:flex relative z-50 h-[calc(100vh-2rem)] my-4 w-24 flex-col items-center py-8 transition-colors duration-500 ${frameBg}`}>
        <div className="text-xs font-black tracking-widest mb-1 text-gray-400">ELECTRON</div>
        <div className={`text-xl font-black italic mb-10 transition-colors duration-500 ${frameText}`}>SUPACO</div>
        
        <nav className="flex flex-col gap-6 w-full items-center flex-1">
          <NavItem isDark={isDarkMode} icon={<Home />} active={activeNav === ViewState.DASHBOARD} onClick={() => handleNavClick(ViewState.DASHBOARD)} label="Dash" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<BookOpen />} active={activeNav === ViewState.GRADES} onClick={() => handleNavClick(ViewState.GRADES)} label="Notas" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<AlertTriangle />} active={activeNav === ViewState.ABSENCES} onClick={() => handleNavClick(ViewState.ABSENCES)} label="Faltas" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<CalendarIcon />} active={activeNav === ViewState.SCHEDULE} onClick={() => handleNavClick(ViewState.SCHEDULE)} label="Horário" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<Monitor />} active={activeNav === ViewState.CLASSROOM} onClick={() => handleNavClick(ViewState.CLASSROOM)} label="Classroom" activeColor={primaryColor} />
          <NavItem isDark={isDarkMode} icon={<Flag />} active={activeNav === ViewState.CONCLUSION} onClick={() => handleNavClick(ViewState.CONCLUSION)} label="Conclusão" activeColor={primaryColor} />
          
          {/* Admin Link for Specific User (Obfuscated check) */}
          {SecureStorage.isAdmin(userData?.matricula) && (
              <NavItem isDark={isDarkMode} icon={<Shield />} active={activeNav === ViewState.ADMIN} onClick={() => handleNavClick(ViewState.ADMIN)} label="Admin" activeColor={primaryColor} />
          )}

        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center">
            {/* Manual Refresh Button (Desktop) */}
           <button 
             onClick={handleRefreshClick}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'}`}
             title="Atualizar dados"
           >
             <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
           </button>

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

           <div className="relative w-12 h-12 flex items-center justify-center">
               {/* Fixed Quadrant Border */}
               {isPremium && (
                 <div className="absolute inset-0 rounded-full" 
                    style={{
                        borderTop: '3px solid #ef4444',
                        borderLeft: '3px solid #eab308',
                        borderBottom: '3px solid #3b82f6',
                        borderRight: '1.5px solid #22c55e'
                    }} 
                 />
               )}
               <button 
                 id="tut-profile"
                 onClick={() => handleNavClick(ViewState.PROFILE)}
                 className={`w-10 h-10 rounded-full overflow-hidden p-0.5 hover:scale-110 transition-transform relative z-10 
                   ${!isPremium && activeNav === ViewState.PROFILE ? `border-2 border-${primaryColor}-500 scale-110` : (!isPremium ? 'border-2 border-transparent' : '')}
                 `}
                >
                  <img src={userPhoto} className="w-full h-full rounded-full object-cover" alt="Profile" />
               </button>
           </div>
        </div>

        <div className="absolute top-0 -right-[40px] w-[40px] h-[40px] z-50">
             <InvertedCorner position="top-left" size={40} fill={cornerColor} />
        </div>
      </div>

      {/* 2. CENTER CONTENT AREA */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden md:overflow-visible">
        
        {/* Main Content Scrollable Container for Mobile */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-visible pb-24 md:pb-0 w-full">

            {/* Top Navigation Notch */}
            <div className="relative w-full flex justify-center z-[60]">
                <motion.div 
                    initial={{ y: -150 }}
                    animate={{ y: isLoggedIn ? 0 : -150 }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15, delay: isLoggedIn ? 0.2 : 0 }}
                    className={`mt-4 md:mt-8 backdrop-blur-xl h-12 md:h-14 pl-2 pr-4 md:pr-6 rounded-full flex items-center gap-3 md:gap-4 shadow-lg border transition-colors duration-500
                        ${isDarkMode ? 'bg-slate-950/80 border-white/10' : 'bg-white/90 border-white/40'}
                    `}
                >
                    <button 
                        onClick={() => handleNavClick(ViewState.DASHBOARD)}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-colors flex items-center justify-center group ${isDarkMode ? 'bg-white/10 text-white hover:bg-white hover:text-black' : 'bg-gray-100 hover:bg-black hover:text-white'}`}
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
                    
                    <TopBarItem 
                        icon={<GraduationCap size={14} />}
                        label={currentPeriod?.semestre || '2025.1'} 
                        indicator
                        indicatorColor={primaryColor}
                        isDark={isDarkMode}
                    >
                        <div className={`p-4 min-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Semestre Atual</h3>
                            <div className="text-xl font-black">{currentPeriod?.semestre || '2025.1'}</div>
                            <div className={`text-xs font-bold mt-1 text-${primaryColor}-500`}>Em andamento</div>
                        </div>
                    </TopBarItem>

                    <div className={`hidden md:block h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
                    
                    <div className="hidden md:block">
                         <TopBarItem 
                            icon={<Flag size={14} />}
                            label={completionData ? `${completionData.percentual_cumprida}%` : '--%'}
                            isDark={isDarkMode}
                        >
                             <div className={`p-4 min-w-[240px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Progresso do Curso</h3>
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-2xl font-black">{completionData?.percentual_cumprida || 0}%</span>
                                    <span className="text-xs font-bold text-gray-500">{completionData?.totais.ch_cumprida}h / {completionData?.totais.ch_esperada}h</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                     <div className={`bg-${primaryColor}-500 h-full`} style={{width: `${completionData?.percentual_cumprida || 0}%`}} />
                                </div>
                            </div>
                        </TopBarItem>
                    </div>

                    {/* Classroom Connection Status */}
                    {classroomStatus === 'expired' && (
                        <>
                            <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
                            <button
                                onClick={onOpenSettings}
                                className={`h-8 md:h-10 px-3 md:px-4 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold border transition-all animate-pulse ${isDarkMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-600 border-red-200'}`}
                            >
                                <AlertTriangle size={14} />
                                <span className="hidden md:inline">Reconectar Classroom</span>
                            </button>
                        </>
                    )}

                    <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />

                    <TopBarItem 
                        label={nextClass ? `PRÓX: ${nextClass.name.split(' ').slice(0,2).join(' ')}` : "Livre"}
                        rightIcon={<ChevronRight size={14} />}
                        isDark={isDarkMode}
                        onClick={() => nextClass && setIsFocusMode(true)}
                    >
                        <div className={`p-4 min-w-[220px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                           {nextClass ? (
                               <>
                                   <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Próxima Aula</h3>
                                   <div className="font-bold text-base leading-tight mb-1">{nextClass.name}</div>
                                   <div className="flex items-center gap-2 text-xs text-gray-500">
                                       <Clock size={12} /> {nextClass.startTime} - {nextClass.endTime}
                                   </div>
                                   <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                       <MapPin size={12} /> {nextClass.room}
                                   </div>
                                   <button onClick={() => setIsFocusMode(true)} className={`mt-2 w-full py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                                       Modo Foco
                                   </button>
                               </>
                           ) : (
                               <div className="text-center py-2 text-gray-500 text-xs font-bold">Nenhuma aula próxima.</div>
                           )}
                        </div>
                    </TopBarItem>

                    {/* Mobile Refresh Button */}
                    <div className="md:hidden ml-2 flex gap-2 items-center">
                        <button 
                             onClick={handleRefreshClick}
                             className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${isDarkMode ? 'border-white/10 text-white/70' : 'border-black/5 text-gray-500'}`}
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <div className="relative w-8 h-8 flex items-center justify-center">
                             {/* Fixed Quadrant Border for Mobile */}
                             {isPremium && (
                               <div className="absolute inset-0 rounded-full" 
                                  style={{
                                      borderTop: '2.5px solid #ef4444',
                                      borderLeft: '2.5px solid #eab308',
                                      borderBottom: '2.5px solid #3b82f6',
                                      borderRight: '1.5px solid #22c55e'
                                  }} 
                               />
                             )}
                            <button 
                                id="tut-profile-mobile" 
                                onClick={() => handleNavClick(ViewState.PROFILE)} 
                                className={`w-7 h-7 rounded-full overflow-hidden relative z-10 ${!isPremium ? 'border border-white/20' : ''}`}
                            >
                                <img src={userPhoto} className="w-full h-full object-cover" alt="Profile" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Body */}
            <div className="flex flex-col md:block min-h-[80vh] w-full px-4 md:px-0 mt-6 md:mt-0 pb-32 md:pb-0">
                
                {/* Main Student ID Card - REPLACED WITH HOLOGRAPHIC COMPONENT */}
                <div className="relative md:absolute md:bottom-[380px] md:left-0 md:pl-6 z-20 w-full md:w-auto flex justify-center md:justify-start mb-6 md:mb-0">
                        <motion.div 
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: isLoggedIn ? 1 : 0, x: isLoggedIn ? 0 : -50 }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15, delay: isLoggedIn ? 0.4 : 0 }}
                            className="relative w-full max-w-[320px] md:w-[298px] h-[220px]"
                        >
                            <HolographicCard primaryColor={primaryColor} isPremium={isPremium}>
                                <div>
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
                                            {stats.average}
                                        </span>
                                    </div>
                                    <div className="w-[1px] h-8 bg-white/10"></div>
                                    <div className="px-2">
                                        <span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Frequência</span>
                                        <span className={`text-lg font-black text-${primaryColor}-400`}>
                                            {stats.frequency}
                                        </span>
                                    </div>
                                </div>
                            </HolographicCard>
                        </motion.div>
                </div>

                {/* INTEGRATED CARD BLOCK (Unified Stacked Carousel) */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: isLoggedIn ? 0 : -50, opacity: isLoggedIn ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15, delay: isLoggedIn ? 0.6 : 0 }}
                    className="relative md:absolute md:bottom-4 md:left-0 z-[60] w-full md:w-auto flex justify-center md:justify-start"
                >
                    {/* Desktop Inverted Corner */}
                    <div className="hidden md:block absolute -top-[40px] left-0 w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>

                    <div id="tut-carousel" className={`w-full max-w-[320px] md:w-[322px] rounded-[2rem] md:rounded-none md:rounded-tr-[40px] p-0 md:p-6 md:pb-12 relative transition-colors duration-500 bg-transparent md:${frameBg}`}>
                        
                        {/* --- CAROUSEL STACK CONTAINER --- */}
                        <div className="relative h-[240px] w-full perspective-1000">
                             
                             {/* Render All Slides for Stack Effect */}
                             {[0, 1, 2].map((idx) => {
                                 // Calculate relative position based on carouselIndex
                                 // 0: Active, 1: Behind, 2: Back
                                 const position = (idx - carouselIndex + TOTAL_SLIDES) % TOTAL_SLIDES;
                                 
                                 // Define stack styles
                                 const isTop = position === 0;
                                 const isBehind = position === 1;
                                 const isBack = position === 2;

                                 const zIndex = isTop ? 30 : isBehind ? 20 : 10;
                                 const scale = isTop ? 1 : isBehind ? 0.94 : 0.88;
                                 const y = isTop ? 0 : isBehind ? -16 : -32; // Negative Y creates peek from top
                                 const opacity = isTop ? 1 : isBehind ? 0.6 : 0.3;

                                 return (
                                     <motion.div 
                                        key={idx}
                                        animate={{ 
                                            scale, 
                                            y, 
                                            zIndex, 
                                            opacity 
                                        }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 300, 
                                            damping: 30 
                                        }}
                                        className={`absolute inset-0 rounded-[2rem] p-6 border h-full flex flex-col overflow-hidden shadow-2xl origin-bottom
                                            ${isDarkMode ? `bg-slate-900/90 border-white/10 backdrop-blur-xl` : `bg-white/90 border-white/50 backdrop-blur-xl`}
                                        `}
                                        style={{ pointerEvents: isTop ? 'auto' : 'none' }}
                                        drag={isTop ? "x" : false}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.2}
                                        onDragEnd={isTop ? onDragEnd : undefined}
                                        whileTap={isTop ? { scale: 0.98 } : undefined}
                                     >
                                         {renderSlideContent(idx)}
                                     </motion.div>
                                 );
                             })}
                        </div>
                        
                        {/* EXTERNAL PAGINATION & CONTROLS */}
                        <div className="flex items-center justify-between px-2 mt-3 relative z-40">
                             {/* Dots */}
                             <div className="flex items-center gap-2">
                                 {[0, 1, 2].map((idx) => (
                                     <button
                                         key={idx}
                                         onClick={() => setCarouselIndex(idx)}
                                         className={`h-1.5 rounded-full transition-all duration-300 ${
                                             carouselIndex === idx 
                                                 ? `w-6 bg-${primaryColor}-500` 
                                                 : `w-1.5 ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`
                                         }`}
                                     />
                                 ))}
                             </div>

                             {/* Next Button */}
                             <button
                                 onClick={handleNextSlide}
                                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                                     isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
                                 }`}
                             >
                                 <ChevronRight size={16} />
                             </button>
                        </div>
                    </div>

                    <div className="hidden md:block absolute bottom-0 -right-[40px] w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>
                </motion.div>

                {/* MOBILE: Secondary Info List (Previously Right Sidebar) */}
                <div className="md:hidden w-full max-w-[320px] mx-auto mt-6 space-y-4 pb-8">
                     {/* Simple Task Summary */}
                     <div className={`p-4 rounded-2xl border backdrop-blur-sm ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-white/20'}`}>
                         <div className="flex justify-between items-center mb-3">
                            <h3 className={`text-xs font-bold uppercase ${frameText}`}>Próximas Entregas</h3>
                            <div className={`text-[10px] px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>{classroomWork.length}</div>
                         </div>
                         {isClassroomLinked ? (
                             <>
                                {classroomWork.slice(0, 3).map(work => (
                                    <div key={work.id} className="flex justify-between items-center py-2 border-b border-dashed border-gray-500/10 last:border-0">
                                        <span className={`text-xs truncate max-w-[70%] ${frameText}`}>{work.title}</span>
                                        <span className={`text-[10px] font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>
                                            {work.jsDate?.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                        </span>
                                    </div>
                                ))}
                                {classroomWork.length === 0 && <p className="text-xs opacity-50 text-center py-2">Nada pendente.</p>}
                             </>
                         ) : (
                             <div className="text-center py-4">
                                <p className="text-xs opacity-50 mb-2">Classroom não vinculado</p>
                                <button onClick={onOpenSettings} className={`text-[10px] font-bold uppercase underline ${isDarkMode ? 'text-white' : 'text-black'}`}>Conectar</button>
                             </div>
                         )}
                     </div>
                </div>

           </div>

        </div>
      </div>

      {/* 3. RIGHT SIDEBAR - CONTENT (Hidden on Mobile) */}
      <div className={`hidden md:flex relative z-50 h-[calc(100vh-2rem)] my-4 w-[360px] flex-col p-8 transition-colors duration-500 ${frameBg}`}>
          {/* ... (Existing Right Sidebar Code) ... */}
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
                              {rightTab === 'overview' ? 'Hoje' : rightTab === 'tasks' ? 'Tarefas' : rightTab === 'holidays' ? 'Feriados' : 'Conquistas'}
                          </h2>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
                              <Clock size={12} /> <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                      </motion.div>
                  </AnimatePresence>

                  {/* Tab Switcher */}
                  <div className={`relative flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
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
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 relative overflow-hidden flex flex-col custom-scroll overflow-y-auto">
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
                                          
                                          const { classes, holiday, tasks } = getEventsForDate(day);
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
                            className="h-full flex flex-col gap-3"
                          >
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
                                <button onClick={() => handleNavClick(ViewState.PROFILE)} className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold uppercase ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}>
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
                        <GitCommit size={12} />
                        <span>v{CURRENT_VERSION}</span>
                    </button>
                    <div className="text-[10px] font-bold">Electron</div>
                </div>

             </motion.div>
          ) : (
            /* Not Logged In Sidebar State */
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                 <Shield size={48} className="mb-4" />
                 <p className="text-sm font-bold max-w-[200px]">Faça login para ver seu resumo diário.</p>
             </div>
          )}
      </div>

      {/* 4. MOBILE NAVBAR is handled in App.tsx via separate component */}
      
    </div>
  );
};