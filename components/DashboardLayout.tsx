import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  AlertTriangle, 
  ChevronRight,
  Clock,
  MapPin,
  Copy,
  CheckCircle,
  ThumbsUp,
  Link2,
  Maximize2,
  Book
} from 'lucide-react';
import { InvertedCorner } from './InvertedCorner';
import { ViewState, ClassroomWork, SuapProfile, SuapPeriod, GradeInfo, ProcessedClass, SuapCompletionData, Holiday, TodoItem, SuapMeusDadosAluno, Achievement } from '../types';
import { ACHIEVEMENTS_LIST } from '../achievements';
import { SecureStorage } from '../services/SecureStorage';
import { ChangelogModal } from './modals/ChangelogModal';

// --- NEW IMPORTS ---
import { HolographicCard } from './dashboard/HolographicCard';
import { AchievementNotification } from './dashboard/AchievementNotification';
import { FocusModeOverlay } from './dashboard/FocusModeOverlay';
import { LoginModal } from './modals/LoginModal';
import { LeftSidebar } from './dashboard/LeftSidebar';
import { RightSidebar } from './dashboard/RightSidebar';
import { TopNavBar } from './dashboard/TopNavBar';

// -- Constants --
const CURRENT_VERSION = "2.0.0";
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
  primaryColor: string;
  secondaryColor: string;
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
  userPhoto: string;
  onRefresh?: () => void;
  isClassroomLinked?: boolean;
  todos?: TodoItem[];
  onAddTodo?: (text: string) => void;
  onToggleTodo?: (id: string) => void;
  onRemoveTodo?: (id: string) => void;
  classroomStatus?: 'connected' | 'disconnected' | 'expired';
  onLinkClassroom?: () => void;
}

export const DashboardLayout: React.FC<DashboardProps> = ({ 
  currentView, onChangeView, isDarkMode, onToggleTheme, currentWallpaper,
  primaryColor, secondaryColor, isLoggedIn, onLogin, userData, academicData,
  currentPeriod, grades, schedule, completionData, holidays = [], classroomWork = [],
  rightTab, onRightTabChange, onOpenSettings, userPhoto, onRefresh,
  isClassroomLinked = false, todos = [], onAddTodo, onToggleTodo, onRemoveTodo,
  classroomStatus, onLinkClassroom
}) => {
  const [activeNav, setActiveNav] = useState<ViewState>(ViewState.DASHBOARD);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [isLoginModalDismissed, setIsLoginModalDismissed] = useState(false);
  
  // Achievement State
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievementNotification, setShowAchievementNotification] = useState<Achievement | null>(null);

  // Calculated States
  const [bestSubjectToSkip, setBestSubjectToSkip] = useState<GradeInfo | null>(null);
  const [nextClass, setNextClass] = useState<ProcessedClass | null>(null);
  const [nextClassGrade, setNextClassGrade] = useState<GradeInfo | null>(null);
  
  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0); 
  const TOTAL_SLIDES = 3;

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Premium check
  const isPremium = localStorage.getItem('suap_user_is_premium') === 'true';

  // Determine if content should be shown
  const showContent = isLoggedIn || (!!userData && isLoginModalDismissed);

  useEffect(() => {
    setActiveNav(currentView);
  }, [currentView]);

  // --- ACHIEVEMENT LOGIC ---
  useEffect(() => {
    if (grades.length > 0 && userData && showContent) {
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
            SecureStorage.syncToCloud(userData.matricula || '');

            if (lastUnlock) {
                setShowAchievementNotification(lastUnlock);
            }
        } else {
            setUnlockedAchievements(storedAchievements);
        }
    }
  }, [grades, userData, showContent]);

  const handleRefreshClick = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 2000);
    }
  };
  
  const handleSuapLogin = () => {
    const CLIENT_ID = 'mtwXt4wCesctJiKA6BbRQ7DMROTJeNosSpQUc7dm';
    const REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:5173/' : 'https://supaco.vercel.app/'; 
    window.location.href = `https://suap.ifrn.edu.br/o/authorize/?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  };

  const handleNavClick = (view: ViewState) => {
    setActiveNav(view);
    onChangeView(view);
  };

  // Calculate Stats
  const stats = useMemo(() => {
    let average = '-';
    if (academicData?.ira) {
        average = academicData.ira.replace(',', '.');
    } else if (grades && grades.length > 0) {
        const validGrades = grades.filter(g => !isNaN(Number(g.average)) && g.average !== '-');
        if (validGrades.length > 0) {
             average = (validGrades.reduce((acc, g) => acc + Number(g.average), 0) / validGrades.length).toFixed(1);
        }
    }

    let frequency = '-';
    if (grades && grades.length > 0) {
        const gradesWithHours = grades.filter(g => g.totalHours > 0);
        const totalHours = gradesWithHours.reduce((acc, g) => acc + g.totalHours, 0);
        if (totalHours > 0) {
            const weightedSum = gradesWithHours.reduce((acc, g) => acc + (g.frequency * g.totalHours), 0);
            frequency = Math.round(weightedSum / totalHours) + '%';
        } else {
             const validFreqs = grades.filter(g => typeof g.frequency === 'number');
             if (validFreqs.length > 0) frequency = Math.round(validFreqs.reduce((acc, g) => acc + g.frequency, 0) / validFreqs.length) + '%';
        }
    }
    return { average, frequency };
  }, [grades, academicData]);

  // Logic for Next Class & Skipping
  useEffect(() => {
      if (grades.length > 0) {
          const sorted = [...grades].sort((a, b) => (b.limit - b.absences) - (a.limit - a.absences));
          setBestSubjectToSkip(sorted[0]);
      }

      if (schedule.length > 0) {
          const findNext = () => {
              const now = new Date();
              const currentDayInt = now.getDay() + 1;
              const currentMinutes = now.getHours() * 60 + now.getMinutes();
              
              for(let d = 0; d < 7; d++) {
                  let targetDayInt = currentDayInt + d;
                  if (targetDayInt > 7) targetDayInt = (targetDayInt % 7) || 7;

                  const classesThatDay = schedule.filter(c => c.dayInt === targetDayInt);
                  if (d === 0) {
                      const upcoming = classesThatDay.find(c => {
                          const [h, m] = c.startTime.split(':').map(Number);
                          return (h * 60 + m) > currentMinutes;
                      });
                      if (upcoming) return upcoming;
                  } else {
                      if (classesThatDay.length > 0) return classesThatDay[0];
                  }
              }
              return null;
          };

          const upcoming = findNext();
          setNextClass(upcoming);
          
          if (upcoming && grades.length > 0) {
              const match = grades.find(g => 
                  upcoming.name.toLowerCase().includes(g.subject.toLowerCase()) ||
                  g.subject.toLowerCase().includes(upcoming.name.toLowerCase())
              );
              setNextClassGrade(match || null);
          }
      }
  }, [grades, schedule]);

  // Holiday Logic
  const upcomingHoliday = useMemo(() => {
      if (!holidays.length) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const future = holidays.map(h => {
          const [y, m, d] = h.date.split('-').map(Number);
          const hDate = new Date(y, m - 1, d);
          const diffTime = hDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...h, diffDays, jsDate: hDate };
      }).filter(h => h.diffDays >= 0).sort((a, b) => a.diffDays - b.diffDays);
      return future.length > 0 ? future[0] : null;
  }, [holidays]);

  const isTodayHoliday = upcomingHoliday?.diffDays === 0;
  const nextTask = classroomWork[0]; 

  // Carousel Logic
  const handleNextSlide = () => setCarouselIndex((prev) => (prev + 1) % TOTAL_SLIDES);
  const handlePrevSlide = () => setCarouselIndex((prev) => (prev === 0 ? TOTAL_SLIDES - 1 : prev - 1));
  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -50) handleNextSlide();
    else if (info.offset.x > 50) handlePrevSlide();
  };

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

  // Render Carousel Slide
  const renderSlideContent = (index: number) => {
    if (index === 0) {
        // STATUS CARD
        const todayInt = new Date().getDay() + 1;
        const todaysClasses = schedule.filter(s => s.dayInt === todayInt).sort((a,b) => a.startTime.localeCompare(b.startTime));
        return (
            <div className="h-full flex flex-col gap-3 relative overflow-hidden">
                <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-50 ${isDarkMode ? `bg-${primaryColor}-500/20` : `bg-${primaryColor}-300/40`}`} />
                <div className="flex justify-between items-start relative z-10 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg transition-colors backdrop-blur-md ${isDarkMode ? `bg-${primaryColor}-900/40 text-${primaryColor}-300` : `bg-${primaryColor}-100/80 text-${primaryColor}-700`}`}>
                        {nextClass ? 'Próxima Aula' : 'Hoje'}
                    </span>
                    {todaysClasses.length > 0 && <div className={`text-[9px] font-bold px-2 py-1 rounded-lg border backdrop-blur-sm ${isDarkMode ? 'border-white/10 text-white/40' : 'border-black/5 text-black/40'}`}>{todaysClasses.length} Aulas</div>}
                </div>
                <div className="relative z-10 flex-1 flex flex-col min-h-0">
                    <div className="shrink-0 mb-3">
                        {nextClassGrade ? (
                            <div className="bg-gradient-to-br from-transparent to-white/5 rounded-2xl p-0.5 group cursor-pointer" onClick={() => setIsFocusMode(true)}>
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[160px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{nextClass?.name}</div>
                                    <div className="flex items-center gap-1"><Maximize2 size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" /><div className="text-[10px] font-mono opacity-60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[9px]">{nextClass?.startTime}</div></div>
                                </div>
                                {(() => {
                                    const conf = getStatusConfig(nextClassGrade);
                                    const remaining = nextClassGrade.limit - nextClassGrade.absences;
                                    return (
                                        <div className="flex items-center gap-3">
                                            <div className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-sm flex-1 ${conf.color === 'red' || conf.color === secondaryColor ? (isDarkMode ? `bg-${secondaryColor}-500/20 text-${secondaryColor}-400 ring-1 ring-${secondaryColor}-500/20` : `bg-${secondaryColor}-100 text-${secondaryColor}-600 ring-1 ring-${secondaryColor}-200`) : conf.color === 'orange' ? (isDarkMode ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/20' : 'bg-orange-100 text-orange-600 ring-1 ring-orange-200') : (isDarkMode ? `bg-${primaryColor}-500/20 text-${primaryColor}-400 ring-1 ring-${primaryColor}-500/20` : `bg-${primaryColor}-100 text-${primaryColor}-600 ring-1 ring-${primaryColor}-200`)}`}>
                                                {conf.color === 'orange' || conf.color === secondaryColor || conf.color === 'red' ? <AlertTriangle size={14}/> : <CheckCircle size={14} />} {conf.text}
                                            </div>
                                            <div className="flex flex-col items-end leading-none pr-1"><span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{remaining}</span><span className="text-[7px] font-bold uppercase opacity-50">Restantes</span></div>
                                        </div>
                                    )
                                })()}
                            </div>
                        ) : bestSubjectToSkip ? (
                             <div className="px-1">
                                <div className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sugestão</div>
                                <div className={`text-lg font-black leading-tight mb-2 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{bestSubjectToSkip.subject}</div>
                                <div className={`text-[10px] font-bold flex items-center gap-1.5 ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}><ThumbsUp size={12} /><span>{bestSubjectToSkip.limit - bestSubjectToSkip.absences} faltas disponíveis.</span></div>
                             </div>
                        ) : (
                            <div className="py-4 opacity-60 text-xs font-bold text-center border-2 border-dashed border-gray-500/10 rounded-xl">Sem dados de faltas.</div>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 border-t border-dashed border-gray-500/10 pt-2">
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-2 pl-1">Cronograma de Hoje</div>
                        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-1.5">
                            {todaysClasses.length > 0 ? todaysClasses.map((c, i) => (
                                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${nextClass && c.startTime === nextClass.startTime && c.name === nextClass.name ? (isDarkMode ? `bg-white/10 shadow-sm border border-white/5` : `bg-white shadow-sm border border-gray-100`) : 'opacity-70 hover:opacity-100'}`}>
                                    <div className={`w-1 h-8 rounded-full shrink-0 ${nextClass && c.startTime === nextClass.startTime ? `bg-${primaryColor}-500` : `bg-gray-300 dark:bg-white/20`}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[10px] font-bold truncate leading-tight ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{c.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5"><div className="flex items-center gap-1 text-[9px] opacity-70"><Clock size={8} /> {c.startTime}</div><div className="flex items-center gap-1 text-[9px] opacity-70"><MapPin size={8} /> {c.room}</div></div>
                                    </div>
                                </div>
                            )) : <div className="h-full flex flex-col items-center justify-center opacity-30 gap-1"><span className="text-[10px] font-bold uppercase">Folga</span></div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    } else if (index === 1) {
        // HOLIDAY CARD
        return (
            <div className="h-full flex flex-col gap-4">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-200/50'}`} />
                <div className="flex justify-between items-start relative z-10">
                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-200 text-indigo-800'}`}>Próximo Feriado</span>
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center gap-2">
                    {upcomingHoliday ? (
                        <><div className={`text-3xl font-black leading-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>{isTodayHoliday ? "É FERIADO!" : "FALTA POUCO"}</div><div className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>{upcomingHoliday.name}</div><div className={`text-xs font-medium opacity-70 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{isTodayHoliday ? "Aproveite seu dia de folga." : `Em ${upcomingHoliday.diffDays} ${upcomingHoliday.diffDays === 1 ? 'dia' : 'dias'}.`}</div></>
                    ) : (
                        <><div className={`text-2xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>SEM FOLGA</div><div className={`text-xs font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Nenhum feriado próximo encontrado.</div></>
                    )}
                </div>
            </div>
        );
    } else {
        // TASKS CARD
        if (!isClassroomLinked) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-4">
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? `bg-gray-500/10` : `bg-gray-200/50`}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-white/10' : 'bg-gray-100 text-gray-400'}`}><Link2 size={24} /></div>
                    <div><h3 className={`text-sm font-black uppercase mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Classroom</h3><p className="text-[10px] opacity-60 max-w-[150px] mx-auto leading-relaxed">Conecte sua conta Google para ver tarefas aqui.</p></div>
                    <button onClick={onOpenSettings} className={`text-[10px] font-bold uppercase tracking-wide px-4 py-2 rounded-xl transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>Vincular</button>
                </div>
            )
        }
        return (
            <div className="h-full flex flex-col gap-4">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl ${isDarkMode ? `bg-${primaryColor}-500/10` : `bg-${primaryColor}-200/30`}`} />
                <div className="flex justify-between items-start relative z-10"><span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md ${isDarkMode ? `bg-${primaryColor}-900/50 text-${primaryColor}-400` : `bg-${primaryColor}-100 text-${primaryColor}-700`}`}>Classroom</span></div>
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    {nextTask ? (
                        <div className="flex flex-col gap-2">
                            <div><div className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? `text-${primaryColor}-500/80` : `text-${primaryColor}-600`}`}>Próxima Entrega</div><div className={`text-lg font-black leading-tight line-clamp-3 ${isDarkMode ? `text-${primaryColor}-50` : 'text-gray-800'}`}>{nextTask.title}</div></div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block w-fit ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{nextTask.courseName}</div>
                            <div className="pt-2 border-t border-dashed border-gray-500/20 flex justify-between items-center mt-auto"><div className={`text-xs font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>{nextTask.jsDate?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}</div><div className={`text-xs font-bold opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`}>{nextTask.jsDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div></div>
                        </div>
                    ) : (
                        <div className="text-center opacity-50"><Book size={24} className="mx-auto mb-2" /><p className="text-xs font-bold">Nenhuma tarefa pendente.</p></div>
                    )}
                </div>
            </div>
        );
    }
  };

  const frameBg = isDarkMode ? DARK_FRAME : LIGHT_FRAME;
  const frameText = isDarkMode ? 'text-white' : 'text-gray-900';
  const cornerColor = isDarkMode ? DARK_CORNER : LIGHT_CORNER;

  return (
    <div className={`relative w-full h-[100dvh] md:h-screen overflow-hidden flex flex-col md:flex-row font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}>
      
      <AnimatePresence>
          {showAchievementNotification && (
              <AchievementNotification achievement={showAchievementNotification} onClose={() => setShowAchievementNotification(null)} isDarkMode={isDarkMode} />
          )}
      </AnimatePresence>

      <AnimatePresence>
          {isFocusMode && (
              <FocusModeOverlay onClose={() => setIsFocusMode(false)} nextClass={nextClass} isDarkMode={isDarkMode} primaryColor={primaryColor} />
          )}
      </AnimatePresence>
      
      <AnimatePresence>
          {showChangelog && (
              <ChangelogModal onClose={() => setShowChangelog(false)} isDark={isDarkMode} primaryColor={primaryColor} />
          )}
      </AnimatePresence>

      <AnimatePresence>
        {!isLoggedIn && !isLoginModalDismissed && userData && (
          <LoginModal isDarkMode={isDarkMode} primaryColor={primaryColor} onSuapLogin={handleSuapLogin} onGoogleLogin={onLinkClassroom} onDismiss={() => setIsLoginModalDismissed(true)} />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 bg-no-repeat transition-transform duration-1000 ease-out" style={{ backgroundImage: `url(${currentWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center center' }} />
      <div className={`hidden md:block absolute top-0 inset-x-0 h-4 z-50 transition-colors duration-500 ${frameBg}`} />
      <div className={`hidden md:block absolute bottom-0 inset-x-0 h-4 z-40 transition-colors duration-500 ${frameBg}`} />

      {/* LEFT SIDEBAR */}
      <LeftSidebar 
        activeNav={activeNav} 
        onNavClick={handleNavClick} 
        isDarkMode={isDarkMode} 
        onToggleTheme={onToggleTheme} 
        isRefreshing={isRefreshing} 
        onRefresh={handleRefreshClick}
        userData={userData}
        userPhoto={userPhoto}
        primaryColor={primaryColor}
        isPremium={isPremium}
        cornerColor={cornerColor}
        frameBg={frameBg}
        frameText={frameText}
      />

      {/* CENTER CONTENT */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden md:overflow-visible">
        <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-visible pb-24 md:pb-0 w-full">

            {/* Top Navigation Notch */}
            <TopNavBar 
                showContent={showContent}
                isDarkMode={isDarkMode}
                handleNavClick={handleNavClick}
                currentPeriod={currentPeriod}
                primaryColor={primaryColor}
                completionData={completionData}
                classroomStatus={classroomStatus}
                onOpenSettings={onOpenSettings}
                nextClass={nextClass}
                setIsFocusMode={setIsFocusMode}
                handleRefreshClick={handleRefreshClick}
                isRefreshing={isRefreshing}
                isPremium={isPremium}
                userPhoto={userPhoto}
            />

            {/* Main Content Body */}
            <div className="flex flex-col md:block min-h-[80vh] w-full px-4 md:px-0 mt-6 md:mt-0 pb-32 md:pb-0">
                
                {/* Main Student ID Card */}
                <div className="relative md:absolute md:bottom-[380px] md:left-0 md:pl-6 z-20 w-full md:w-auto flex justify-center md:justify-start mb-6 md:mb-0">
                        <motion.div 
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -50 }}
                            transition={{ type: 'spring', stiffness: 50, damping: 15, delay: showContent ? 0.4 : 0 }}
                            className="relative w-full max-w-[320px] md:w-[298px] h-[220px]"
                        >
                            <HolographicCard primaryColor={primaryColor} isPremium={isPremium}>
                                <div>
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1 block">{userData?.nome_usual || "Estudante"}</span>
                                    <h1 className="text-2xl font-black text-white tracking-tighter leading-[1] mb-1 drop-shadow-lg uppercase">{userData?.vinculo?.curso?.split(' ').slice(0, 3).join(' ') || "CURSO"}</h1>
                                    <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium mt-1"><MapPin size={12} /><span>{userData?.campus || "Campus"}</span></div>
                                </div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`px-2.5 py-1.5 bg-${primaryColor}-500/20 border border-${primaryColor}-400/30 rounded-full flex items-center gap-2`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${primaryColor}-400 opacity-75`}></span><span className={`relative inline-flex rounded-full h-2 w-2 bg-${primaryColor}-500`}></span></span><span className={`text-[9px] font-bold text-${primaryColor}-100 uppercase tracking-wide`}>Matriculado</span></div>
                                    <button onClick={() => userData?.matricula && navigator.clipboard.writeText(userData.matricula)} className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"><span className="text-[9px] font-bold text-white/40 uppercase">Mat.</span><span className="font-mono text-xs font-bold text-white/90 tracking-wider border-b border-white/10 group-hover:border-white/50 transition-colors">{userData?.matricula || "---"}</span><Copy size={12} className="text-white/40 group-hover:text-white transition-colors" /></button>
                                </div>
                                <div className="flex items-center gap-3 border-t border-white/10 pt-4"><div className="px-2"><span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Média Geral</span><span className="text-lg font-black text-white">{stats.average}</span></div><div className="w-[1px] h-8 bg-white/10"></div><div className="px-2"><span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Frequência</span><span className={`text-lg font-black text-${primaryColor}-400`}>{stats.frequency}</span></div></div>
                            </HolographicCard>
                        </motion.div>
                </div>

                {/* INTEGRATED CARD BLOCK (Unified Stacked Carousel) */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: showContent ? 0 : -50, opacity: showContent ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15, delay: showContent ? 0.6 : 0 }}
                    className="relative md:absolute md:bottom-4 md:left-0 z-[60] w-full md:w-auto flex justify-center md:justify-start"
                >
                    <div className="hidden md:block absolute -top-[40px] left-0 w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>

                    <div id="tut-carousel" className={`w-full max-w-[320px] md:w-[322px] rounded-[2rem] md:rounded-none md:rounded-tr-[40px] p-0 md:p-6 md:pb-12 relative transition-colors duration-500 bg-transparent md:${frameBg}`}>
                        <div className="relative h-[240px] w-full perspective-1000">
                             {[0, 1, 2].map((idx) => {
                                 const position = (idx - carouselIndex + TOTAL_SLIDES) % TOTAL_SLIDES;
                                 const isTop = position === 0;
                                 const isBehind = position === 1;
                                 const zIndex = isTop ? 30 : isBehind ? 20 : 10;
                                 const scale = isTop ? 1 : isBehind ? 0.94 : 0.88;
                                 const y = isTop ? 0 : isBehind ? -16 : -32;
                                 const opacity = isTop ? 1 : isBehind ? 0.6 : 0.3;

                                 return (
                                     <motion.div 
                                        key={idx}
                                        animate={{ scale, y, zIndex, opacity }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className={`absolute inset-0 rounded-[2rem] p-6 border h-full flex flex-col overflow-hidden shadow-2xl origin-bottom ${isDarkMode ? `bg-slate-900/90 border-white/10 backdrop-blur-xl` : `bg-white/90 border-white/50 backdrop-blur-xl`}`}
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
                        <div className="flex items-center justify-between px-2 mt-3 relative z-40">
                             <div className="flex items-center gap-2">
                                 {[0, 1, 2].map((idx) => (
                                     <button key={idx} onClick={() => setCarouselIndex(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${carouselIndex === idx ? `w-6 bg-${primaryColor}-500` : `w-1.5 ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`}`} />
                                 ))}
                             </div>
                             <button onClick={handleNextSlide} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="hidden md:block absolute bottom-0 -right-[40px] w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>
                </motion.div>

                {/* MOBILE: Secondary Info List */}
                <div className="md:hidden w-full max-w-[320px] mx-auto mt-6 space-y-4 pb-8">
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
                                        <span className={`text-[10px] font-bold ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>{work.jsDate?.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                                    </div>
                                ))}
                                {classroomWork.length === 0 && <p className="text-xs opacity-50 text-center py-2">Nada pendente.</p>}
                             </>
                         ) : (
                             <div className="text-center py-4"><p className="text-xs opacity-50 mb-2">Classroom não vinculado</p><button onClick={onOpenSettings} className={`text-[10px] font-bold uppercase underline ${isDarkMode ? 'text-white' : 'text-black'}`}>Conectar</button></div>
                         )}
                     </div>
                </div>

           </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <RightSidebar 
        rightTab={rightTab}
        onRightTabChange={onRightTabChange}
        isDarkMode={isDarkMode}
        frameBg={frameBg}
        frameText={frameText}
        cornerColor={cornerColor}
        primaryColor={primaryColor}
        showContent={showContent}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        holidays={holidays}
        classroomWork={classroomWork}
        todos={todos}
        onAddTodo={onAddTodo}
        onToggleTodo={onToggleTodo}
        onRemoveTodo={onRemoveTodo}
        unlockedAchievements={unlockedAchievements}
        onOpenProfile={() => handleNavClick(ViewState.PROFILE)}
        schedule={schedule}
        MONTH_NAMES={MONTH_NAMES}
        CURRENT_VERSION={CURRENT_VERSION}
        setShowChangelog={setShowChangelog}
      />
    </div>
  );
};