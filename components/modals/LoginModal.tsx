import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Monitor, Database, User, Lock, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isDarkMode: boolean;
  primaryColor: string;
  onSuapLogin: () => void;
  onGoogleLogin?: () => void;
  onDismiss: () => void;
  onManualLogin?: (mat: string, pass: string) => Promise<boolean>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isDarkMode, primaryColor, onSuapLogin, onGoogleLogin, onDismiss, onManualLogin }) => {
    const [rememberMe, setRememberMe] = useState(
        localStorage.getItem('suap_remember_me') !== 'false'
    );
    const [showManual, setShowManual] = useState(false);
    const [mat, setMat] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSuapLogin = () => {
        localStorage.setItem('suap_remember_me', String(rememberMe));
        onSuapLogin();
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mat || !pass || isLoading) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('https://suap.ifrn.edu.br/api/token/pair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ username: mat, password: pass })
            });
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('suap_access_token', data.access);
                localStorage.setItem('suap_refresh_token', data.refresh);
                localStorage.setItem('suap_username', mat);
                localStorage.setItem('suap_remember_me', String(rememberMe));
                if (onManualLogin) {
                    await onManualLogin(mat, pass);
                } else {
                    window.location.reload();
                }
            } else {
                setError('Matrícula ou senha inválidos.');
            }
        } catch {
            setError('Erro de conexão com o SUAP.');
        } finally {
            setIsLoading(false);
        }
    };

    const base = isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900';
    const inputBg = isDarkMode ? 'bg-white/5 border-white/10 focus-within:border-white/30 text-white' : 'bg-gray-50 border-gray-200 focus-within:border-gray-400 text-gray-900';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl relative overflow-hidden ${base}`}
            >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${primaryColor}-500/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2`} />

                <div className="relative z-10 flex flex-col items-center text-center p-8 pb-6">
                    <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <Fingerprint size={28} className={`text-${primaryColor}-500`} />
                    </div>

                    <h2 className="text-xl font-black mb-1.5">Sessão Expirada</h2>
                    <p className="text-xs opacity-60 mb-5 leading-relaxed">
                        Para sincronizar novos dados, faça login novamente. Você pode continuar visualizando os dados em cache.
                    </p>

                    {/* Lembrar de mim */}
                    <button
                        onClick={() => setRememberMe(v => !v)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-4 transition-colors border text-left
                            ${rememberMe
                                ? (isDarkMode ? `bg-${primaryColor}-500/15 border-${primaryColor}-500/40` : `bg-${primaryColor}-50 border-${primaryColor}-200`)
                                : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200')
                            }`}
                    >
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors
                            ${rememberMe
                                ? `bg-${primaryColor}-500 border-${primaryColor}-500`
                                : (isDarkMode ? 'border-white/30' : 'border-gray-300')
                            }`}
                        >
                            {rememberMe && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span className="text-xs font-bold">Lembrar de mim</span>
                    </button>

                    <div className="w-full space-y-2.5">
                        {/* OAuth */}
                        <button
                            onClick={handleSuapLogin}
                            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg
                                ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            <Fingerprint size={15} />
                            Entrar com SUAP
                        </button>

                        {/* Manual toggle */}
                        <button
                            onClick={() => { setShowManual(v => !v); setError(''); }}
                            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border
                                ${isDarkMode ? 'bg-transparent border-white/15 hover:bg-white/5 text-white/70' : 'bg-transparent border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <User size={14} />
                            Acesso Manual
                            <motion.div animate={{ rotate: showManual ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={13} />
                            </motion.div>
                        </button>

                        {/* Manual form */}
                        <AnimatePresence>
                            {showManual && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22 }}
                                    className="overflow-hidden"
                                >
                                    <form onSubmit={handleManualSubmit} className="space-y-2.5 pt-1">
                                        <div className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border ${inputBg}`}>
                                            <User size={15} className="opacity-40 shrink-0" />
                                            <input
                                                type="text"
                                                value={mat}
                                                onChange={e => setMat(e.target.value)}
                                                placeholder="Matrícula"
                                                autoComplete="username"
                                                className="bg-transparent outline-none text-sm font-bold w-full placeholder:opacity-30"
                                            />
                                        </div>
                                        <div className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border ${inputBg}`}>
                                            <Lock size={15} className="opacity-40 shrink-0" />
                                            <input
                                                type="password"
                                                value={pass}
                                                onChange={e => setPass(e.target.value)}
                                                placeholder="Senha"
                                                autoComplete="current-password"
                                                className="bg-transparent outline-none text-sm font-bold w-full placeholder:opacity-30"
                                            />
                                        </div>
                                        {error && (
                                            <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-2.5 rounded-xl border border-red-500/20">
                                                <AlertTriangle size={13} /> {error}
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={!mat || !pass || isLoading}
                                            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                                ${!mat || !pass ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                                                ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                                        >
                                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Entrar'}
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={onGoogleLogin}
                            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-colors border
                                ${isDarkMode ? 'bg-transparent border-white/10 hover:bg-white/5 text-white/50' : 'bg-transparent border-gray-100 hover:bg-gray-50 text-gray-400'}`}
                        >
                            <Monitor size={14} />
                            Conectar Classroom
                        </button>

                        <button
                            onClick={onDismiss}
                            className={`w-full py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-xl
                                ${isDarkMode ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Database size={12} />
                            Continuar com dados em cache
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
