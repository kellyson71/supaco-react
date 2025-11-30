
import React from 'react';
import { motion } from 'framer-motion';
import { X, GitCommit, Zap, Cloud, Shield, Star, Bug } from 'lucide-react';

interface ChangelogModalProps {
  onClose: () => void;
  isDark: boolean;
  primaryColor: string;
}

const VERSIONS = [
  {
    version: '2.0.0',
    date: 'Hoje',
    isMajor: true,
    features: [
      { icon: Cloud, text: 'Sincronização em Nuvem via Supabase' },
      { icon: Shield, text: 'Login Seguro e Persistência de Dados' },
      { icon: Zap, text: 'Nova Interface Holográfica' },
      { icon: Star, text: 'Sistema de Conquistas (Gamification)' },
    ]
  },
  {
    version: '1.5.0',
    date: 'Fev 2025',
    isMajor: false,
    features: [
      { icon: Zap, text: 'Widgets Flutuantes (IA & Pomodoro)' },
      { icon: Bug, text: 'Correção no cálculo de faltas' },
    ]
  },
  {
    version: '1.2.0',
    date: 'Jan 2025',
    isMajor: false,
    features: [
      { icon: Star, text: 'Modo Escuro (Dark Mode)' },
      { icon: Cloud, text: 'Integração inicial com Google Classroom' },
    ]
  },
  {
    version: '1.0.0',
    date: 'Dez 2024',
    isMajor: true,
    features: [
      { icon: Shield, text: 'Lançamento Oficial' },
      { icon: Zap, text: 'Visualização de Notas e Horários' },
    ]
  }
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, isDark, primaryColor }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}
      >
        {/* Header */}
        <div className={`p-6 pb-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'} flex justify-between items-center shrink-0`}>
             <div>
                 <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>Changelog</div>
                 <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Versões</h2>
             </div>
             <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                 <X size={20} />
             </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8">
            {VERSIONS.map((v, i) => (
                <div key={v.version} className="relative pl-6 border-l-2 border-dashed border-gray-500/20 last:border-0 pb-2">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ring-4 ${isDark ? 'ring-slate-900' : 'ring-white'} ${i === 0 ? `bg-${primaryColor}-500` : 'bg-gray-400'}`} />
                    
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} ${i === 0 ? `text-${primaryColor}-500` : ''}`}>
                            v{v.version}
                        </span>
                        {v.isMajor && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                                Major
                            </span>
                        )}
                        <span className="text-xs font-medium opacity-40 ml-auto">{v.date}</span>
                    </div>

                    <div className="space-y-2">
                        {v.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className={`mt-0.5 opacity-60 ${isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>
                                    <feat.icon size={12} />
                                </div>
                                <span className={`text-xs font-medium leading-tight ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {feat.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        {/* Footer */}
        <div className={`p-4 text-center border-t ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
             <p className="text-[10px] font-mono opacity-40">Supaco Inc. © 2025</p>
        </div>
      </motion.div>
    </div>
  );
};
