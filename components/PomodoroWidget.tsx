

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer, X, Coffee, Brain, Zap, Settings, ChevronLeft, Volume2, VolumeX, Bell, BellOff, Check } from 'lucide-react';

interface PomodoroSettings {
  focus: number;
  short: number;
  long: number;
  sound: boolean;
  notification: boolean;
}

interface PomodoroWidgetProps {
  isDarkMode: boolean;
  primaryColor: string;
  settings: PomodoroSettings;
  onUpdateSettings: (settings: PomodoroSettings) => void;
}

type Mode = 'focus' | 'short' | 'long';

const MODES: Record<Mode, { label: string; icon: any }> = {
  focus: { label: 'Foco', icon: Brain },
  short: { label: 'Curta', icon: Coffee },
  long: { label: 'Longa', icon: Zap },
};

// Simple beep using Web Audio API to avoid external assets
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({ isDarkMode, primaryColor, settings, onUpdateSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isMobile, setIsMobile] = useState(false);

  // Handle Resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Reset timer when settings change specifically for the current mode
  useEffect(() => {
     if (!isActive) {
         setTimeLeft(settings[mode] * 60);
     }
  }, [settings, mode]);

  const handleComplete = () => {
    if (settings.sound) playNotificationSound();
    if (settings.notification && "Notification" in window && Notification.permission === "granted") {
       new Notification("Supaco Pomodoro", { body: `${MODES[mode].label} finalizado!` });
    } else if (settings.notification && "Notification" in window && Notification.permission !== "denied") {
       Notification.requestPermission().then(permission => {
         if (permission === "granted") {
            new Notification("Supaco Pomodoro", { body: `${MODES[mode].label} finalizado!` });
         }
       });
    }
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(settings[mode] * 60);
  };

  const changeMode = (newMode: Mode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(settings[newMode] * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Ring Calculation
  const totalSeconds = settings[mode] * 60;
  const progress = totalSeconds > 0 ? 1 - timeLeft / totalSeconds : 0;
  const radius = 88; // Slightly smaller to fit better
  const circumference = 2 * Math.PI * radius;

  // Animation Dimensions
  const width = isOpen ? (isMobile ? '100vw' : 400) : (isMobile ? 48 : 140);
  const height = isOpen ? (isMobile ? '100dvh' : 520) : (isMobile ? 48 : 42); // Increased height
  const borderRadius = isOpen ? (isMobile ? 0 : 40) : 99;

  const glassClass = isDarkMode
    ? 'bg-slate-900/95 border-white/10 shadow-2xl shadow-black/80'
    : `bg-white/95 border-white/20 shadow-2xl shadow-${primaryColor}-500/20`;

  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextColor = isDarkMode ? 'text-gray-500' : 'text-gray-400';
  const iconBase = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[240] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <motion.div
        layout
        initial={false}
        animate={{ width, height, borderRadius }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className={`overflow-hidden flex flex-col z-[1000]
            ${isOpen && isMobile ? 'fixed inset-0 m-0' : 'relative'} 
            ${glassClass}
            ${!isOpen && isMobile ? 'rounded-full' : 'backdrop-blur-xl border'}
        `}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-full relative"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-5 shrink-0 pt-safe-area-top">
                {showSettings ? (
                    <button 
                        onClick={() => setShowSettings(false)}
                        className={`p-2 rounded-full -ml-2 transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                    >
                        <ChevronLeft size={20} className={textColor} />
                    </button>
                ) : (
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${subTextColor}`}>
                        <Timer size={16} />
                        <span>Pomodoro</span>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    {!showSettings && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-400 hover:text-black'}`}
                        >
                            <Settings size={18} />
                        </button>
                    )}
                    <button
                    onClick={() => setIsOpen(false)}
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                    }`}
                    >
                    <X size={20} className={textColor} />
                    </button>
                </div>
              </div>

              {/* CONTENT SWAPPER */}
              <div className="flex-1 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                      {showSettings ? (
                          /* --- SETTINGS VIEW --- */
                          <motion.div 
                            key="settings-view"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 50, opacity: 0 }}
                            className="absolute inset-0 p-6 pt-0 overflow-y-auto custom-scroll"
                          >
                              <h2 className={`text-2xl font-black mb-6 ${textColor}`}>Configuração</h2>
                              
                              <div className="space-y-6">
                                  {/* Time Settings */}
                                  <div className="space-y-4">
                                      <h3 className={`text-xs font-bold uppercase tracking-widest ${subTextColor}`}>Tempos (minutos)</h3>
                                      
                                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                         <div className="grid grid-cols-1 gap-4">
                                            {Object.entries(MODES).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                                                            <value.icon size={16} className={iconBase} />
                                                        </div>
                                                        <span className={`text-sm font-medium ${textColor}`}>{value.label}</span>
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        max="60"
                                                        value={settings[key as Mode]}
                                                        onChange={(e) => onUpdateSettings({...settings, [key]: parseInt(e.target.value) || 1})}
                                                        className={`w-16 p-2 rounded-lg text-center font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-black/40 text-white focus:bg-black/60' : 'bg-white text-gray-900 border border-gray-200 focus:border-gray-400'}`}
                                                    />
                                                </div>
                                            ))}
                                         </div>
                                      </div>
                                  </div>

                                  {/* Toggles */}
                                  <div className="space-y-4">
                                      <h3 className={`text-xs font-bold uppercase tracking-widest ${subTextColor}`}>Notificações</h3>
                                      
                                      <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                          <div className="space-y-4">
                                              <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                      <div className={`p-2 rounded-lg ${settings.sound ? `bg-${primaryColor}-500/20 text-${primaryColor}-500` : (isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-white text-gray-400')}`}>
                                                          {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                                      </div>
                                                      <div>
                                                          <div className={`text-sm font-bold ${textColor}`}>Efeitos Sonoros</div>
                                                          <div className="text-[10px] opacity-60">Tocar alarme ao finalizar</div>
                                                      </div>
                                                  </div>
                                                  <button 
                                                    onClick={() => onUpdateSettings({...settings, sound: !settings.sound})}
                                                    className={`w-12 h-7 rounded-full transition-colors relative ${settings.sound ? `bg-${primaryColor}-500` : (isDarkMode ? 'bg-white/10' : 'bg-gray-300')}`}
                                                  >
                                                      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.sound ? 'translate-x-5' : 'translate-x-0'}`} />
                                                  </button>
                                              </div>

                                              <div className="w-full h-[1px] opacity-10 bg-current" />

                                              <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                      <div className={`p-2 rounded-lg ${settings.notification ? `bg-${primaryColor}-500/20 text-${primaryColor}-500` : (isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-white text-gray-400')}`}>
                                                          {settings.notification ? <Bell size={18} /> : <BellOff size={18} />}
                                                      </div>
                                                      <div>
                                                          <div className={`text-sm font-bold ${textColor}`}>Notificações</div>
                                                          <div className="text-[10px] opacity-60">Avisar no navegador</div>
                                                      </div>
                                                  </div>
                                                  <button 
                                                    onClick={() => {
                                                        if (!settings.notification) {
                                                            Notification.requestPermission();
                                                        }
                                                        onUpdateSettings({...settings, notification: !settings.notification})
                                                    }}
                                                    className={`w-12 h-7 rounded-full transition-colors relative ${settings.notification ? `bg-${primaryColor}-500` : (isDarkMode ? 'bg-white/10' : 'bg-gray-300')}`}
                                                  >
                                                      <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.notification ? 'translate-x-5' : 'translate-x-0'}`} />
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="h-10" />
                          </motion.div>
                      ) : (
                        /* --- TIMER VIEW --- */
                        <motion.div 
                            key="timer-view"
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full pb-8"
                        >
                             {/* Timer Ring */}
                            <div className="relative flex items-center justify-center mb-8">
                                <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 bg-${primaryColor}-500 transition-opacity duration-1000 ${isActive ? 'opacity-30 scale-110' : 'opacity-0 scale-90'}`} />
                                
                                <svg className="w-64 h-64 -rotate-90 transform drop-shadow-2xl" viewBox="0 0 256 256">
                                    {/* Track */}
                                    <circle
                                    cx="128"
                                    cy="128"
                                    r={radius}
                                    stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    />
                                    {/* Progress */}
                                    <circle
                                    cx="128"
                                    cy="128"
                                    r={radius}
                                    stroke={`var(--${primaryColor}-500)`}
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference * (1 - progress)}
                                    strokeLinecap="round"
                                    className={`transition-all duration-1000 ease-linear ${
                                        isActive ? `text-${primaryColor}-500` : 'text-gray-400 opacity-50'
                                    }`}
                                    />
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className={`text-6xl font-black font-mono tracking-tighter tabular-nums ${textColor}`}>
                                        {formatTime(timeLeft)}
                                    </div>
                                    <motion.div 
                                        initial={false}
                                        animate={{ opacity: isActive ? 1 : 0.5, y: isActive ? 0 : 5 }}
                                        className={`text-xs font-bold uppercase tracking-[0.2em] mt-2 ${subTextColor}`}
                                    >
                                        {isActive ? 'Em foco' : 'Pausado'}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-6 mb-8">
                                <button
                                    onClick={toggleTimer}
                                    className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl ${
                                    isActive
                                        ? isDarkMode
                                        ? 'bg-white/10 text-white'
                                        : 'bg-gray-100 text-black'
                                        : `bg-${primaryColor}-500 text-white shadow-${primaryColor}-500/40`
                                    }`}
                                >
                                    {isActive ? (
                                        <Pause size={32} fill="currentColor" className="opacity-90" />
                                    ) : (
                                        <Play size={32} fill="currentColor" className="ml-1" />
                                    )}
                                </button>
                                
                                <button
                                    onClick={resetTimer}
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:rotate-[-45deg] ${
                                    isDarkMode
                                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black'
                                    }`}
                                >
                                    <RotateCcw size={22} />
                                </button>
                            </div>

                            {/* Mode Switcher */}
                            <div className={`flex p-1.5 rounded-2xl ${isDarkMode ? 'bg-black/20' : 'bg-gray-100/80'}`}>
                            {(Object.keys(MODES) as Mode[]).map((m) => {
                                const isSelected = mode === m;
                                return (
                                <button
                                    key={m}
                                    onClick={() => changeMode(m)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                                    isSelected
                                        ? `bg-${primaryColor}-500 text-white shadow-lg shadow-${primaryColor}-500/25`
                                        : `text-gray-500 hover:text-gray-800 ${
                                            isDarkMode ? 'dark:hover:text-gray-300' : ''
                                        }`
                                    }`}
                                >
                                    {MODES[m].label}
                                </button>
                                );
                            })}
                            </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
              </div>

            </motion.div>
          ) : (
            /* Collapsed State */
            <motion.button
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className={`absolute inset-0 w-full h-full flex items-center justify-center group cursor-pointer hover:bg-white/5 transition-colors gap-2.5 ${
                isMobile ? 'rounded-full' : ''
              }`}
            >
              {/* Icon / Preview Clock */}
              <div
                className={`relative flex items-center justify-center ${
                  isActive
                    ? `text-${primaryColor}-500`
                    : isDarkMode
                    ? 'text-gray-400'
                    : 'text-gray-500'
                }`}
              >
                {isActive ? (
                  /* Active Preview (Mini Progress Ring) */
                  <div className="relative w-5 h-5 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="transparent" opacity="0.2" />
                        <circle 
                            cx="12" cy="12" r="10" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            fill="transparent" 
                            strokeDasharray="62.8" 
                            strokeDashoffset={62.8 * (1 - progress)} 
                            strokeLinecap="round" 
                        />
                    </svg>
                  </div>
                ) : (
                  <Timer size={isMobile ? 24 : 18} />
                )}
              </div>

              {/* Desktop Label */}
              {!isMobile && (
                <div className="flex flex-col items-start">
                  <span
                    className={`text-xs font-bold tracking-wider uppercase ${
                      isDarkMode
                        ? 'text-white/80'
                        : `text-gray-600 group-hover:text-${primaryColor}-600`
                    }`}
                  >
                    {isActive ? formatTime(timeLeft) : 'Foco'}
                  </span>
                </div>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};