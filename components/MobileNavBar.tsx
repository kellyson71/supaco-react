
import React from 'react';
import { Home, BookOpen, AlertTriangle, Calendar, Monitor, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { ViewState } from '../types';
import { SecureStorage } from '../services/SecureStorage';

interface MobileNavBarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isDarkMode: boolean;
  primaryColor: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ currentView, onChangeView, isDarkMode, primaryColor }) => {
  
  // Basic Nav Items
  const navItems = [
    { id: ViewState.DASHBOARD, icon: Home, label: 'Início' },
    { id: ViewState.GRADES, icon: BookOpen, label: 'Notas' },
    { id: ViewState.ABSENCES, icon: AlertTriangle, label: 'Faltas' },
    { id: ViewState.SCHEDULE, icon: Calendar, label: 'Horário' },
    { id: ViewState.CLASSROOM, icon: Monitor, label: 'Class' },
  ];

  // Dynamically add Admin if needed
  const matricula = localStorage.getItem('suap_username');
  if (SecureStorage.isAdmin(matricula)) {
      navItems.push({ id: ViewState.ADMIN, icon: Shield, label: 'Admin' });
  }

  return (
    <div id="tut-nav-mobile" className="md:hidden fixed bottom-4 left-4 right-4 z-[200]">
      <div 
        className={`flex items-center justify-between px-2 py-3 rounded-[2rem] shadow-2xl backdrop-blur-2xl border transition-colors duration-500 overflow-x-auto hide-scrollbar
        ${isDarkMode 
          ? 'bg-slate-950/90 border-white/10 shadow-black/50' 
          : 'bg-white/90 border-white/50 shadow-gray-200/50'
        }`}
      >
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all duration-300 relative group min-h-[48px] min-w-[50px]
                 ${isActive ? 'flex-[1.5]' : 'flex-1'}
              `}
            >
              {isActive && (
                 <motion.div 
                    layoutId="mobile-nav-pill"
                    className={`absolute inset-0 rounded-2xl ${isDarkMode ? `bg-${primaryColor}-500/10` : `bg-${primaryColor}-50`}`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 />
              )}
              
              <div className={`relative z-10 transition-colors flex items-center justify-center ${isActive ? `text-${primaryColor}-500` : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                 <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              
              {isActive && (
                <motion.span 
                    initial={{ opacity: 0, scale: 0.5, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`relative z-10 text-[9px] font-bold uppercase tracking-wide leading-none ${isActive ? `text-${primaryColor}-600` : 'text-gray-500'}`}
                >
                    {item.label}
                </motion.span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  );
};
