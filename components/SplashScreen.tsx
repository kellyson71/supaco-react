
import React from 'react';
import { motion } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] text-white overflow-hidden">
      {/* Background Gradient Pulse */}
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 mb-6 relative"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <motion.text 
              y=".9em" 
              fontSize="90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 90 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              🎓
            </motion.text>
          </svg>
          
          {/* Spinner Ring */}
          <motion.div 
            className="absolute inset-[-10px] rounded-full border-t-2 border-r-2 border-transparent border-t-white/80 border-r-blue-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Text Reveal */}
        <div className="text-center overflow-hidden">
            <motion.h1 
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60"
            >
                SUPACO
            </motion.h1>
        </div>
        
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-2 flex items-center gap-2"
        >
            <div className="h-0.5 w-8 bg-blue-500/50 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                Carregando
            </span>
            <div className="h-0.5 w-8 bg-blue-500/50 rounded-full" />
        </motion.div>
      </div>

      <div className="absolute bottom-8 text-[9px] font-mono text-white/20">
        ELECTRON
      </div>
    </div>
  );
};
