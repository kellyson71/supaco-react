
import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Calendar as CalendarIcon, 
  Flag, Shield, RefreshCw, Moon, Sun, Sparkles
} from 'lucide-react';
import { InvertedCorner } from '../InvertedCorner';
import { ViewState } from '../../types';
import { SecureStorage } from '../../services/SecureStorage';

interface LeftSidebarProps {
  activeNav: ViewState;
  onNavClick: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  userData: any;
  userPhoto: string;
  primaryColor: string;
  isPremium: boolean;
  cornerColor: string;
  frameBg: string;
  frameText: string;
}

const ClassroomIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <div 
        className={className}
        style={{
            width: size,
            height: size,
            maskImage: 'url("https://img.icons8.com/?size=100&id=24519&format=png&color=000000")',
            WebkitMaskImage: 'url("https://img.icons8.com/?size=100&id=24519&format=png&color=000000")',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            backgroundColor: 'currentColor'
        }}
    />
);

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

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeNav, onNavClick, isDarkMode, onToggleTheme, isRefreshing, onRefresh,
  userData, userPhoto, primaryColor, isPremium, cornerColor, frameBg, frameText
}) => {
  return (
    <div id="tut-nav-desktop" className={`hidden md:flex relative z-50 h-[calc(100vh-2rem)] my-4 w-24 flex-col items-center py-8 transition-colors duration-500 ${frameBg}`}>
      <div className="text-xs font-black tracking-widest mb-1 text-gray-400">ELECTRON</div>
      <div className={`text-xl font-black italic mb-10 transition-colors duration-500 ${frameText}`}>SUPACO</div>
      
      <nav className="flex flex-col gap-6 w-full items-center flex-1">
        <NavItem isDark={isDarkMode} icon={<BookOpen />} active={activeNav === ViewState.GRADES} onClick={() => onNavClick(ViewState.GRADES)} label="Boletim" activeColor={primaryColor} />
        <NavItem isDark={isDarkMode} icon={<CalendarIcon />} active={activeNav === ViewState.SCHEDULE} onClick={() => onNavClick(ViewState.SCHEDULE)} label="Horário" activeColor={primaryColor} />
        <NavItem isDark={isDarkMode} icon={<ClassroomIcon />} active={activeNav === ViewState.CLASSROOM} onClick={() => onNavClick(ViewState.CLASSROOM)} label="Classroom" activeColor={primaryColor} />
        
        {/* Premium Feature: AI Studio */}
        <NavItem isDark={isDarkMode} icon={<Sparkles />} active={activeNav === ViewState.AI_STUDIO} onClick={() => onNavClick(ViewState.AI_STUDIO)} label="Estúdio IA" activeColor={primaryColor} />

        <NavItem isDark={isDarkMode} icon={<Flag />} active={activeNav === ViewState.CONCLUSION} onClick={() => onNavClick(ViewState.CONCLUSION)} label="Conclusão" activeColor={primaryColor} />
        
        {SecureStorage.isAdmin(userData?.matricula) && (
            <NavItem isDark={isDarkMode} icon={<Shield />} active={activeNav === ViewState.ADMIN} onClick={() => onNavClick(ViewState.ADMIN)} label="Admin" activeColor={primaryColor} />
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-6 items-center">
         <button 
           onClick={onRefresh}
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
               onClick={() => onNavClick(ViewState.PROFILE)}
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
  );
};
