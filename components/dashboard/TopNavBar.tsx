import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, GraduationCap, Flag, AlertTriangle, ChevronRight, 
  Clock, MapPin, RefreshCw 
} from 'lucide-react';
import { ViewState } from '../../types';

interface TopNavBarProps {
  showContent: boolean;
  isDarkMode: boolean;
  handleNavClick: (view: ViewState) => void;
  currentPeriod: any;
  primaryColor: string;
  completionData: any;
  classroomStatus: 'connected' | 'disconnected' | 'expired';
  onOpenSettings: () => void;
  nextClass: any;
  setIsFocusMode: (v: boolean) => void;
  handleRefreshClick: () => void;
  isRefreshing: boolean;
  isPremium: boolean;
  userPhoto: string;
}

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

export const TopNavBar: React.FC<TopNavBarProps> = ({
  showContent, isDarkMode, handleNavClick, currentPeriod, primaryColor, completionData,
  classroomStatus, onOpenSettings, nextClass, setIsFocusMode, handleRefreshClick,
  isRefreshing, isPremium, userPhoto
}) => {
  return (
    <div className="relative w-full flex justify-center z-[60]">
        <motion.div 
            initial={{ y: -150 }}
            animate={{ y: showContent ? 0 : -150 }}
            transition={{ type: 'spring', stiffness: 60, damping: 15, delay: showContent ? 0.2 : 0 }}
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
  );
};