import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Monitor, Database } from 'lucide-react';

interface LoginModalProps {
  isDarkMode: boolean;
  primaryColor: string;
  onSuapLogin: () => void;
  onGoogleLogin?: () => void;
  onDismiss: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isDarkMode, primaryColor, onSuapLogin, onGoogleLogin, onDismiss }) => {
    const [rememberMe, setRememberMe] = useState(
        localStorage.getItem('suap_remember_me') !== 'false'
    );

    const handleSuapLogin = () => {
        localStorage.setItem('suap_remember_me', String(rememberMe));
        onSuapLogin();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
            >
                 <div className={`absolute top-0 right-0 w-32 h-32 bg-${primaryColor}-500/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2`} />

                 <div className="relative z-10 flex flex-col items-center text-center">
                     <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                         <Fingerprint size={32} className={`text-${primaryColor}-500`} />
                     </div>

                     <h2 className="text-2xl font-black mb-2">Sessão Expirada</h2>
                     <p className="text-sm opacity-60 mb-6 leading-relaxed">
                         Para sincronizar novos dados, faça login novamente. Você pode continuar visualizando os dados em cache.
                     </p>

                     {/* Lembrar de mim */}
                     <button
                        onClick={() => setRememberMe(v => !v)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-4 transition-colors border text-left
                            ${rememberMe
                                ? (isDarkMode ? `bg-${primaryColor}-500/15 border-${primaryColor}-500/40` : `bg-${primaryColor}-50 border-${primaryColor}-200`)
                                : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                            }`}
                     >
                         <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
                             ${rememberMe
                                 ? (isDarkMode ? `bg-${primaryColor}-500 border-${primaryColor}-500` : `bg-${primaryColor}-500 border-${primaryColor}-500`)
                                 : (isDarkMode ? 'border-white/30' : 'border-gray-300')
                             }`}
                         >
                             {rememberMe && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                         </div>
                         <span className="text-xs font-bold">Lembrar de mim</span>
                     </button>

                     <div className="w-full space-y-3">
                         <button
                            onClick={handleSuapLogin}
                            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg
                                ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
                            `}
                         >
                             <Fingerprint size={16} />
                             Entrar com SUAP
                         </button>

                         <button
                            onClick={onGoogleLogin}
                            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-colors border
                                ${isDarkMode ? 'bg-transparent border-white/20 hover:bg-white/5' : 'bg-transparent border-gray-200 hover:bg-gray-50'}
                            `}
                         >
                             <Monitor size={16} />
                             Conectar Classroom
                         </button>

                         <button
                            onClick={onDismiss}
                            className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mt-1 rounded-xl
                                ${isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                            `}
                         >
                             <Database size={14} />
                             Continuar com dados em cache
                         </button>
                     </div>
                 </div>
            </motion.div>
        </div>
    )
}