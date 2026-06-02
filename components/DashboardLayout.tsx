import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  MapPin,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { InvertedCorner } from './InvertedCorner';
import { ViewState, ClassroomWork, SuapProfile, SuapPeriod, GradeInfo, ProcessedClass, SuapCompletionData, Holiday, TodoItem, SuapMeusDadosAluno, Achievement, SupacoNotification, ThemeVariant } from '../types';
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
  rightTab: 'overview' | 'tasks' | 'holidays' | 'achievements' | 'notifications';
  onRightTabChange: (tab: 'overview' | 'tasks' | 'holidays' | 'achievements' | 'notifications') => void;
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
  notifications?: SupacoNotification[];
  onMarkAsRead?: (id: string) => void;
  themeVariant: ThemeVariant;
}

// --- CALENDAR HELPERS ---
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const DashboardLayout: React.FC<DashboardProps> = ({ 
  currentView, onChangeView, isDarkMode, onToggleTheme, currentWallpaper,
  primaryColor, secondaryColor, isLoggedIn, onLogin, userData, academicData,
  currentPeriod, grades, schedule, completionData, holidays = [], classroomWork = [],
  rightTab, onRightTabChange, onOpenSettings, userPhoto, onRefresh,
  isClassroomLinked = false, todos = [], onAddTodo, onToggleTodo, onRemoveTodo,
  classroomStatus, onLinkClassroom, notifications = [], onMarkAsRead, themeVariant
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
  const [nextClass, setNextClass] = useState<ProcessedClass | null>(null);
  const [nextClassGrade, setNextClassGrade] = useState<GradeInfo | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Premium check
  const isPremium = localStorage.getItem('suap_user_is_premium') === 'true';

  // Determine if content should be shown
  const showContent = isLoggedIn || (!!userData && isLoginModalDismissed);
  
  const isMono = themeVariant === 'monochrome';

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

  // Logic for Next Class
  useEffect(() => {
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

  // Critical absences count for badge
  const criticalAbsencesCount = useMemo(() =>
      grades.filter(g => g.limit > 0 && ((g.limit - g.absences) <= 2)).length
  , [grades]);

  // Calendar Event Logic
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
          w.jsDate && w.jsDate.getDate() === date.getDate() &&
          w.jsDate.getMonth() === date.getMonth() && w.jsDate.getFullYear() === date.getFullYear()
      );
      return { classes, holiday, tasks };
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

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

  // Helpers de formatação
  const shortRoom = (room: string): string => {
    if (!room || room === 'N/A') return room;
    const salaMatch = room.match(/Sala de Aula\s+(\d+)/i);
    if (salaMatch) return `Sala ${salaMatch[1]}`;
    const labMatch = room.match(/(Lab(?:orat[oó]rio)?\s+\d+)/i);
    if (labMatch) return labMatch[1];
    const first = room.split(' - ')[0];
    return first.length <= 12 ? first : first.slice(0, 12) + '…';
  };

  const cleanSubject = (name: string): string =>
    name.replace(/\s*\(Curso\s+\d+\)/gi, '').trim();

  // Dashboard cards — substitui o carrossel
  const renderDashboardCards = () => {
    const todayInt = new Date().getDay() + 1;
    const todaysClasses = schedule.filter(s => s.dayInt === todayInt).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const sortedByAbsences = [...grades].filter(g => g.limit > 0).sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));

    const cardBase = `rounded-2xl p-4 border transition-colors ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-white/20'} shadow-sm backdrop-blur-sm`;
    const labelColor = isMono ? (isDarkMode ? 'text-gray-400' : 'text-gray-500') : (isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`);

    return (
      <div className="flex flex-col gap-3 w-full">

        {/* Card: Próxima Aula */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>Próxima Aula</span>
            {nextClass && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-white/10 text-white/50' : 'bg-black/5 text-black/40'}`}>
                {nextClass.startTime}
              </span>
            )}
          </div>
          {nextClass ? (
            <div>
              <div className={`text-sm font-black leading-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {cleanSubject(nextClass.name)}
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <MapPin size={9} /> {shortRoom(nextClass.room)}
                </div>
                {nextClassGrade && (() => {
                  const conf = getStatusConfig(nextClassGrade);
                  const remaining = nextClassGrade.limit - nextClassGrade.absences;
                  const isAlert = conf.color === 'orange' || conf.color === secondaryColor;
                  return (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ml-auto
                      ${isMono ? 'bg-white/10 text-white' : (isDarkMode ? `bg-${conf.color}-500/20 text-${conf.color}-400` : `bg-${conf.color}-100 text-${conf.color}-700`)}`}>
                      {isAlert ? <AlertTriangle size={9} /> : <CheckCircle size={9} />}
                      {remaining < 0 ? 'Reprovado' : `${remaining} restantes`}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className={`text-xs opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nenhuma aula próxima.</div>
          )}
        </div>

        {/* Card: Faltas */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>Faltas</span>
            <button
              onClick={() => onChangeView(ViewState.GRADES)}
              className={`text-[9px] font-bold uppercase tracking-wide flex items-center gap-0.5 transition-colors
                ${isDarkMode ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}
            >
              Ver boletim <ChevronRight size={10} />
            </button>
          </div>
          {sortedByAbsences.length > 0 ? (
            <div className="space-y-2.5">
              {sortedByAbsences.slice(0, 5).map((g) => {
                const remaining = g.limit - g.absences;
                const pct = Math.min(g.absences / g.limit, 1);
                const isOver = remaining < 0;
                const isCritical = !isOver && remaining <= 2;
                const isCaution = !isOver && !isCritical && remaining <= 4;
                const barColor = isOver || isCritical ? 'bg-red-500' : isCaution ? 'bg-orange-400' : (isMono ? (isDarkMode ? 'bg-white/60' : 'bg-black/30') : `bg-${primaryColor}-500`);
                const countColor = isOver || isCritical ? (isDarkMode ? 'text-red-400' : 'text-red-500') : isCaution ? (isDarkMode ? 'text-orange-400' : 'text-orange-500') : (isDarkMode ? 'text-gray-400' : 'text-gray-500');
                const statusDot = isOver || isCritical ? 'bg-red-500' : isCaution ? 'bg-orange-400' : (isMono ? (isDarkMode ? 'bg-white/40' : 'bg-black/20') : `bg-${primaryColor}-400`);
                return (
                  <div key={g.subject} className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {cleanSubject(g.subject).split(' ').slice(0, 3).join(' ')}
                        </span>
                        <span className={`text-[10px] font-black shrink-0 ${countColor}`}>
                          {isOver ? 'Reprovado' : `${remaining} restam`}
                        </span>
                      </div>
                      <div className={`h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {sortedByAbsences.length > 5 && (
                <div className={`text-[9px] opacity-40 font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  +{sortedByAbsences.length - 5} em situação tranquila
                </div>
              )}
            </div>
          ) : (
            <div className={`text-xs opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dados de faltas não disponíveis.</div>
          )}
        </div>

        {/* Card: Hoje */}
        <div className={cardBase}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>Hoje</span>
            {upcomingHoliday && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                {isTodayHoliday ? 'Feriado!' : `Feriado em ${upcomingHoliday.diffDays}d`}
              </span>
            )}
          </div>
          {todaysClasses.length > 0 ? (
            <div className="space-y-1">
              {todaysClasses.map((c, i) => {
                const isNext = nextClass?.startTime === c.startTime && nextClass?.name === c.name;
                return (
                  <div key={i} className={`px-2.5 py-2 rounded-xl transition-colors
                    ${isNext ? (isDarkMode ? 'bg-white/10 border border-white/10' : 'bg-gray-100 border border-gray-200') : 'opacity-55'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-0.5 h-full min-h-[28px] rounded-full self-stretch shrink-0 ${isNext ? (isMono ? (isDarkMode ? 'bg-white' : 'bg-black') : `bg-${primaryColor}-500`) : (isDarkMode ? 'bg-white/15' : 'bg-gray-300')}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold truncate leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {cleanSubject(c.name)}
                        </div>
                        <div className={`flex items-center gap-2 mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          <span className="flex items-center gap-0.5 text-[9px]"><Clock size={8} /> {c.startTime}</span>
                          <span className="flex items-center gap-0.5 text-[9px]"><MapPin size={8} /> {shortRoom(c.room)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-xs opacity-40 text-center py-1 font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Folga hoje</div>
          )}
        </div>

      </div>
    );
  };

  const frameBg = isMono ? (isDarkMode ? 'bg-black' : 'bg-white') : (isDarkMode ? DARK_FRAME : LIGHT_FRAME);
  const frameText = isDarkMode ? 'text-white' : 'text-gray-900';
  const cornerColor = isMono ? (isDarkMode ? '#000000' : '#ffffff') : (isDarkMode ? DARK_CORNER : LIGHT_CORNER);

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
          <LoginModal
            isDarkMode={isDarkMode}
            primaryColor={primaryColor}
            onSuapLogin={handleSuapLogin}
            onGoogleLogin={onLinkClassroom}
            onDismiss={() => setIsLoginModalDismissed(true)}
            onManualLogin={async () => { onLogin(); return true; }}
          />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 bg-no-repeat transition-transform duration-1000 ease-out" style={{ backgroundImage: `url(${currentWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center center' }} />
      
      {/* Dynamic Frames */}
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
        themeVariant={themeVariant}
        criticalAbsencesCount={criticalAbsencesCount}
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
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onViewAllNotifications={() => onRightTabChange('notifications')}
                themeVariant={themeVariant}
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
                            <HolographicCard primaryColor={primaryColor} isPremium={isPremium} themeVariant={themeVariant}>
                                <div>
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1 block">{userData?.nome_usual || "Estudante"}</span>
                                    <h1 className="text-2xl font-black text-white tracking-tighter leading-[1] mb-1 drop-shadow-lg uppercase">{userData?.vinculo?.curso?.split(' ').slice(0, 3).join(' ') || "CURSO"}</h1>
                                    <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium mt-1"><MapPin size={12} /><span>{userData?.campus || "Campus"}</span></div>
                                </div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`px-2.5 py-1.5 ${isMono ? 'bg-white/10 border border-white/20' : `bg-${primaryColor}-500/20 border border-${primaryColor}-400/30`} rounded-full flex items-center gap-2`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMono ? 'bg-white' : `bg-${primaryColor}-400`}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${isMono ? 'bg-white' : `bg-${primaryColor}-500`}`}></span></span><span className={`text-[9px] font-bold text-white uppercase tracking-wide`}>Matriculado</span></div>
                                    <button onClick={() => userData?.matricula && navigator.clipboard.writeText(userData.matricula)} className="flex items-center gap-2 group hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer"><span className="text-[9px] font-bold text-white/40 uppercase">Mat.</span><span className="font-mono text-xs font-bold text-white/90 tracking-wider border-b border-white/10 group-hover:border-white/50 transition-colors">{userData?.matricula || "---"}</span><Copy size={12} className="text-white/40 group-hover:text-white transition-colors" /></button>
                                </div>
                                <div className="flex items-center gap-3 border-t border-white/10 pt-4"><div className="px-2"><span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Média Geral</span><span className="text-lg font-black text-white">{stats.average}</span></div><div className="w-[1px] h-8 bg-white/10"></div><div className="px-2"><span className="text-[9px] text-white/60 uppercase font-bold block mb-0.5">Frequência</span><span className={`text-lg font-black ${isMono ? 'text-white' : `text-${primaryColor}-400`}`}>{stats.frequency}</span></div></div>
                            </HolographicCard>
                        </motion.div>
                </div>

                {/* DASHBOARD CARDS — substitui o carrossel */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: showContent ? 0 : -50, opacity: showContent ? 1 : 0 }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15, delay: showContent ? 0.6 : 0 }}
                    className="relative md:absolute md:bottom-4 md:left-0 z-[60] w-full md:w-auto flex justify-center md:justify-start"
                >
                    <div className="hidden md:block absolute -top-[40px] left-0 w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>

                    <div id="tut-carousel" className={`w-full max-w-[320px] md:w-[322px] md:rounded-none md:rounded-tr-[40px] p-0 md:p-6 md:pb-12 relative transition-colors duration-500 bg-transparent md:${frameBg}`}>
                        {showContent ? renderDashboardCards() : (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`h-20 rounded-2xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block absolute bottom-0 -right-[40px] w-[40px] h-[40px]">
                        <InvertedCorner position="bottom-left" size={40} fill={cornerColor} />
                    </div>
                </motion.div>

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
        getEventsForDate={getEventsForDate}
        days={calendarDays}
        MONTH_NAMES={MONTH_NAMES}
        CURRENT_VERSION={CURRENT_VERSION}
        setShowChangelog={setShowChangelog}
        themeVariant={themeVariant}
      />
    </div>
  );
};