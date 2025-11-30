import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Monitor, WifiOff } from 'lucide-react';

interface LoginModalProps {
  isDarkMode: boolean;
  primaryColor: string;
  onSuapLogin: () => void;
  onGoogleLogin?: () => void;
  onDismiss: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isDarkMode, primaryColor, onSuapLogin, onGoogleLogin, onDismiss }) => {
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
                     <p className="text-sm opacity-60 mb-8 leading-relaxed">
                         Para sincronizar novos dados, faça login novamente. Você pode continuar visualizando os dados em cache.
                     </p>

                     <div className="w-full space-y-3">
                         <button 
                            onClick={onSuapLogin} 
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
                            className="w-full py-3 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 mt-2"
                         >
                             <WifiOff size={14} />
                             Continuar Offline
                         </button>
                     </div>
                 </div>
            </motion.div>
        </div>
    )
}