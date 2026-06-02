
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, User, AlertTriangle, ArrowLeft, Fingerprint, ChevronRight, Github, Monitor } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = useState(
      localStorage.getItem('suap_remember_me') !== 'false'
  );

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
            localStorage.setItem('suap_remember_me', String(rememberMe));

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

  return (
    <motion.div 
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center font-sans text-white overflow-hidden`}
        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
    >
      
      {/* Background - Minimalist Blur */}
      <motion.div 
        className="absolute inset-0 bg-no-repeat bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${currentWallpaper})` }}
        animate={{ scale: showLogin ? 1.05 : 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      <div className={`absolute inset-0 z-0 backdrop-blur-xl ${isDarkMode ? 'bg-black/70' : 'bg-black/40'}`} />

      {/* GitHub / Desktop App Link - Discreet Top Right */}
      <a 
        href="https://github.com/kellyson71/electron_supaco_IFRN-API" 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute top-6 right-6 z-50 flex items-center gap-2 p-2 rounded-full transition-all duration-300 opacity-30 hover:opacity-100 hover:bg-white/10 group text-white"
        title="Baixar Versão Desktop"
      >
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">App Desktop</span>
          <Github size={20} />
      </a>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
          {!showLogin ? (
               <motion.div 
                   key="intro"
                   className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6 text-center max-w-md"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
                   transition={{ duration: 0.6 }}
               >
                   <motion.div 
                       initial={{ scale: 0.8, opacity: 0 }} 
                       animate={{ scale: 1, opacity: 1 }} 
                       transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                       className="mb-8"
                   >
                        <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-4 select-none">
                            SUPACO
                        </h1>
                        <div className="h-1 w-24 bg-white/20 mx-auto rounded-full" />
                   </motion.div>
                   
                   <p className="text-lg text-white/70 font-medium mb-12 max-w-xs mx-auto leading-relaxed">
                       Sua vida acadêmica no IFRN. <br/>
                       <span className="text-white">Redefinida.</span>
                   </p>

                   <div className="w-full space-y-4">
                        <button
                            onClick={handleSuapOAuthLogin}
                            className="group relative w-full h-16 rounded-2xl bg-white text-black font-bold text-sm uppercase tracking-widest flex items-center justify-between px-6 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/10"
                        >
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                             
                             <div className="flex items-center gap-4 relative z-10">
                                 <div className="p-2 bg-black text-white rounded-lg">
                                     <Fingerprint size={20} />
                                 </div>
                                 <span className="flex flex-col items-start">
                                     <span>Entrar com SUAP</span>
                                     <span className="text-[9px] opacity-50 font-normal normal-case">Acesso Rápido & Seguro</span>
                                 </span>
                             </div>
                             
                             <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform relative z-10" />
                        </button>

                        <button 
                            onClick={() => setShowLogin(true)}
                            className="w-full py-4 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2 group"
                        >
                            Acesso Manual <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                   </div>
                   
                   <div className="absolute bottom-8 text-[10px] text-white/30 font-mono">
                        v2.1.8 • WEB
                   </div>

               </motion.div>
          ) : (
               <motion.div 
                   key="login-form"
                   className="relative z-20 w-full max-w-[360px] p-6"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ type: "spring", damping: 25, stiffness: 300 }}
               >
                   {/* Glass Card */}
                   <div className={`p-8 rounded-[2rem] border backdrop-blur-3xl shadow-2xl ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/10 border-white/20'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <button 
                                onClick={() => setShowLogin(false)}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Login Manual</span>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 ml-2">Matrícula</label>
                                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 focus-within:border-white/40 focus-within:bg-black/60 transition-all">
                                    <User size={18} className="text-white/40" />
                                    <input 
                                        type="text" 
                                        value={mat}
                                        onChange={(e) => setMat(e.target.value)}
                                        className="bg-transparent outline-none text-sm font-bold text-white placeholder:text-white/20 w-full"
                                        placeholder="202..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 ml-2">Senha</label>
                                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-black/40 border border-white/10 focus-within:border-white/40 focus-within:bg-black/60 transition-all">
                                    <Lock size={18} className="text-white/40" />
                                    <input 
                                        type="password" 
                                        value={pass}
                                        onChange={(e) => setPass(e.target.value)}
                                        className="bg-transparent outline-none text-sm font-bold text-white placeholder:text-white/20 w-full"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-red-300 text-xs font-bold flex items-center gap-2 bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                                    <AlertTriangle size={14} /> {error}
                                </motion.div>
                            )}

                            <button
                                type="button"
                                onClick={() => setRememberMe(v => !v)}
                                className="flex items-center gap-3 w-full px-1 py-1 mt-1 group"
                            >
                                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${rememberMe ? 'bg-white border-white' : 'border-white/30 bg-transparent'}`}>
                                    {rememberMe && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span className="text-[11px] font-bold text-white/60 group-hover:text-white/90 transition-colors">Lembrar de mim</span>
                            </button>

                            <button
                                type="submit"
                                disabled={!mat || !pass || isLoading}
                                className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-2
                                    ${!mat || !pass ? 'opacity-50 cursor-not-allowed bg-white/10 text-white' : `bg-white text-black hover:scale-[1.02] shadow-lg`}`}
                            >
                                {isLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : 'Entrar'}
                            </button>
                        </form>
                   </div>
               </motion.div>
          )}
      </AnimatePresence>

    </motion.div>
  );
};
