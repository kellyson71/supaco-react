
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, Zap, Star, Shield, Rocket, Loader2, AlertTriangle, ArrowRight, Brain, Clock, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PremiumModalProps {
  onClose: () => void;
  onSubscribe: () => void;
  isDarkMode: boolean;
  accentColor: string;
  userData: any;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onSubscribe, isDarkMode, accentColor, userData }) => {
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Payment Data
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [copyPasteCode, setCopyPasteCode] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Polling Ref
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const handleCreatePayment = async () => {
    setErrorMsg(null);
    const safeEmail = (userData?.email_academico || userData?.email_secundario || "aluno_sem_email@supaco.app").trim();
    const finalEmail = safeEmail.includes('@') ? safeEmail : "aluno_sem_email@supaco.app";
    const safeName = (userData?.nome_completo || userData?.nome_usual || "Aluno Supaco").trim();
    const safeCpf = userData?.cpf || "00000000000"; 

    setIsCreating(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-abacate-payment', {
            body: {
                matricula: userData?.matricula || "000000",
                cycle: billingCycle,
                userDetails: {
                    nome: safeName,
                    cpf: safeCpf,
                    email: finalEmail
                }
            }
        });

        if (error) {
            console.error("Supabase Function Error:", error);
            throw new Error("Erro de conexão com o servidor de pagamento.");
        }
        
        if (data && data.error) {
            throw new Error(typeof data.error === 'string' ? data.error : "Erro ao gerar Pix.");
        }

        if (!data || !data.brCode) {
             // Fallback handling if response isn't structured as expected but no error thrown
             throw new Error("Resposta inválida do provedor de pagamento.");
        }

        setQrCodeBase64(data.brCodeBase64);
        setCopyPasteCode(data.brCode);
        setPaymentId(data.id);
        setStep('payment');
        startPolling(data.id);

    } catch (err: any) {
        console.error("Payment Creation Logic Error:", err);
        // Handle HTML error responses (like 404/500 from generic server errors) which manifest as syntax errors in JSON parsing usually caught by fetch, 
        // but here supabase.functions.invoke handles it.
        let msg = err.message || "Erro desconhecido ao criar pagamento.";
        if (msg.includes('Unexpected token')) msg = "Erro no servidor de pagamento. Tente novamente mais tarde.";
        setErrorMsg(msg);
    } finally {
        setIsCreating(false);
    }
  };

  const startPolling = (pid: string) => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      setIsPolling(true);
      
      pollInterval.current = setInterval(async () => {
          try {
              const { data } = await supabase.functions.invoke('check-abacate-status', {
                  body: { paymentId: pid }
              });

              if (data && data.status === 'PAID') {
                  clearInterval(pollInterval.current);
                  setStep('success');
                  setIsPolling(false);
                  setTimeout(() => {
                      onSubscribe();
                      onClose();
                  }, 3000);
              }
          } catch (e) {
              console.warn("Polling silent error", e);
          }
      }, 3000); 
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(copyPasteCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
  };

  const benefits = [
    {
        icon: Brain,
        title: "IA Acadêmica Avançada",
        desc: "Respostas detalhadas e explicadas para suas dúvidas.",
    },
    {
        icon: Smartphone,
        title: "Apps & Integrações",
        desc: "Conexão com Google Classroom e ferramentas exclusivas.",
    },
    {
        icon: Clock,
        title: "Produtividade Máxima",
        desc: "Modo Foco, Pomodoro e cálculo estratégico de notas.",
    },
    {
        icon: Star,
        title: "Personalização Pro",
        desc: "Temas, ícones e wallpapers exclusivos.",
    }
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020202]/90 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row bg-[#09090b] border border-white/10 ring-1 ring-white/5"
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full transition-colors hover:bg-white/10 text-white/50 hover:text-white"
        >
            <X size={20} />
        </button>

        {/* LEFT PANEL - VISUAL & BRANDING */}
        <div className="relative w-full md:w-[45%] p-8 flex flex-col justify-between overflow-hidden bg-black text-white shrink-0">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-900/30 via-black to-black opacity-60" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
            </div>

            <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-8 ring-1 ring-white/10">
                    <Rocket size={24} className="text-white fill-white/20" />
                </div>
                <h2 className="text-4xl font-black tracking-tight leading-none mb-4">
                    Supaco <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Pro</span>
                </h2>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-[260px]">
                    A ferramenta definitiva para o estudante do IFRN. Potencialize seus estudos com IA e design premium.
                </p>
            </div>

            <div className="relative z-10 mt-12 space-y-6">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 w-fit backdrop-blur-md hover:bg-white/10 transition-colors">
                    <div className="bg-green-500/20 p-2 rounded-xl text-green-400 ring-1 ring-green-500/30">
                        <Shield size={16} fill="currentColor" className="opacity-80" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">Segurança</span>
                        <span className="text-xs font-bold text-white flex items-center gap-1">Pagamento Seguro via Pix</span>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT PANEL - CONTENT SWAPPER */}
        <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto custom-scroll bg-[#0c0c0e] text-white relative">
            
            {/* STEP 1: PLANS & BENEFITS */}
            {step === 'plans' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full relative z-10">
                    
                    {/* Benefits List */}
                    <div className="flex-1 space-y-4 mb-6">
                        {benefits.map((item, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + (i * 0.1) }}
                                className="flex gap-4 group p-3 rounded-2xl transition-colors hover:bg-white/5 border border-transparent hover:border-white/5"
                            >
                                <div className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all bg-white/5 group-hover:bg-violet-500/20 text-zinc-400 group-hover:text-violet-400 group-hover:scale-110">
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-1 group-hover:text-violet-200 transition-colors">{item.title}</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Error Message Display */}
                    {errorMsg && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
                        </motion.div>
                    )}

                    {/* Plan Selector */}
                    <div className="mt-auto pt-6 border-t border-white/5">
                        <div className="flex p-1.5 rounded-2xl mb-5 bg-black/40 border border-white/10 relative">
                            <button 
                                onClick={() => setBillingCycle('monthly')}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Mensal <span className="opacity-50 ml-1">R$ 9,90</span>
                            </button>
                            <button 
                                onClick={() => setBillingCycle('yearly')}
                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Anual <span className="opacity-50 ml-1">R$ 79,90</span>
                                <span className="absolute -top-3 -right-2 bg-green-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-lg shadow-green-500/20 animate-bounce">-30%</span>
                            </button>
                            
                            {/* Sliding Background */}
                            <motion.div 
                                className="absolute top-1.5 bottom-1.5 rounded-xl bg-white/10 border border-white/5 shadow-sm"
                                layoutId="billingTab"
                                initial={false}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                style={{
                                    width: 'calc(50% - 6px)',
                                    left: billingCycle === 'monthly' ? '6px' : 'calc(50% + 0px)'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleCreatePayment}
                            disabled={isCreating}
                            className="group relative w-full py-4 rounded-2xl font-bold text-sm text-white overflow-hidden shadow-2xl shadow-violet-900/20 transition-all active:scale-[0.98] hover:shadow-violet-600/30"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 group-hover:scale-105 transition-transform duration-500" />
                            <div className="relative flex items-center justify-center gap-2">
                                {isCreating ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>Desbloquear Agora <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </div>
                        </button>
                        <p className="text-center mt-4 text-[10px] font-medium text-zinc-600">
                            Acesso imediato após confirmação.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === 'payment' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col h-full items-center justify-center text-center relative z-10">
                    
                    <h3 className="text-xl font-bold mb-8 text-white">Escaneie o QR Code</h3>
                    
                    <div className="relative group mb-8">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-3xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-1000" />
                        <div className="relative p-1.5 bg-white rounded-3xl shadow-2xl">
                            {qrCodeBase64 ? (
                                <div className="p-4 bg-white rounded-2xl">
                                    <img src={qrCodeBase64} alt="Pix QRCode" className="w-48 h-48 object-contain mix-blend-multiply" />
                                </div>
                            ) : (
                                <div className="w-56 h-56 flex items-center justify-center bg-gray-50 rounded-2xl">
                                    <Loader2 className="animate-spin text-gray-300" size={32} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 mb-8">
                         <div className="flex items-center gap-2 text-xs font-bold text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-full border border-violet-500/20 animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            Aguardando pagamento...
                         </div>
                         <p className="text-xs opacity-50 text-zinc-400 max-w-[200px]">Abra o app do seu banco e pague via Pix.</p>
                    </div>

                    <div className="w-full p-4 rounded-2xl border border-white/10 flex items-center gap-3 bg-black/30 hover:bg-black/50 transition-colors">
                        <div className="flex-1 font-mono text-[10px] opacity-60 truncate text-left text-zinc-300 select-all">
                            {copyPasteCode || "Gerando código..."}
                        </div>
                        <button 
                            onClick={handleCopy}
                            className={`p-2.5 rounded-xl transition-all ${hasCopied ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            {hasCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                    
                    <button onClick={() => setStep('plans')} className="mt-8 text-xs text-zinc-500 hover:text-white underline underline-offset-4 transition-colors">
                        Cancelar e voltar
                    </button>
                </motion.div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 'success' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-green-500 blur-[60px] opacity-20 rounded-full" />
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-green-500/30">
                            <Check size={56} strokeWidth={4} />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black mb-3 text-white tracking-tight">Pagamento Confirmado!</h2>
                    <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-10 leading-relaxed">
                        Bem-vindo ao <span className="text-white font-bold">Supaco Pro</span>. Aproveite todos os recursos desbloqueados.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600 animate-pulse">
                        <Loader2 size={12} className="animate-spin" />
                        Atualizando sua conta...
                    </div>
                </motion.div>
            )}

        </div>
      </motion.div>
    </div>
  );
};
