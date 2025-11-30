import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Achievement } from '../../types';
import { getRarityColor, getRarityLabel } from '../../achievements';

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({ achievement, onClose, isDarkMode }) => {
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