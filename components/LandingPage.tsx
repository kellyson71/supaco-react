
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Github, GraduationCap, Monitor, ShieldCheck, Lock, User, AlertTriangle, Sparkles, Database, ArrowLeft, School, Check, ExternalLink } from 'lucide-react';

interface LandingPageProps {
  onComplete: () => void;
  onLogin: () => void;
  isDarkMode: boolean;
  primaryColor: string;
  currentWallpaper: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onComplete, 
  onLogin,
  isDarkMode, 
  primaryColor,
  currentWallpaper 
}) => {
  
  const [showLogin, setShowLogin] = useState(false);
  
  // Login State
  const [mat, setMat] = useState('');
  const [pass, setPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // SUAP OAuth Config
  const CLIENT_ID = 'mtwXt4wCesctJiKA6BbRQ7DMROTJeNosSpQUc7dm';
  // Nota: Em produção real, o Redirect URI deve ser dinâmico ou fixo na URL de produção
  const REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:5173/' : 'https://supaco.vercel.app/'; 

  const handleSuapOAuthLogin = () => {
    const authUrl = `https://suap.ifrn.edu.br/o/authorize/?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    window.location.href = authUrl;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mat || !pass) return;
    
    setIsLoading(true);
    setError('');
    
    try {
        const response = await fetch('https://suap.ifrn.edu.br/api/token/pair', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: mat,
                password: pass
            })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('suap_access_token', data.access);
            localStorage.setItem('suap_refresh_token', data.refresh);
            localStorage.setItem('suap_username', mat);
            
            onLogin(); 
            setTimeout(() => {
                onComplete();
            }, 800); 
        } else {
            setError('Matrícula ou senha inválidos.');
        }
    } catch (err) {
        setError('Erro de conexão com o SUAP.');
    } finally {
        setIsLoading(false);
    }
  };

  const glassBase = isDarkMode 
    ? 'bg-slate-950/40 border-white/10 text-white shadow-2xl' 
    : 'bg-white/60 border-white/40 text-gray-900 shadow-xl';

  const cardHover = isDarkMode
    ? 'hover:bg-white/10 hover:border-white/20'
    : 'hover:bg-white/80 hover:border-white/60';

  return (
    <motion.div 
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center font-sans text-white overflow-hidden`}
        exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
    >
      
      {/* Dynamic Background - Consistent throughout */}
      <motion.div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${currentWallpaper})` }}
        animate={{ scale: showLogin ? 1.1 : 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <div className={`absolute inset-0 z-0 backdrop-blur-xl ${isDarkMode ? 'bg-black/60' : 'bg-black/30'}`} />

      {/* Intro Content - Scales down and blurs when login appears */}
      <motion.div 
          className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 overflow-y-auto md:overflow-hidden"
          initial={{ opacity: 0 }}
          animate={showLogin ? { opacity: 0.4, scale: 0.9, filter: 'blur(8px)', pointerEvents: 'none' } : { opacity: 1, scale: 1, filter: 'blur(0px)', pointerEvents: 'auto' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
             {/* Header */}
             <div className="text-center mb-10 mt-10 md:mt-0">
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white text-black mb-6 shadow-2xl"
                 >
                     <GraduationCap size={40} strokeWidth={2.5} />
                 </motion.div>
                 <motion.h1 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-7xl font-black tracking-tighter mb-2 drop-shadow-lg"
                 >
                    SUPACO
                 </motion.h1>
                 <motion.p 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-xl opacity-80 font-medium tracking-wide max-w-md mx-auto leading-relaxed"
                 >
                    Seu IFRN. Simplificado. <br/>
                    <span className={`font-bold text-${primaryColor}-400`}>Dados reais, direto do SUAP.</span>
                 </motion.p>
             </div>

             {/* Bento Grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl w-full mb-10">
                 
                 {/* Big Block: SUAP Integration */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className={`col-span-1 md:col-span-2 row-span-2 p-8 rounded-[2rem] border backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all group flex flex-col justify-between`}
                 >
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-xl bg-${primaryColor}-500 text-white`}>
                                <School size={24} />
                            </div>
                            <div className="px-3 py-1 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-wider text-white/80">
                                Oficial
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 leading-tight">Integrado com sua conta SUAP</h3>
                        <p className="text-white/60 text-sm leading-relaxed">
                            Login seguro utilizando suas credenciais do IFRN. Notas, faltas e horários são sincronizados em tempo real diretamente do sistema oficial.
                        </p>
                    </div>
                    <div className="mt-6 flex gap-2 overflow-hidden">
                        {['Boletim', 'Faltas', 'Horário', 'Turmas'].map((tag, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-white/70">{tag}</span>
                        ))}
                    </div>
                 </motion.div>

                 {/* Small Block: Grades */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className={`col-span-1 p-6 rounded-[2rem] border backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all`}
                 >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                        <Check size={20} />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Notas em Tempo Real</h3>
                    <p className="text-white/50 text-xs">Boletim sincronizado automaticamente.</p>
                 </motion.div>

                 {/* Small Block: AI */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className={`col-span-1 p-6 rounded-[2rem] border backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all`}
                 >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-lg font-bold mb-1">IA Acadêmica</h3>
                    <p className="text-white/50 text-xs">Gemini analisa seu desempenho.</p>
                 </motion.div>

                 {/* Medium Block: Classroom */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    className={`col-span-1 md:col-span-2 p-6 rounded-[2rem] border backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all flex items-center gap-6`}
                 >
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 text-amber-400">
                            <Monitor size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Google Classroom</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Tarefas Centralizadas</h3>
                        <p className="text-white/60 text-xs">
                            Visualize pendências do Classroom junto com seu calendário acadêmico.
                        </p>
                    </div>
                 </motion.div>

                 {/* Medium Block: Absences */}
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
                    className={`col-span-1 md:col-span-2 p-6 rounded-[2rem] border backdrop-blur-xl bg-white/5 border-white/10 hover:bg-white/10 transition-all flex items-center gap-6`}
                 >
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 text-red-400">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Calculadora de Faltas</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Pode Faltar?</h3>
                        <p className="text-white/60 text-xs">
                            Saiba exatamente quantas aulas você pode perder antes de reprovar.
                        </p>
                    </div>
                 </motion.div>

             </div>

             {/* CTA Button */}
             <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="w-full max-w-sm"
             >
                 <button 
                    onClick={() => setShowLogin(true)}
                    className={`group w-full py-4 rounded-2xl bg-white text-black font-black text-base uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/20`}
                 >
                    <span>Acessar Supaco</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                 </button>
                 <div className="mt-4 text-center">
                    <p className="text-[10px] opacity-50 font-medium uppercase tracking-wider">
                        Seus dados nunca saem do seu dispositivo.
                    </p>
                 </div>
             </motion.div>

      </motion.div>

      {/* Login Modal Overlay */}
      <AnimatePresence>
            {showLogin && (
                <motion.div 
                    className="absolute inset-0 z-20 flex items-center justify-center p-4"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                    {/* Backdrop for click-to-dismiss */}
                    <div className="absolute inset-0" onClick={() => setShowLogin(false)} />

                    <div className={`relative w-full max-w-md p-8 md:p-10 rounded-[2.5rem] border shadow-2xl backdrop-blur-2xl ${isDarkMode ? 'bg-slate-900/90 border-white/20' : 'bg-white/90 border-white/40 text-gray-900'}`}>
                        <div className="flex justify-between items-center mb-6">
                             <button 
                                onClick={() => setShowLogin(false)}
                                className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}`}>
                                Acesso IFRN
                            </div>
                        </div>

                        <div className="text-center mb-6">
                             <h2 className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Login</h2>
                             <p className={`text-sm opacity-60 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Use sua conta oficial do SUAP.</p>
                        </div>

                        {/* OAUTH BUTTON */}
                        <div className="mb-6">
                            <button
                                onClick={handleSuapOAuthLogin}
                                className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl group
                                    ${isDarkMode ? `bg-green-600 hover:bg-green-500 text-white shadow-green-600/20` : `bg-green-600 hover:bg-green-500 text-white shadow-green-600/20`}
                                `}
                            >
                                <div className="p-1 bg-white rounded-md text-green-600">
                                    <School size={16} />
                                </div>
                                <span>Entrar com SUAP (SSO)</span>
                                <ExternalLink size={16} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <div className="flex items-center gap-4 my-4 opacity-50">
                                <div className={`h-[1px] flex-1 ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Ou digite</span>
                                <div className={`h-[1px] flex-1 ${isDarkMode ? 'bg-white/20' : 'bg-black/20'}`} />
                            </div>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-black/40 border-white/10 focus-within:border-white/40 focus-within:bg-black/60' : 'bg-white/60 border-gray-200 focus-within:border-gray-400 focus-within:bg-white'}`}>
                                <User size={20} className="text-gray-400 shrink-0 group-focus-within:text-white transition-colors" />
                                <input 
                                    type="text" 
                                    value={mat}
                                    onChange={(e) => setMat(e.target.value)}
                                    placeholder="Matrícula"
                                    className={`bg-transparent outline-none text-lg font-medium flex-1 w-full ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                                />
                            </div>

                            <div className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-black/40 border-white/10 focus-within:border-white/40 focus-within:bg-black/60' : 'bg-white/60 border-gray-200 focus-within:border-gray-400 focus-within:bg-white'}`}>
                                <Lock size={20} className="text-gray-400 shrink-0 group-focus-within:text-white transition-colors" />
                                <input 
                                    type="password" 
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    placeholder="Senha"
                                    className={`bg-transparent outline-none text-lg font-medium flex-1 w-full ${isDarkMode ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                                />
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-500 text-xs font-bold flex items-center justify-center gap-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                    <AlertTriangle size={14} /> {error}
                                </motion.div>
                            )}

                            <button 
                                type="submit"
                                disabled={!mat || !pass || isLoading}
                                className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-3 transition-all mt-4
                                    ${!mat || !pass ? 'opacity-50 cursor-not-allowed bg-gray-500 text-white' : `bg-${primaryColor}-500 text-white hover:scale-[1.02] shadow-xl hover:shadow-${primaryColor}-500/30`}`}
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Entrar Manualmente</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                             <p className={`text-[10px] font-bold uppercase tracking-wider opacity-40 flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <Lock size={10} />
                                Criptografia de ponta a ponta
                             </p>
                        </div>
                    </div>
                </motion.div>
            )}
      </AnimatePresence>
    </motion.div>
  );
};
