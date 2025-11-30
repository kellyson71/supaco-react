import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { ACHIEVEMENTS_LIST, getRarityColor, getRarityLabel } from '../../achievements';

export const AchievementsTabContent = ({ isDark, accentColor, grades, userData }: any) => {
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