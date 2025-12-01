
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight, Zap, Crown } from 'lucide-react';

interface UpdateNewsModalProps {
  onClose: () => void;
  onGoToClassroom: () => void;
  isDark: boolean;
  primaryColor: string;
}

const ClassroomIcon = ({ size = 32, className = "" }: { size?: number, className?: string }) => (
    <div 
        className={className}
        style={{
            width: size,
            height: size,
            maskImage: 'url("https://img.icons8.com/?size=100&id=24519&format=png&color=000000")',
            WebkitMaskImage: 'url("https://img.icons8.com/?size=100&id=24519&format=png&color=000000")',
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

export const UpdateNewsModal: React.FC<UpdateNewsModalProps> = ({ onClose, onGoToClassroom, isDark, primaryColor }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-md overflow-hidden rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}
      >
        {/* Hero Image / Visual */}
        <div className={`relative h-40 w-full overflow-hidden flex items-center justify-center ${isDark ? 'bg-indigo-950' : 'bg-indigo-50'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-purple-600/10" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/30 blur-[60px] rounded-full" />
            
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-green-600 transform -rotate-6">
                    <ClassroomIcon size={32} />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-violet-600 shadow-xl shadow-violet-600/30 flex items-center justify-center text-white transform rotate-6 z-10">
                    <Sparkles size={32} fill="currentColor" />
                </div>
            </div>
        </div>

        <div className="p-8 pt-6">
            <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                    Versão 2.6
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 flex items-center gap-1">
                    <Crown size={10} fill="currentColor" /> Premium
                </span>
            </div>

            <h2 className={`text-3xl font-black leading-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                IA no Classroom
            </h2>

            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Agora você pode resolver atividades inteiras com um clique. Nossa IA analisa o título, a descrição e gera o código ou texto necessário instantaneamente.
            </p>

            <div className={`p-4 rounded-2xl border mb-8 flex items-start gap-3 ${isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-100'}`}>
                <div className="p-1.5 rounded-lg bg-violet-500 text-white shrink-0 mt-0.5">
                    <Zap size={14} fill="currentColor" />
                </div>
                <div>
                    <h4 className={`text-xs font-bold uppercase mb-1 ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Como usar</h4>
                    <p className={`text-xs leading-relaxed opacity-80 ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
                        Vá até a aba Classroom, passe o mouse sobre uma atividade e clique no botão <strong>"Resolver com IA"</strong>.
                    </p>
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                >
                    Entendi
                </button>
                <button 
                    onClick={onGoToClassroom}
                    className={`flex-[1.5] py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white shadow-lg shadow-violet-600/30 bg-violet-600 hover:bg-violet-700 transition-all flex items-center justify-center gap-2`}
                >
                    Testar Agora <ArrowRight size={14} />
                </button>
            </div>
        </div>

        <button 
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'bg-black/20 hover:bg-black/40 text-white' : 'bg-white/50 hover:bg-white text-black'}`}
        >
            <X size={18} />
        </button>
      </motion.div>
    </div>
  );
};
