import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minimize2, CheckSquare, Clock, MapPin } from 'lucide-react';
import { ProcessedClass } from '../../types';

interface FocusModeOverlayProps {
  onClose: () => void;
  nextClass: ProcessedClass | null;
  isDarkMode: boolean;
  primaryColor: string;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ onClose, nextClass, isDarkMode, primaryColor }) => {
    const [notes, setNotes] = useState(localStorage.getItem('focus_mode_notes') || '');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            // Calculate Time Left in Class
            if (nextClass) {
                const [endH, endM] = nextClass.endTime.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(endH, endM, 0);
                
                // Handle late night classes crossing midnight (edge case, simplified here)
                const diff = endDate.getTime() - now.getTime();
                if (diff > 0) {
                    const m = Math.floor(diff / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${m}m ${s}s`);
                } else {
                    setTimeLeft('Encerrada');
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [nextClass]);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        localStorage.setItem('focus_mode_notes', e.target.value);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-0 z-[300] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-black' : 'bg-white'}`}
        >
            <button onClick={onClose} className={`absolute top-6 right-6 p-4 rounded-full ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                <Minimize2 size={24} className={isDarkMode ? 'text-white' : 'text-black'} />
            </button>

            <div className="max-w-4xl w-full flex flex-col md:flex-row gap-12 items-center justify-center h-full">
                
                {/* Clock & Status */}
                <div className="flex-1 text-center md:text-left space-y-8">
                    <div>
                        <h2 className={`text-sm font-bold uppercase tracking-[0.3em] mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Modo Foco</h2>
                        <div className={`text-9xl font-black font-mono tabular-nums leading-none tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={`text-xl font-bold mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>

                    {nextClass ? (
                        <div className={`p-8 rounded-[2rem] border ${isDarkMode ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                             <div className="flex justify-between items-start mb-2">
                                <div className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>Aula Atual</div>
                                <div className={`px-2 py-1 rounded bg-black/10 dark:bg-white/10 text-xs font-mono font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{timeLeft} restantes</div>
                             </div>
                             <h3 className={`text-4xl font-black leading-tight mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{nextClass.name}</h3>
                             <div className="flex items-center gap-6 opacity-80">
                                 <div className="flex items-center gap-2"><Clock size={20} /> <span className="text-xl font-bold">{nextClass.startTime} - {nextClass.endTime}</span></div>
                                 <div className="flex items-center gap-2"><MapPin size={20} /> <span className="text-xl font-bold">{nextClass.room}</span></div>
                             </div>
                        </div>
                    ) : (
                        <div className="opacity-50 text-xl font-bold p-8 border border-dashed border-gray-500/30 rounded-[2rem]">
                            Nenhuma aula agora. Aproveite para estudar.
                        </div>
                    )}
                </div>

                {/* Quick Notes */}
                <div className="w-full md:w-1/3 h-[400px] flex flex-col">
                    <label className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <CheckSquare size={16} /> Anotações Rápidas
                    </label>
                    <textarea
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Rascunho da aula..."
                        className={`flex-1 w-full rounded-[2rem] p-6 text-lg font-medium resize-none outline-none border transition-all
                            ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-white/30 text-gray-200 placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-800 placeholder:text-gray-300'}
                        `}
                    />
                </div>

            </div>
        </motion.div>
    );
};