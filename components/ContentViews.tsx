
import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { ViewState, GradeInfo, ThemeVariant, SuapProfile, SuapMeusDadosAluno, ProcessedClass, SuapCompletionData, ClassroomWork, PerformanceSettings, SuapPeriod, Holiday } from '../types';
import { GradesModal } from './modals/GradesModal';
import { ScheduleModal } from './modals/ScheduleModal';
import { ClassroomModal } from './modals/ClassroomModal';
import { ConclusionModal } from './modals/ConclusionModal';
import { AdminModal } from './modals/AdminModal';
import { AIStudioModal } from './modals/AIStudioModal';
import { ProfileLayout } from './profile/ProfileLayout';
import { QuickView } from './QuickView';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

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
  customPhotoUrl?: string;
  onUpdateCustomPhoto?: (url: string) => void;
  useCustomPhoto?: boolean;
  onToggleCustomPhoto?: (enable: boolean) => void;
  periods?: SuapPeriod[];
  viewingPeriod?: SuapPeriod | null;
  onPeriodChange?: (semestre: string) => void;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
  classroomWork?: ClassroomWork[];
  isClassroomLinked?: boolean;
  onLinkClassroom?: () => void;
  classroomStatus?: 'connected' | 'disconnected' | 'expired';
  internalApiKey?: string;
  onOpenChatWithContext?: (messages: ChatMessage[], pendingMessage?: string) => void;
  onOpenSettings?: () => void;
  onRefreshClassroom?: () => void;
  googleUser?: { email: string, name: string, picture: string } | null;
  holidays?: Holiday[];
}

export const ContentView: React.FC<OverlayViewProps> = ({ 
    view, onClose, onChangeView, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, 
    themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, 
    grades, schedule, completionData, onLogout, autoExpandClassroom, onAutoExpandClassroom, 
    initialProfileTab, onInstallPwa, canInstall, performanceSettings, onUpdatePerformance, 
    customPhotoUrl = '', onUpdateCustomPhoto, useCustomPhoto = false, onToggleCustomPhoto, 
    periods, viewingPeriod, onPeriodChange, isPremium, onOpenPremiumModal, classroomWork = [], 
    isClassroomLinked = false, onLinkClassroom, classroomStatus, internalApiKey, onOpenChatWithContext,
    onOpenSettings, onRefreshClassroom, googleUser, holidays = []
}) => {
  if (view === ViewState.DASHBOARD) return null;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bgClass = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-100';
  
  const innerBgClass = view === ViewState.PROFILE 
      ? 'bg-transparent'
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

  const getApiKey = () => {
      let key = localStorage.getItem('gemini_api_key') || internalApiKey;
      if (!key && process.env.API_KEY) key = process.env.API_KEY;
      return key;
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
                        {view === ViewState.QUICK ? 'Visão Rápida' :
                        view === ViewState.GRADES ? 'Boletim Escolar' :
                        view === ViewState.SCHEDULE ? 'Horário Semanal' :
                        view === ViewState.CLASSROOM ? 'Google Classroom' :
                        view === ViewState.CONCLUSION ? 'Progresso do Curso' :
                        view === ViewState.AI_STUDIO ? 'Supaco Brain' :
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
            {view === ViewState.QUICK && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <QuickView
                        grades={grades}
                        schedule={schedule}
                        isDark={isDarkMode}
                        primaryColor={primaryColor}
                    />
                </div>
            )}

            {view === ViewState.GRADES && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <GradesModal 
                        grades={grades} 
                        schedule={schedule}
                        periods={periods}
                        selectedPeriod={viewingPeriod}
                        onSelectPeriod={onPeriodChange}
                        isDark={isDarkMode} 
                        primaryColor={primaryColor} 
                        secondaryColor={secondaryColor} 
                        holidays={holidays}
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
                        isPremium={isPremium}
                        onOpenPremiumModal={onOpenPremiumModal}
                        internalApiKey={internalApiKey}
                        onOpenChatWithContext={onOpenChatWithContext}
                        onOpenSettings={onOpenSettings}
                        onRefresh={onRefreshClassroom}
                    />
                </div>
            )}

            {view === ViewState.AI_STUDIO && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
                    <AIStudioModal 
                        isDark={isDarkMode}
                        accentColor={primaryColor}
                        isPremium={isPremium}
                        onOpenPremiumModal={onOpenPremiumModal}
                        apiKey={getApiKey()}
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
                <ProfileLayout 
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
                    googleUser={googleUser}
                />
            )}
        </div>
      </motion.div>
    </div>
  );
};
