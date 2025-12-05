import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle, TrendingUp, Link2 } from 'lucide-react';

const ToggleSwitch = ({ checked, onChange, color, isMono }: { checked: boolean, onChange: () => void, color: string, isMono?: boolean }) => (
    <button 
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-colors relative ${checked ? (isMono ? 'bg-white' : `bg-${color}-500`) : (isMono ? 'bg-white/20' : 'bg-gray-300 dark:bg-white/10')}`}
    >
        <motion.div 
            layout 
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute top-1 left-1 w-5 h-5 rounded-full ${isMono && checked ? 'bg-black' : 'bg-white'} shadow-sm`} 
            style={{ x: checked ? 20 : 0 }}
        />
    </button>
);

const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div className="flex items-center gap-2 mb-4 opacity-70">
        <Icon size={16} className={`text-${color}-500`} />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
);

export const ProfileTabContent = ({ isDark, accentColor, userData, academicData, profileImg, isPremium, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto, themeVariant }: any) => {
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const isMono = themeVariant === 'monochrome';

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8">
            <div className={`relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 border shadow-2xl ${isMono ? 'bg-black border-white' : (isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100')}`}>
                {!isMono && <div className={`absolute top-0 right-0 w-96 h-96 bg-${accentColor}-500/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`} />}
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="shrink-0 relative group">
                        <div className="relative">
                            {isPremium && (
                                <div className="absolute inset-0 pointer-events-none rounded-[2.5rem]" 
                                     style={{ margin: '-4px', borderTop: '4px solid #ef4444', borderLeft: '4px solid #eab308', borderBottom: '4px solid #3b82f6', borderRight: '2px solid #22c55e' }} 
                                />
                            )}
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 ${isMono ? 'bg-black border-2 border-white' : (isDark ? 'bg-black' : 'bg-gray-50')} ${!isPremium && !isMono ? (isDark ? 'border-4 border-white/10' : 'border-4 border-white') : ''}`}>
                                <img src={profileImg} className="w-full h-full object-cover" alt="Profile" />
                            </div>
                        </div>
                        <button onClick={() => setShowPhotoModal(true)} className="absolute inset-0 rounded-[2.5rem] bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            <Camera size={24} className="text-white" />
                        </button>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h1 className={`text-3xl md:text-5xl font-black tracking-tighter leading-[0.9] mb-2 ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>{userData?.nome_usual || 'Estudante'}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isMono ? 'bg-black border-white text-white' : (isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600')}`}>{userData?.vinculo?.curso || 'Curso N/A'}</span>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isMono ? 'bg-black border-white text-white' : (isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600')}`}>{userData?.campus || 'Campus'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
                             <div className={`p-4 rounded-2xl border text-left ${isMono ? 'bg-black border-white' : (isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100')}`}>
                                 <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Matrícula</div>
                                 <div className="font-mono font-bold text-sm opacity-90">{userData?.matricula}</div>
                             </div>
                             <div className={`p-4 rounded-2xl border text-left ${isMono ? 'bg-black border-white' : (isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100')}`}>
                                 <div className="text-[10px] font-bold uppercase opacity-50 mb-1">CPF</div>
                                 <div className="font-mono font-bold text-sm opacity-90">***.***.***-**</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                {/* Reusing a similar visual structure for stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`md:col-span-2 p-6 rounded-[2rem] border relative overflow-hidden group ${isMono ? 'bg-black border-white' : (isDark ? `bg-${accentColor}-500/10 border-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100`)}`}>
                        <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <div className={`text-6xl md:text-7xl font-black tracking-tighter ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>{academicData?.ira?.replace('.', ',') || '---'}</div>
                                <div className={`text-sm font-bold uppercase tracking-widest mt-1 ${isMono ? 'text-white' : (isDark ? `text-${accentColor}-200` : `text-${accentColor}-700`)}`}>I.R.A. Geral</div>
                            </div>
                            <div className={`p-4 rounded-2xl ${isMono ? 'bg-white text-black' : (isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-200 text-${accentColor}-700`)}`}><TrendingUp size={32} /></div>
                        </div>
                    </div>
                    <div className={`p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between ${isMono ? 'bg-black border-white' : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100')}`}>
                        <div className={`p-3 rounded-2xl w-fit mb-4 ${isMono ? 'bg-white text-black' : (isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900')}`}><CheckCircle size={24} /></div>
                        <div>
                            <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Situação</div>
                            <div className={`text-xl font-black ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>{academicData?.situacao || 'Matriculado'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {showPhotoModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={`relative w-full max-w-md p-6 rounded-[2rem] border shadow-2xl overflow-hidden ${isMono ? 'bg-black border-white text-white' : (isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200')}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-xl font-black ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>Alterar Foto</h3>
                                <button onClick={() => setShowPhotoModal(false)} className={`p-2 rounded-full ${isMono ? 'bg-white/10 text-white' : (isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200')}`}><X size={18} /></button>
                            </div>
                            <div className="space-y-6">
                                <div className={`flex items-center justify-between p-4 rounded-xl border ${isMono ? 'bg-black border-white' : (isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100')}`}>
                                    <div>
                                        <div className={`text-sm font-bold ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`}>Usar Foto Personalizada</div>
                                        <div className="text-[10px] opacity-60">Substitui a foto oficial do SUAP</div>
                                    </div>
                                    <ToggleSwitch checked={useCustomPhoto} onChange={() => onToggleCustomPhoto(!useCustomPhoto)} color={accentColor} isMono={isMono} />
                                </div>
                                {useCustomPhoto && (
                                    <div className="space-y-4 pt-2">
                                        <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${isMono ? 'bg-black border-white' : `focus-within:border-${accentColor}-500 ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}`}>
                                            <Link2 size={16} className="opacity-40" />
                                            <input type="text" value={customPhotoUrl} onChange={(e) => onUpdateCustomPhoto(e.target.value)} placeholder="https://imgur.com/..." className={`bg-transparent outline-none w-full text-xs font-bold ${isMono ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900')}`} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};