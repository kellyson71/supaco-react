

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle, Clock, MapPin, Award, Briefcase, User, Calendar, GraduationCap, Settings, Monitor, Moon, Sun, ToggleLeft, ToggleRight, Link2, ExternalLink, Cpu, ShieldCheck, Eye, EyeOff, Key, Image as ImageIcon, Check, BookOpen, Palette, RefreshCw, Mail, Fingerprint, FileText, UserSquare2, Percent, Calculator, Flag, Target, CheckSquare, LogOut, ArrowRight, Copy, Clipboard, HelpCircle, Book, CalendarClock, ChevronRight, MoreHorizontal, Save, Download, Droplet, Coffee, Aperture, BookMarked, Users, Rocket, Zap, TrendingUp, TrendingDown, Minus, Sparkles, Camera, PenLine, Trash2, Cloud, UploadCloud, Search, Shield, ChevronDown, Trophy, Medal, Brain, History, Crown, CreditCard, Laptop, Smartphone, LayoutTemplate, HardDrive, Heart, Bell } from 'lucide-react';
import { ViewState, GradeInfo, ThemeVariant, SuapProfile, SuapMeusDadosAluno, ProcessedClass, SuapCompletionData, CompletionCategory, ClassroomCourse, ClassroomWork, PerformanceSettings, SuapPeriod, Achievement } from '../types';
import { SecureStorage } from '../services/SecureStorage';
import { ACHIEVEMENTS_LIST, getRarityColor, getRarityLabel } from '../achievements';
import { GradesModal } from './modals/GradesModal';
import { AbsencesModal } from './modals/AbsencesModal';
import { ScheduleModal } from './modals/ScheduleModal';
import { ClassroomModal } from './modals/ClassroomModal';
import { ConclusionModal } from './modals/ConclusionModal';
import { AdminModal } from './modals/AdminModal';

interface OverlayViewProps {
  view: ViewState;
  onClose: () => void;
  onChangeView: (view: ViewState) => void;
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
  onLogout: () => void;
  autoExpandClassroom: boolean;
  onAutoExpandClassroom: (v: boolean) => void;
  initialProfileTab?: 'profile' | 'settings' | 'wallpaper' | 'performance' | 'achievements';
  onInstallPwa?: () => void;
  canInstall?: boolean;
  performanceSettings?: PerformanceSettings;
  onUpdatePerformance?: (settings: PerformanceSettings) => void;
  // Profile Photo Props
  customPhotoUrl?: string;
  onUpdateCustomPhoto?: (url: string) => void;
  useCustomPhoto?: boolean;
  onToggleCustomPhoto?: (enable: boolean) => void;
  // Period Selection
  periods?: SuapPeriod[];
  viewingPeriod?: SuapPeriod | null;
  onPeriodChange?: (semestre: string) => void;
  // Premium
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
  // Classroom
  classroomWork?: ClassroomWork[];
  isClassroomLinked?: boolean;
  onLinkClassroom?: () => void;
  classroomStatus?: 'connected' | 'disconnected' | 'expired';
  // New Settings Props
  privacyMode?: boolean;
  onTogglePrivacyMode?: (v: boolean) => void;
  startView?: ViewState;
  onUpdateStartView?: (v: ViewState) => void;
  notificationsEnabled?: boolean;
  onToggleNotifications?: (v: boolean) => void;
}

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg",
    "https://images.alphacoders.com/135/thumb-1920-1350151.png",
    "https://images8.alphacoders.com/134/thumb-1920-1345659.png",
    "https://images.alphacoders.com/644/thumb-1920-644146.jpg",
    "https://images8.alphacoders.com/135/thumb-1920-1351412.png",
    "https://images7.alphacoders.com/135/thumb-1920-1359055.png",
    "https://images6.alphacoders.com/135/thumb-1920-1351414.png",
    "https://images6.alphacoders.com/134/thumb-1920-1345656.png",
    "https://images7.alphacoders.com/966/thumb-1920-966372.jpg",
    "https://images4.alphacoders.com/138/thumb-1920-1383047.jpg",
    "https://images8.alphacoders.com/138/thumb-1920-1382989.png",
    "https://images6.alphacoders.com/132/thumb-1920-1323578.png"
];

const PROFILE_PRESETS = [
    "https://i.pinimg.com/736x/d9/31/6b/d9316bb79323a47e5916d25fdc75b66d.jpg",
    "https://i.pinimg.com/1200x/d8/c7/49/d8c7496b4e8595e5483df105b075bfae.jpg",
    "https://i.pinimg.com/736x/72/e2/67/72e26742dea1322472577603d66439db.jpg",
    "https://i.pinimg.com/736x/fb/86/70/fb8670f005fdd6c56ec6346f1bd86b2d.jpg",
    "https://i.pinimg.com/736x/1a/63/13/1a6313cde710d43b3a2c30866c50b0c2.jpg"
];

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";
const CURRENT_VERSION = "2.0.0";

const VIEW_ORDER = [
  ViewState.GRADES,
  ViewState.ABSENCES,
  ViewState.SCHEDULE,
  ViewState.CLASSROOM,
  ViewState.CONCLUSION,
  ViewState.ADMIN,
  ViewState.PROFILE
];

// Reusable Components for Profile/Settings
const ToggleSwitch = ({ checked, onChange, color }: { checked: boolean, onChange: () => void, color: string }) => (
    <button 
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-colors relative ${checked ? `bg-${color}-500` : 'bg-gray-300 dark:bg-white/10'}`}
    >
        <motion.div 
            layout 
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm`} 
            style={{ x: checked ? 20 : 0 }}
        />
    </button>
);

const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div className="flex items-center gap-2 mb-4 opacity-70">
        <Icon size={16} className={`text-${color}-500`} />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
);

export const ContentView: React.FC<OverlayViewProps> = ({ view, onClose, onChangeView, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, grades, schedule, completionData, onLogout, autoExpandClassroom, onAutoExpandClassroom, initialProfileTab, onInstallPwa, canInstall, performanceSettings, onUpdatePerformance, customPhotoUrl = '', onUpdateCustomPhoto, useCustomPhoto = false, onToggleCustomPhoto, periods, viewingPeriod, onPeriodChange, isPremium, onOpenPremiumModal, classroomWork = [], isClassroomLinked = false, onLinkClassroom, classroomStatus, privacyMode, onTogglePrivacyMode, startView, onUpdateStartView, notificationsEnabled, onToggleNotifications }) => {
  if (view === ViewState.DASHBOARD) return null;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bgClass = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-100';
  
  // Adjusted inner background for content areas
  const innerBgClass = view === ViewState.PROFILE 
      ? 'bg-transparent' // Profile handles its own backgrounds
      : (isDarkMode ? 'bg-black/20' : 'bg-gray-50/50');

  const originY = view === ViewState.PROFILE ? '88%' : '50%';

  const variants = isMobile ? {
      initial: { top: '100%', left: 0, width: '100%', height: '100%', borderRadius: '24px 24px 0 0', opacity: 1 },
      animate: { top: '0%', left: 0, width: '100%', height: '100%', borderRadius: '0px', opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
      exit: { top: '100%', opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } }
  } : {
      initial: { top: originY, left: '3rem', width: '48px', height: '48px', borderRadius: '24px', opacity: 0, scale: 0.5 },
      animate: { top: '6vh', left: '7rem', width: 'calc(100vw - 8rem)', height: '88vh', borderRadius: '40px', opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 250, damping: 25, mass: 0.8 } },
      exit: { top: originY, left: '3rem', width: '48px', height: '48px', borderRadius: '24px', opacity: 0, scale: 0.5, transition: { duration: 0.3 } }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (!isMobile) return;
    if (info.offset.y > 100) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <motion.div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div 
        className={`${bgClass} shadow-2xl overflow-hidden absolute z-50 flex flex-col pointer-events-auto border ${borderClass}`}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        drag={isMobile ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        {isMobile && <div className={`w-12 h-1.5 rounded-full mx-auto mt-3 mb-1 shrink-0 ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />}

        {/* HEADER */}
        {view !== ViewState.PROFILE && (
            <div className={`h-16 md:h-20 border-b ${borderClass} flex items-center justify-between px-6 md:px-8 ${bgClass} shrink-0`}>
                <div className="flex-1 min-w-0 pr-4">
                    <h2 className={`text-xl md:text-3xl font-black tracking-tight uppercase ${textClass} truncate`}>
                        {view === ViewState.GRADES ? 'Boletim Escolar' : 
                        view === ViewState.ABSENCES ? 'Faltas e Frequência' : 
                        view === ViewState.SCHEDULE ? 'Horário Semanal' :
                        view === ViewState.CLASSROOM ? 'Google Classroom' :
                        view === ViewState.CONCLUSION ? 'Progresso do Curso' :
                        view === ViewState.ADMIN ? 'Painel Administrativo' : ''}
                    </h2>
                </div>
                <button onClick={onClose} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                    <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                </button>
            </div>
        )}

        {/* CONTENT BODY */}
        <div className={`flex-1 overflow-hidden relative flex flex-col ${innerBgClass}`}>
            {view === ViewState.GRADES && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <GradesModal 
                        grades={grades} 
                        periods={periods}
                        selectedPeriod={viewingPeriod}
                        onSelectPeriod={onPeriodChange}
                        isDark={isDarkMode} 
                        primaryColor={primaryColor} 
                        secondaryColor={secondaryColor} 
                    />
                </div>
            )}
            
            {view === ViewState.ABSENCES && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <AbsencesModal 
                        grades={grades} 
                        isDark={isDarkMode} 
                        primaryColor={primaryColor} 
                        secondaryColor={secondaryColor} 
                    />
                </div>
            )}
            
            {view === ViewState.SCHEDULE && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <ScheduleModal 
                        schedule={schedule} 
                        isDark={isDarkMode} 
                        accentColor={primaryColor} 
                        secondaryColor={secondaryColor} 
                    />
                </div>
            )}
            
            {view === ViewState.CLASSROOM && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <ClassroomModal 
                        classroomWork={classroomWork} 
                        isClassroomLinked={isClassroomLinked} 
                        onRequestSettings={onLinkClassroom || (() => onChangeView(ViewState.PROFILE))} 
                        isDark={isDarkMode} 
                        accentColor={primaryColor} 
                        secondaryColor={secondaryColor}
                    />
                </div>
            )}
            
            {view === ViewState.CONCLUSION && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <ConclusionModal 
                        data={completionData} 
                        isDark={isDarkMode} 
                        accentColor={primaryColor} 
                        secondaryColor={secondaryColor} 
                    />
                </div>
            )}
            
            {view === ViewState.ADMIN && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <AdminModal isDark={isDarkMode} accentColor={primaryColor} />
                </div>
            )}
            
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
                    onLogout={onLogout}
                    autoExpandClassroom={autoExpandClassroom}
                    onResetAutoExpand={() => onAutoExpandClassroom(false)}
                    initialTab={initialProfileTab}
                    onInstallPwa={onInstallPwa}
                    canInstall={canInstall}
                    performanceSettings={performanceSettings}
                    onUpdatePerformance={onUpdatePerformance}
                    customPhotoUrl={customPhotoUrl}
                    onUpdateCustomPhoto={onUpdateCustomPhoto}
                    useCustomPhoto={useCustomPhoto}
                    onToggleCustomPhoto={onToggleCustomPhoto}
                    isPremium={isPremium}
                    onOpenPremiumModal={onOpenPremiumModal}
                    onClose={onClose}
                    onLinkClassroom={onLinkClassroom}
                    isClassroomLinked={isClassroomLinked}
                    classroomStatus={classroomStatus}
                    // New Props
                    privacyMode={privacyMode}
                    onTogglePrivacyMode={onTogglePrivacyMode}
                    startView={startView}
                    onUpdateStartView={onUpdateStartView}
                    notificationsEnabled={notificationsEnabled}
                    onToggleNotifications={onToggleNotifications}
                />
            )}
        </div>
      </motion.div>
    </div>
  );
};

const ProfileContent = ({ 
    isDark, 
    onToggleTheme, 
    currentWallpaper, 
    onWallpaperChange, 
    themeVariant, 
    onThemeVariantChange, 
    accentColor, 
    secondaryColor, 
    userData, 
    academicData, 
    grades, 
    onLogout, 
    initialTab, 
    onInstallPwa, 
    canInstall, 
    performanceSettings, 
    onUpdatePerformance,
    customPhotoUrl,
    onUpdateCustomPhoto,
    useCustomPhoto,
    onToggleCustomPhoto,
    isPremium,
    onOpenPremiumModal,
    onClose,
    onLinkClassroom,
    isClassroomLinked,
    classroomStatus,
    privacyMode, onTogglePrivacyMode, startView, onUpdateStartView, notificationsEnabled, onToggleNotifications
}: any) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const profileImg = useCustomPhoto && customPhotoUrl 
        ? customPhotoUrl 
        : (userData?.url_foto_150x200
            ? (userData.url_foto_150x200.startsWith('http') ? userData.url_foto_150x200 : `https://suap.ifrn.edu.br${userData.url_foto_150x200}`)
            : (userData?.foto 
                ? (userData.foto.startsWith('http') ? userData.foto : `https://suap.ifrn.edu.br${userData.foto}`)
                : DEFAULT_PROFILE_IMG
              )
          );

    const premiumBorderLines = isPremium ? {
        content: '""',
        position: 'absolute' as const,
        inset: 0,
        borderRadius: '100%',
        borderTop: '3px solid #ef4444',    
        borderLeft: '3px solid #eab308',   
        borderBottom: '3px solid #3b82f6', 
        borderRight: '1.5px solid #22c55e',
        pointerEvents: 'none' as const
    } : {};

    const TABS = [
        { id: 'profile', label: 'Perfil', icon: User },
        { id: 'settings', label: 'Ajustes', icon: Settings },
        { id: 'wallpaper', label: 'Aparência', icon: Palette },
        { id: 'achievements', label: 'Troféus', icon: Trophy },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-gray-50/50 dark:bg-black/20">
            
            <div className={`shrink-0 flex flex-col md:w-64 lg:w-72 p-6 border-b md:border-b-0 md:border-r ${isDark ? 'border-white/10 bg-slate-900/50' : 'border-gray-200 bg-white/50'}`}>
                <div className="hidden md:flex flex-col items-center text-center mb-8">
                    <div className="relative group cursor-pointer mb-4">
                        <div className="relative p-[3px]">
                             {isPremium && <div style={premiumBorderLines} />}
                             <div className={`w-20 h-20 rounded-full overflow-hidden shadow-lg transition-transform group-hover:scale-105 relative z-10 ${isDark ? 'bg-black' : 'bg-white'} ${!isPremium ? (isDark ? 'border-2 border-white/10' : 'border-2 border-white') : ''}`}>
                                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
                             </div>
                        </div>
                        {isPremium && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-md z-20">
                                <Crown size={12} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <h2 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{userData?.nome_usual || 'Estudante'}</h2>
                    <p className="text-xs font-medium opacity-50 mt-1">{userData?.matricula}</p>
                </div>

                <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible hide-scrollbar pb-2 md:pb-0">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all shrink-0 md:shrink
                                    ${isActive 
                                        ? (isDark ? 'text-white' : 'text-gray-900') 
                                        : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}
                                `}
                            >
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTabPill"
                                        className={`absolute inset-0 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white shadow-sm border border-gray-100'}`}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <tab.icon size={18} className="relative z-10" />
                                <span className="relative z-10 hidden md:inline">{tab.label}</span>
                                <span className="relative z-10 md:hidden">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="hidden md:flex flex-col gap-2 mt-auto pt-6 border-t border-dashed border-gray-500/20">
                     <button onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}>
                        <ArrowRight size={18} className="rotate-180" /> Voltar
                     </button>
                     <button onClick={onLogout} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors text-red-500 hover:bg-red-500/10`}>
                        <LogOut size={18} /> Sair
                     </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll relative p-4 md:p-8 lg:p-10">
                 <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/10 z-50">
                    <X size={20} className={isDark ? 'text-white' : 'text-black'} />
                 </button>

                 <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                        <ProfileTabContent 
                            key="profile" 
                            isDark={isDark} 
                            accentColor={accentColor} 
                            userData={userData} 
                            academicData={academicData} 
                            profileImg={profileImg}
                            isPremium={isPremium}
                            customPhotoUrl={customPhotoUrl}
                            onUpdateCustomPhoto={onUpdateCustomPhoto}
                            useCustomPhoto={useCustomPhoto}
                            onToggleCustomPhoto={onToggleCustomPhoto}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <SettingsTabContent 
                            key="settings" 
                            isDark={isDark} 
                            accentColor={accentColor} 
                            performanceSettings={performanceSettings} 
                            onUpdatePerformance={onUpdatePerformance}
                            customPhotoUrl={customPhotoUrl}
                            onUpdateCustomPhoto={onUpdateCustomPhoto}
                            useCustomPhoto={useCustomPhoto}
                            onToggleCustomPhoto={onToggleCustomPhoto}
                            onInstallPwa={onInstallPwa}
                            canInstall={canInstall}
                            isPremium={isPremium}
                            onOpenPremiumModal={onOpenPremiumModal}
                            userData={userData}
                            onLinkClassroom={onLinkClassroom}
                            isClassroomLinked={isClassroomLinked}
                            classroomStatus={classroomStatus}
                            // New Props
                            privacyMode={privacyMode}
                            onTogglePrivacyMode={onTogglePrivacyMode}
                            startView={startView}
                            onUpdateStartView={onUpdateStartView}
                            notificationsEnabled={notificationsEnabled}
                            onToggleNotifications={onToggleNotifications}
                        />
                    )}
                    {activeTab === 'wallpaper' && (
                        <ThemeTabContent 
                            key="theme" 
                            isDark={isDark} 
                            accentColor={accentColor}
                            onToggleTheme={onToggleTheme} 
                            currentWallpaper={currentWallpaper} 
                            onWallpaperChange={onWallpaperChange} 
                            themeVariant={themeVariant} 
                            onThemeVariantChange={onThemeVariantChange}
                        />
                    )}
                    {activeTab === 'achievements' && (
                        <AchievementsTabContent 
                            key="achievements" 
                            isDark={isDark} 
                            accentColor={accentColor} 
                            grades={grades} 
                            userData={userData} 
                        />
                    )}
                 </AnimatePresence>
                 
                 <div className="md:hidden mt-8 pt-6 border-t border-dashed border-gray-500/20">
                    <button onClick={onLogout} className="w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500/10">
                        Encerrar Sessão
                    </button>
                    <div className="text-center mt-4 text-[10px] font-mono opacity-30">SUPACO v{CURRENT_VERSION} • Developed by Electron</div>
                 </div>
            </div>
        </div>
    );
};

const ProfileTabContent = ({ isDark, accentColor, userData, academicData, profileImg, isPremium, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto }: any) => {
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8">
            <div className={`relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 border shadow-2xl ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'}`}>
                <div className={`absolute top-0 right-0 w-96 h-96 bg-${accentColor}-500/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`} />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="shrink-0 relative group">
                        <div className="relative">
                            {isPremium && (
                                <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" 
                                     style={{ margin: '-4px', borderTop: '4px solid #ef4444', borderLeft: '4px solid #eab308', borderBottom: '4px solid #3b82f6', borderRight: '2px solid #22c55e' }} 
                                />
                            )}
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 ${isDark ? 'bg-black' : 'bg-gray-50'} ${!isPremium ? (isDark ? 'border-4 border-white/10' : 'border-4 border-white') : ''}`}>
                                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
                            </div>
                        </div>
                        <button onClick={() => setShowPhotoModal(true)} className="absolute inset-0 rounded-[2.5rem] bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            <Camera size={24} className="text-white" />
                        </button>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h1 className={`text-3xl md:text-5xl font-black tracking-tighter leading-[0.9] mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{userData?.nome_usual || 'Estudante'}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>{userData?.vinculo?.curso || 'Curso N/A'}</span>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>{userData?.campus || 'Campus'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
                             <div className={`p-4 rounded-2xl border text-left ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                 <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Matrícula</div>
                                 <div className="font-mono font-bold text-sm opacity-90">{userData?.matricula}</div>
                             </div>
                             <div className={`p-4 rounded-2xl border text-left ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                 <div className="text-[10px] font-bold uppercase opacity-50 mb-1">CPF</div>
                                 <div className="font-mono font-bold text-sm opacity-90">***.***.***-**</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <SectionHeader icon={Brain} title="Desempenho Acadêmico" color={accentColor} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`md:col-span-2 p-6 rounded-[2rem] border relative overflow-hidden group ${isDark ? `bg-${accentColor}-500/10 border-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100`}`}>
                        <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <div className={`text-6xl md:text-7xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{academicData?.ira?.replace('.', ',') || '---'}</div>
                                <div className={`text-sm font-bold uppercase tracking-widest mt-1 ${isDark ? `text-${accentColor}-200` : `text-${accentColor}-700`}`}>I.R.A. Geral</div>
                            </div>
                            <div className={`p-4 rounded-2xl ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-200 text-${accentColor}-700`}`}><TrendingUp size={32} /></div>
                        </div>
                    </div>
                    <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                        <div className={`p-3 rounded-2xl w-fit mb-4 ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}`}><CheckCircle size={24} /></div>
                        <div>
                            <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Situação</div>
                            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{academicData?.situacao || 'Matriculado'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {showPhotoModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={`relative w-full max-w-md p-6 rounded-[2rem] border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Alterar Foto</h3>
                                <button onClick={() => setShowPhotoModal(false)} className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}><X size={18} /></button>
                            </div>
                            <div className="space-y-6">
                                <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <div>
                                        <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Usar Foto Personalizada</div>
                                        <div className="text-[10px] opacity-60">Substitui a foto oficial do SUAP</div>
                                    </div>
                                    <ToggleSwitch checked={useCustomPhoto} onChange={() => onToggleCustomPhoto(!useCustomPhoto)} color={accentColor} />
                                </div>
                                {useCustomPhoto && (
                                    <div className="space-y-4 pt-2">
                                        <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                            <Link2 size={16} className="opacity-40" />
                                            <input type="text" value={customPhotoUrl} onChange={(e) => onUpdateCustomPhoto(e.target.value)} placeholder="https://imgur.com/..." className={`bg-transparent outline-none w-full text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const SettingsTabContent = ({ isDark, accentColor, performanceSettings, onUpdatePerformance, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto, onInstallPwa, canInstall, isPremium, onOpenPremiumModal, userData, onLinkClassroom, isClassroomLinked, classroomStatus, privacyMode, onTogglePrivacyMode, startView, onUpdateStartView, notificationsEnabled, onToggleNotifications }: any) => {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
            {!isPremium ? (
                <div onClick={onOpenPremiumModal} className="relative overflow-hidden rounded-[2rem] p-8 cursor-pointer group shadow-xl transition-transform hover:scale-[1.01]">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider mb-3">
                                <Crown size={12} fill="currentColor" /> Recomendado
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2">Seja Premium</h3>
                            <p className="text-white/80 text-sm font-medium max-w-sm">Desbloqueie IA ilimitada, temas exclusivos e suporte o desenvolvimento.</p>
                        </div>
                        <div className="hidden md:flex h-16 w-16 rounded-full bg-white text-orange-500 items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><ArrowRight size={28} /></div>
                    </div>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-[2rem] p-8 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                             <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider mb-3 shadow-sm"><Check size={12} strokeWidth={4} /> Assinatura Ativa</div>
                            <h3 className="text-3xl font-black text-white mb-2 flex items-center gap-2">Membro Premium <Crown size={28} fill="currentColor" className="text-white" /></h3>
                            <p className="text-white/90 text-sm font-medium max-w-sm leading-relaxed">Muito obrigado pelo seu apoio!</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* GOOGLE CLASSROOM SETTINGS */}
            <div>
                <SectionHeader icon={Monitor} title="Integrações" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${classroomStatus === 'connected' ? 'bg-green-500/20 text-green-500' : (classroomStatus === 'expired' ? 'bg-red-500/20 text-red-500' : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'))}`}>
                                <Monitor size={18} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Google Classroom</div>
                                <div className="text-[10px] font-medium opacity-60">
                                    {classroomStatus === 'connected' ? 'Sincronizado' : (classroomStatus === 'expired' ? 'Sessão Expirada' : 'Não conectado')}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onLinkClassroom} 
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors
                                ${classroomStatus === 'connected' 
                                    ? `bg-green-500/10 text-green-500` 
                                    : (classroomStatus === 'expired' 
                                        ? `bg-red-500 text-white animate-pulse` 
                                        : `bg-${accentColor}-500 text-white`)}
                            `}
                        >
                            {classroomStatus === 'connected' ? 'Reconectar' : (classroomStatus === 'expired' ? 'Reconectar Agora' : 'Conectar')}
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <SectionHeader icon={Zap} title="Performance & Visual" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {[{ key: 'reduceMotion', label: 'Reduzir Movimento', desc: 'Remove animações para maior fluidez.' }, { key: 'disableBlur', label: 'Desativar Blur', desc: 'Remove transparências (Economia de Bateria).' }, { key: 'disableGlow', label: 'Modo Simples', desc: 'Remove sombras e brilhos excessivos.' }].map((setting: any) => (
                         <div key={setting.key} className={`p-5 flex items-center justify-between border-b last:border-0 ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                            <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{setting.label}</div><div className="text-[10px] font-medium opacity-60">{setting.desc}</div></div>
                            <ToggleSwitch checked={(performanceSettings as any)[setting.key]} onChange={() => onUpdatePerformance({...performanceSettings, [setting.key]: !(performanceSettings as any)[setting.key]})} color={accentColor} />
                        </div>
                    ))}
                </div>
            </div>

            {/* NEW: PRIVACY AND NOTIFICATIONS */}
            <div>
                <SectionHeader icon={Shield} title="Privacidade e Notificações" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                     
                     <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${privacyMode ? `bg-${accentColor}-500/20 text-${accentColor}-500` : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Modo Privacidade</div>
                                <div className="text-[10px] font-medium opacity-60">Borra notas e médias na tela inicial.</div>
                            </div>
                        </div>
                        <ToggleSwitch checked={privacyMode} onChange={() => onTogglePrivacyMode(!privacyMode)} color={accentColor} />
                     </div>

                     <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${notificationsEnabled ? `bg-${accentColor}-500/20 text-${accentColor}-500` : (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                                <Bell size={18} />
                            </div>
                            <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notificações</div>
                                <div className="text-[10px] font-medium opacity-60">Alertas de faltas e notas.</div>
                            </div>
                        </div>
                        <ToggleSwitch checked={notificationsEnabled} onChange={() => onToggleNotifications(!notificationsEnabled)} color={accentColor} />
                     </div>

                </div>
            </div>

            <div>
                 <SectionHeader icon={LayoutTemplate} title="Comportamento" color={accentColor} />
                 <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className={`p-5 flex items-center justify-between`}>
                           <div>
                                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tela Inicial</div>
                                <div className="text-[10px] font-medium opacity-60">Escolha a visão padrão ao abrir o app.</div>
                           </div>
                           <select 
                                value={startView}
                                onChange={(e) => onUpdateStartView(e.target.value as ViewState)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold outline-none border cursor-pointer ${isDark ? 'bg-black/40 text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-200'}`}
                           >
                                <option value={ViewState.DASHBOARD}>Dashboard</option>
                                <option value={ViewState.GRADES}>Notas</option>
                                <option value={ViewState.SCHEDULE}>Horário</option>
                           </select>
                      </div>
                 </div>
            </div>

            <div>
                <SectionHeader icon={ImageIcon} title="Personalização" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                     <div className={`p-5 flex flex-col gap-4 border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
                        <div className="flex items-center justify-between">
                            <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Foto Personalizada</div><div className="text-[10px] font-medium opacity-60">Substitua a foto oficial do SUAP.</div></div>
                            <ToggleSwitch checked={useCustomPhoto} onChange={() => onToggleCustomPhoto(!useCustomPhoto)} color={accentColor} />
                        </div>
                        {useCustomPhoto && (
                            <div className="space-y-4 pt-2">
                                <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                    <Link2 size={16} className="opacity-40" />
                                    <input type="text" value={customPhotoUrl} onChange={(e) => onUpdateCustomPhoto(e.target.value)} placeholder="https://imgur.com/..." className={`bg-transparent outline-none w-full text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    {PROFILE_PRESETS.map((url, i) => (
                                        <button key={i} onClick={() => onUpdateCustomPhoto(url)} className={`relative aspect-square rounded-xl bg-cover bg-center overflow-hidden transition-transform hover:scale-105 active:scale-95 ${customPhotoUrl === url ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`} style={{ backgroundImage: `url(${url})` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            </div>
            <div>
                 <SectionHeader icon={HardDrive} title="Dados e Armazenamento" color={accentColor} />
                 <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                      {canInstall && (
                        <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-50 hover:bg-gray-50'} transition-colors`}>
                             <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}><Download size={18} /></div>
                                <div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Instalar Aplicativo</div><div className="text-[10px] font-medium opacity-60">Adicione à tela inicial.</div></div>
                             </div>
                             <button onClick={onInstallPwa} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase bg-${accentColor}-500 text-white`}>Instalar</button>
                        </div>
                      )}
                      <div className={`p-5 flex items-center justify-between hover:bg-red-500/5 transition-colors cursor-pointer`} onClick={() => { if(window.confirm("Isso apagará todos os dados salvos localmente. Continuar?")) { if(userData?.matricula) SecureStorage.clearUserData(userData.matricula); localStorage.clear(); window.location.reload(); } }}>
                             <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl bg-red-500/10 text-red-500`}><Trash2 size={18} /></div>
                                <div><div className="text-sm font-bold text-red-500">Limpar Cache</div><div className="text-[10px] font-medium opacity-60">Remove dados locais e sai da conta.</div></div>
                             </div>
                        </div>
                 </div>
            </div>
            <div className="text-center opacity-30 text-[10px] font-mono font-bold">SUPACO v{CURRENT_VERSION} • Developed by Electron</div>
        </motion.div>
    );
};

const ThemeTabContent = ({ isDark, accentColor, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange }: any) => {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                     <SectionHeader icon={Eye} title="Pré-visualização" color={accentColor} />
                     <div className={`w-full aspect-video rounded-xl relative overflow-hidden border-2 shadow-xl transition-all ${isDark ? 'bg-slate-900 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${currentWallpaper})`, filter: themeVariant === 'sepia' ? 'sepia(100%)' : themeVariant === 'monochrome' ? 'grayscale(100%)' : 'none' }} />
                         <div className="absolute inset-0 p-4 flex flex-col justify-between">
                              <div className={`h-2 w-1/3 rounded-full ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                              <div className="flex gap-2">
                                   <div className={`h-16 w-1/2 rounded-xl ${isDark ? `bg-${accentColor}-500/20 border border-${accentColor}-500/30` : `bg-${accentColor}-100 border border-${accentColor}-200`}`} />
                                   <div className={`h-16 w-1/2 rounded-xl ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-gray-100'}`} />
                              </div>
                         </div>
                    </div>
                     <div className="mt-4 flex justify-center gap-4">
                        <button onClick={onToggleTheme} className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}>
                            {isDark ? <Sun size={14} /> : <Moon size={14} />}
                            {isDark ? 'Modo Claro' : 'Modo Escuro'}
                        </button>
                     </div>
                 </div>
                 <div className="space-y-6">
                      <div>
                        <SectionHeader icon={Palette} title="Estilo de Cor" color={accentColor} />
                        <div className="grid grid-cols-2 gap-2">
                            {['dynamic', 'saturated', 'monochrome', 'sepia'].map((v) => (
                                <button key={v} onClick={() => onThemeVariantChange(v)} className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${themeVariant === v ? `bg-${accentColor}-500 text-white border-${accentColor}-600` : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50')}`}>{v}</button>
                            ))}
                        </div>
                      </div>
                      <div>
                          <SectionHeader icon={ImageIcon} title="Papel de Parede" color={accentColor} />
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[200px] overflow-y-auto custom-scroll pr-1">
                                {WALLPAPERS.map((wp, i) => (
                                    <button key={i} onClick={() => onWallpaperChange(wp)} className={`relative aspect-square rounded-xl bg-cover bg-center overflow-hidden transition-transform hover:scale-105 ${currentWallpaper === wp ? `ring-2 ring-${accentColor}-500 ring-offset-2 ${isDark ? 'ring-offset-black' : 'ring-offset-white'}` : ''}`} style={{ backgroundImage: `url(${wp})` }} />
                                ))}
                          </div>
                          <div className={`flex items-center gap-2 p-3 mt-3 rounded-xl border transition-colors focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <Link2 size={16} className="opacity-40" />
                                <input type="text" value={currentWallpaper} onChange={(e) => onWallpaperChange(e.target.value)} placeholder="URL da imagem..." className="bg-transparent outline-none w-full text-xs font-bold" />
                         </div>
                      </div>
                 </div>
             </div>
        </motion.div>
    );
};

const AchievementsTabContent = ({ isDark, accentColor, grades, userData }: any) => {
    const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
    const unlockedCount = ACHIEVEMENTS_LIST.filter(ach => ach.condition(grades, userData)).length;
    const totalCount = ACHIEVEMENTS_LIST.length;
    const progress = (unlockedCount / totalCount) * 100;
    const filteredList = ACHIEVEMENTS_LIST.filter(ach => {
        const isUnlocked = ach.condition(grades, userData);
        if (filter === 'unlocked') return isUnlocked;
        if (filter === 'locked') return !isUnlocked;
        return true;
    });

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto pb-10">
             <div className={`p-8 rounded-[2.5rem] border mb-8 relative overflow-hidden ${isDark ? `bg-${accentColor}-500/10 border-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100`}`}>
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
                       <div><h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sua Coleção</h2><p className="text-sm font-medium opacity-60">Desbloqueie conquistas baseadas em seu desempenho.</p></div>
                       <div className="flex items-end gap-2"><span className={`text-6xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{unlockedCount}</span><span className={`text-lg font-bold mb-2 opacity-50`}>/ {totalCount}</span></div>
                  </div>
                  <div className="relative h-3 bg-black/10 dark:bg-white/10 rounded-full mt-6 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`absolute top-0 left-0 h-full bg-${accentColor}-500`} /></div>
             </div>
             <div className="flex justify-center gap-2 mb-8">
                 {['all', 'unlocked', 'locked'].map((f) => (
                     <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${filter === f ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}`}>{f === 'all' ? 'Todas' : f === 'unlocked' ? 'Desbloqueadas' : 'Bloqueadas'}</button>
                 ))}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <AnimatePresence>
                     {filteredList.map((ach) => {
                         const isUnlocked = ach.condition(grades, userData);
                         const color = getRarityColor(ach.rarity);
                         return (
                             <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={ach.id} className={`relative p-5 rounded-[2rem] border flex items-center gap-4 transition-all duration-300 group ${isUnlocked ? (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 hover:shadow-lg') : 'opacity-50 grayscale bg-gray-100 dark:bg-white/5 border-transparent'}`}>
                                  {isUnlocked && <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${color}-500/20 blur-[40px] rounded-full`} />}
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10 shadow-sm ${isUnlocked ? (isDark ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-100 text-${color}-600`) : 'bg-gray-300 dark:bg-white/10 text-gray-500'}`}><ach.icon size={24} /></div>
                                  <div className="relative z-10 flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-0.5"><h3 className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{ach.title}</h3></div>
                                      <p className="text-[10px] opacity-70 leading-snug line-clamp-2">{isUnlocked ? ach.description : (ach.secret ? "Conquista Secreta" : ach.description)}</p>
                                      {isUnlocked && (<div className={`mt-2 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${isDark ? `bg-${color}-500/10 text-${color}-300` : `bg-${color}-50 text-${color}-600`}`}>{getRarityLabel(ach.rarity)}</div>)}
                                  </div>
                             </motion.div>
                         )
                     })}
                 </AnimatePresence>
             </div>
        </motion.div>
    );
};