
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';

interface CallbackPageProps {
  isDarkMode: boolean;
  primaryColor: string;
}

const ClassroomIcon = ({ size = 40, className = "" }: { size?: number, className?: string }) => (
    <div 
        className={className}
        style={{
            width: size,
            height: size,
            maskImage: 'url("https://img.icons8.com/?size=100&id=31054&format=png&color=000000")',
            WebkitMaskImage: 'url("https://img.icons8.com/?size=100&id=31054&format=png&color=000000")',
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

export const CallbackPage: React.FC<CallbackPageProps> = ({ isDarkMode, primaryColor }) => {
  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Background Ambience */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 ${isDarkMode ? `bg-${primaryColor}-500` : `bg-${primaryColor}-300`}`} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center text-center p-8"
      >
        {/* Animated Icon Container */}
        <div className="relative mb-8">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-[-10px] rounded-full border-t-2 border-r-2 border-transparent ${isDarkMode ? `border-t-${primaryColor}-500 border-r-white` : `border-t-${primaryColor}-500 border-r-gray-400`}`}
            />
            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                <ClassroomIcon size={40} className={isDarkMode ? 'text-white' : 'text-gray-800'} />
            </div>
            
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className={`absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg ${isDarkMode ? `bg-${primaryColor}-500 text-white` : `bg-${primaryColor}-500 text-white`}`}
            >
                <ShieldCheck size={16} />
            </motion.div>
        </div>

        <h1 className="text-3xl font-black tracking-tighter mb-2">Conectando...</h1>
        <p className="text-sm opacity-60 font-medium max-w-xs mb-8">
            Estamos validando suas credenciais com o Google Classroom. Isso levará apenas um momento.
        </p>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-black/5 text-gray-600'}`}>
            <Loader2 size={12} className="animate-spin" />
            Processando
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-[10px] font-mono opacity-30">
        OAUTH 2.0 • SECURE HANDSHAKE
      </div>
    </div>
  );
};
