import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, Palette, Trophy, ArrowRight, LogOut, X, Crown, LifeBuoy } from 'lucide-react';
import { ProfileTabContent } from './ProfileTab';
import { SettingsTabContent } from './SettingsTab';
import { ThemeTabContent } from './ThemeTab';
import { AchievementsTabContent } from './AchievementsTab';
import { SupportTabContent } from './SupportTab';

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";
const CURRENT_VERSION = "2.0.0";

export const ProfileLayout = ({ 
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
    googleUser
}: any) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'profile');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const isMono = themeVariant === 'monochrome';

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
        { id: 'support', label: 'Suporte', icon: LifeBuoy },
    ];

    return (
        <div className={`flex flex-col md:flex-row h-full w-full ${isMono ? 'bg-black text-white' : (isDark ? 'bg-black/20 text-white' : 'bg-gray-50/50 text-gray-900')}`}>
            
            <div className={`shrink-0 flex flex-col md:w-64 lg:w-72 p-6 border-b md:border-b-0 md:border-r ${isMono ? 'bg-black border-white text-white' : (isDark ? 'border-white/10 bg-slate-900/50' : 'border-gray-200 bg-white/50')}`}>
                <div className="hidden md:flex flex-col items-center text-center mb-8">
                    <div className="relative group cursor-pointer mb-4">
                        <div className="relative p-[3px]">
                             {isPremium && <div style={premiumBorderLines} />}
                             <div className={`w-20 h-20 rounded-full overflow-hidden shadow-lg transition-transform group-hover:scale-105 relative z-10 ${isMono ? 'bg-black border-2 border-white' : (isDark ? 'bg-black' : 'bg-white')} ${!isPremium ? (isDark ? 'border-2 border-white/10' : 'border-2 border-white') : ''}`}>
                                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
                             </div>
                        </div>
                        {isPremium && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-md z-20">
                                <Crown size={12} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <h2 className={`text-lg font-black leading-tight ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>{userData?.nome_usual || 'Estudante'}</h2>
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
                                        ? (isMono ? 'bg-white text-black' : (isDark ? 'text-white' : 'text-gray-900')) 
                                        : (isMono ? 'text-white hover:bg-white/10' : (isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'))}
                                `}
                            >
                                {isActive && !isMono && (
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
                     <button onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isMono ? 'text-white hover:bg-white/10' : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-gray-100')}`}>
                        <ArrowRight size={18} className="rotate-180" /> Voltar
                     </button>
                     <button onClick={onLogout} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors text-red-500 hover:bg-red-500/10`}>
                        <LogOut size={18} /> Sair
                     </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll relative p-4 md:p-8 lg:p-10">
                 <button onClick={onClose} className={`md:hidden absolute top-4 right-4 p-2 rounded-full z-50 ${isMono ? 'bg-white/10 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
                    <X size={20} className={isMono ? 'text-white' : (isDark ? 'text-white' : 'text-black')} />
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
                            themeVariant={themeVariant}
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
                            googleUser={googleUser}
                            themeVariant={themeVariant}
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
                            themeVariant={themeVariant}
                        />
                    )}
                    {activeTab === 'support' && (
                        <SupportTabContent 
                            key="support" 
                            isDark={isDark} 
                            accentColor={accentColor} 
                            userData={userData} 
                            themeVariant={themeVariant}
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