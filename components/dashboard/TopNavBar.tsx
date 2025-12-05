import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Flag, AlertTriangle, ChevronRight, 
  Clock, MapPin, RefreshCw, Bell, X, Check, ArrowRight, Sparkles, ShieldAlert
} from 'lucide-react';
import { ViewState, SupacoNotification, ThemeVariant } from '../../types';

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
  notifications?: SupacoNotification[];
  onMarkAsRead?: (id: string) => void;
  onViewAllNotifications?: () => void;
  themeVariant: ThemeVariant;
}

const TopBarItem = ({ icon, label, onClick, active, indicator, indicatorColor, rightIcon, children, isDark, isMono }: any) => {
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
                        ? (isMono 
                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                            : (isDark ? 'bg-white text-black border-transparent' : 'bg-black text-white border-transparent')
                          )
                        : (isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100')
                    }
                `}
            >
                {indicator && (
                    <span className={`w-2 h-2 rounded-full ${isMono ? 'bg-white border border-black' : `bg-${indicatorColor}-500`} ${indicatorColor === 'green' ? 'animate-pulse' : ''}`} />
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
  isRefreshing, isPremium, userPhoto, notifications = [], onMarkAsRead, onViewAllNotifications, themeVariant
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const isMono = themeVariant === 'monochrome';

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
              setShowNotifications(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onMarkAsRead?.(id);
  };

  const handleViewAll = () => {
      setShowNotifications(false);
      onViewAllNotifications?.();
  };

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
            {/* Notification Bell (Bubble Trigger) */}
            <div className="relative" ref={notificationRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-colors flex items-center justify-center group relative z-50
                        ${showNotifications 
                            ? (isMono ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')) 
                            : (isDarkMode ? 'bg-white/10 text-white hover:bg-white hover:text-black' : 'bg-black/5 text-gray-700 hover:bg-black hover:text-white')
                        }
                    `}
                >
                    {showNotifications ? <X size={18} /> : <Bell size={18} />}
                    
                    {!showNotifications && unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#020617] animate-pulse" />
                    )}
                </button>

                {/* The "Bubble" Dropdown */}
                <AnimatePresence>
                    {showNotifications && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, y: 15, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.8, y: -20, filter: 'blur(10px)' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            style={{ transformOrigin: 'top left' }}
                            className={`absolute top-full left-0 w-[340px] max-w-[90vw] rounded-[2rem] shadow-2xl border flex flex-col overflow-hidden
                                ${isDarkMode 
                                    ? 'bg-slate-950/90 border-white/10 shadow-black/80' 
                                    : 'bg-white/90 border-white/50 shadow-xl shadow-indigo-500/10'
                                } backdrop-blur-2xl
                            `}
                        >
                            {/* Header */}
                            <div className={`p-5 pb-2 flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notificações</span>
                                    {unreadCount > 0 && (
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                                            {unreadCount}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto custom-scroll p-2 max-h-[350px]">
                                {recentNotifications.length > 0 ? (
                                    recentNotifications.map((notif, i) => (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={notif.id}
                                            onClick={(e) => handleNotificationClick(e, notif.id)}
                                            className={`p-3 mb-1 rounded-2xl cursor-pointer transition-all group relative border border-transparent
                                                ${notif.read ? 'opacity-60' : 'opacity-100'}
                                                ${isDarkMode 
                                                    ? 'hover:bg-white/5 hover:border-white/5 active:bg-white/10' 
                                                    : 'hover:bg-white hover:shadow-sm hover:border-gray-100 active:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                                    ${notif.type === 'risk' 
                                                        ? 'bg-red-500/10 text-red-500' 
                                                        : (notif.type === 'suap' 
                                                            ? 'bg-green-500/10 text-green-500' 
                                                            : (isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'))
                                                    }`}
                                                >
                                                    {notif.type === 'risk' ? <ShieldAlert size={14} /> : (notif.type === 'suap' ? <Bell size={14} /> : <Sparkles size={14} />)}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`text-xs font-bold leading-tight mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'} ${!notif.read ? 'pr-2' : ''}`}>{notif.title}</h4>
                                                        {!notif.read && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMono ? 'bg-white' : `bg-${primaryColor}-500`}`} />}
                                                    </div>
                                                    <p className={`text-[10px] line-clamp-2 leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{notif.message}</p>
                                                    <span className="text-[9px] opacity-30 mt-1 block font-mono">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center opacity-40 flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                            <Bell size={20} />
                                        </div>
                                        <p className="text-xs font-bold">Tudo limpo por aqui</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Action */}
                            <div className="p-3 mt-1">
                                <button 
                                    onClick={handleViewAll}
                                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all
                                        ${isDarkMode 
                                            ? 'bg-white/5 hover:bg-white/10 text-white border border-white/5' 
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-100'
                                        }
                                    `}
                                >
                                    Ver Histórico <ArrowRight size={12} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
            
            <TopBarItem 
                icon={<GraduationCap size={14} />}
                label={currentPeriod?.semestre || '2025.1'} 
                indicator
                indicatorColor={primaryColor}
                isDark={isDarkMode}
                isMono={isMono}
            >
                <div className={`p-4 min-w-[200px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Semestre Atual</h3>
                    <div className="text-xl font-black">{currentPeriod?.semestre || '2025.1'}</div>
                    <div className={`text-xs font-bold mt-1 ${isMono ? 'text-white' : `text-${primaryColor}-500`}`}>Em andamento</div>
                </div>
            </TopBarItem>

            <div className={`hidden md:block h-4 w-[1px] ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
            
            <div className="hidden md:block">
                 <TopBarItem 
                    icon={<Flag size={14} />}
                    label={completionData ? `${completionData.percentual_cumprida}%` : '--%'}
                    isDark={isDarkMode}
                    isMono={isMono}
                >
                     <div className={`p-4 min-w-[240px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Progresso do Curso</h3>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-2xl font-black">{completionData?.percentual_cumprida || 0}%</span>
                            <span className="text-xs font-bold text-gray-500">{completionData?.totais.ch_cumprida}h / {completionData?.totais.ch_esperada}h</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                             <div className={`${isMono ? 'bg-white' : `bg-${primaryColor}-500`} h-full`} style={{width: `${completionData?.percentual_cumprida || 0}%`}} />
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
                isMono={isMono}
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
    );
};