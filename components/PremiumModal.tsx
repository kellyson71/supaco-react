
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Crown, Zap, Shield, Star, Sparkles, QrCode, Copy, Loader2, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PremiumModalProps {
  onClose: () => void;
  onSubscribe: () => void;
  isDarkMode: boolean;
  accentColor: string;
  userData: any; // Receives full profile for payment generation
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onSubscribe, isDarkMode, accentColor, userData }) => {
  const [step, setStep] = useState<'plans' | 'payment' | 'success'>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isCreating, setIsCreating] = useState(false);
  
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
    // If we don't have a CPF from SUAP, we try to ask, but usually this data comes from the profile
    // Ideally the Edge Function handles validation or fallback, but let's check basic existence
    // Note: Some users might not have CPF in userData if suap doesn't return it.
    
    const safeEmail = (userData?.email_academico || userData?.email_secundario || "aluno_sem_email@supaco.app").trim();
    const finalEmail = safeEmail.includes('@') ? safeEmail : "aluno_sem_email@supaco.app";
    const safeName = (userData?.nome_completo || userData?.nome_usual || "Aluno Supaco").trim();
    // Fallback CPF for dev/test if missing (Edge function should handle validation/cleaning)
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

        if (error) throw error;
        if (data && data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

        setQrCodeBase64(data.brCodeBase64);
        setCopyPasteCode(data.brCode);
        setPaymentId(data.id);
        setStep('payment');
        startPolling(data.id);

    } catch (err: any) {
        console.error("Payment Creation Error:", err);
        alert("Erro ao criar pagamento: " + (err.message || "Tente novamente."));
    } finally {
        setIsCreating(false);
    }
  };

  const startPolling = (pid: string) => {
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
              console.warn("Polling error", e);
          }
      }, 3000); // Check every 3 seconds
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(copyPasteCode);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
  };

  const bgClass = isDarkMode ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-gray-200';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
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
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scroll rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col md:flex-row ${bgClass}`}
      >
        {/* Left Side - Visual */}
        <div className={`relative w-full md:w-2/5 p-8 flex flex-col justify-between overflow-hidden ${isDarkMode ? 'bg-black/40' : 'bg-gray-900 text-white'}`}>
            <div className={`absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2`} />
            <div className={`absolute bottom-0 left-0 w-64 h-64 bg-${accentColor}-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2`} />
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Crown size={12} fill="currentColor" />
                    Supaco Premium
                </div>
                <h2 className="text-4xl md:text-5xl font-black leading-[0.9] tracking-tighter mb-4 text-white">
                    Desbloqueie<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">o Poder da IA</span>
                </h2>
                <p className="text-sm opacity-70 leading-relaxed">
                    Acesso ilimitado ao Gemini 2.5 Flash integrado, temas exclusivos e suporte ao projeto.
                </p>
            </div>

            <div className="relative z-10 mt-8 space-y-4">
                {[
                    { icon: Zap, text: "Respostas Instantâneas" },
                    { icon: Shield, text: "Sem chaves de API" },
                    { icon: Star, text: "Apoie o Desenvolvimento" },
                    { icon: Sparkles, text: "Funcionalidades Beta" }
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white">
                            <item.icon size={16} />
                        </div>
                        <span className="text-xs font-bold text-white/90">{item.text}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Side - Content Swapper */}
        <div className="flex-1 p-6 md:p-8 flex flex-col">
            <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                    <h3 className={`text-xl font-bold ${textMain}`}>
                        {step === 'plans' ? 'Escolha seu plano' : step === 'payment' ? 'Pagamento Pix' : 'Sucesso!'}
                    </h3>
                    {step === 'plans' && <p className="text-xs opacity-60">Cancele a qualquer momento.</p>}
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                    <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                </button>
            </div>

            {/* STEP 1: PLANS */}
            {step === 'plans' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
                    <div className={`p-1 rounded-xl self-center flex mb-8 border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                        <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                        >
                            Mensal
                        </button>
                        <button 
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                        >
                            Anual
                            <span className="bg-green-500/20 text-green-500 text-[9px] px-1.5 py-0.5 rounded uppercase">-20%</span>
                        </button>
                    </div>

                    <div className="grid gap-4 mb-8">
                        <div 
                            onClick={() => setBillingCycle('monthly')}
                            className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                            ${billingCycle === 'monthly' 
                                ? (isDarkMode ? 'bg-white/5 border-amber-500' : 'bg-amber-50 border-amber-500') 
                                : (isDarkMode ? 'bg-transparent border-white/10 opacity-60 hover:opacity-100' : 'bg-transparent border-gray-100 opacity-60 hover:opacity-100')}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${billingCycle === 'monthly' ? 'border-amber-500' : 'border-gray-400'}`}>
                                    {billingCycle === 'monthly' && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                                </div>
                                <div>
                                    <div className={`font-bold ${textMain}`}>Mensal</div>
                                    <div className="text-xs opacity-60">Flexibilidade total</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black ${textMain}`}>R$ 9,90</div>
                                <div className="text-[10px] opacity-60">/mês</div>
                            </div>
                        </div>

                        <div 
                            onClick={() => setBillingCycle('yearly')}
                            className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                            ${billingCycle === 'yearly' 
                                ? (isDarkMode ? 'bg-white/5 border-amber-500' : 'bg-amber-50 border-amber-500') 
                                : (isDarkMode ? 'bg-transparent border-white/10 opacity-60 hover:opacity-100' : 'bg-transparent border-gray-100 opacity-60 hover:opacity-100')}`}
                        >
                            {billingCycle === 'yearly' && (
                                <div className="absolute -top-3 right-4 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                                    Melhor Oferta
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${billingCycle === 'yearly' ? 'border-amber-500' : 'border-gray-400'}`}>
                                    {billingCycle === 'yearly' && <div className="w-3 h-3 rounded-full bg-amber-500" />}
                                </div>
                                <div>
                                    <div className={`font-bold ${textMain}`}>Anual</div>
                                    <div className="text-xs opacity-60">Cobrado anualmente</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black ${textMain}`}>R$ 79,90</div>
                                <div className="text-[10px] opacity-60">/ano</div>
                                <div className="text-[9px] opacity-40 line-through">R$ 118,80/ano</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <button
                            onClick={handleCreatePayment}
                            disabled={isCreating}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <><Loader2 className="animate-spin" size={16} /> Criando Cobrança...</>
                            ) : (
                                <>Assinar via Pix <QrCode className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* STEP 2: PAYMENT (QR CODE) */}
            {step === 'payment' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col h-full">
                    
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        {/* Minimalist QR Container with Glow */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl opacity-20 blur-lg group-hover:opacity-40 transition-opacity duration-1000"></div>
                            <div className="relative p-1 bg-white rounded-2xl shadow-xl">
                                {qrCodeBase64 ? (
                                    <div className="p-3 bg-white rounded-xl">
                                        <img src={qrCodeBase64} alt="Pix QRCode" className="w-48 h-48 object-contain mix-blend-multiply" />
                                    </div>
                                ) : (
                                    <div className="w-52 h-52 flex items-center justify-center bg-gray-50 rounded-xl">
                                        <Loader2 className="animate-spin text-gray-300" size={32} />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1">
                             <div className="flex items-center gap-2 text-xs font-bold text-amber-500 animate-pulse">
                                <Loader2 size={12} className="animate-spin" />
                                Aguardando pagamento...
                             </div>
                             <p className={`text-xs opacity-50 ${textMain}`}>Abra seu app do banco e escaneie.</p>
                        </div>
                    </div>

                    {/* Code Box */}
                    <div className="mt-6 shrink-0">
                         <div className={`w-full rounded-2xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                             <div className="flex justify-between items-center px-4 py-3 border-b border-dashed border-gray-500/20">
                                 <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-2">
                                     <Smartphone size={12} /> Pix Copia e Cola
                                 </span>
                                 <button 
                                    onClick={handleCopy}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-colors
                                        ${hasCopied 
                                            ? 'bg-green-500 text-white' 
                                            : (isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-200 text-gray-800 shadow-sm')}
                                    `}
                                 >
                                     {hasCopied ? <Check size={12} /> : <Copy size={12} />}
                                     {hasCopied ? 'Copiado!' : 'Copiar'}
                                 </button>
                             </div>
                             <div className="p-3 bg-black/5 dark:bg-black/40">
                                 <div className={`font-mono text-[10px] leading-relaxed break-all max-h-20 overflow-y-auto custom-scroll select-all ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                     {copyPasteCode || "Carregando código..."}
                                 </div>
                             </div>
                         </div>
                    </div>

                </motion.div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 'success' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl shadow-green-500/50 mb-6">
                        <Check size={48} strokeWidth={4} />
                    </div>
                    <h2 className={`text-3xl font-black mb-2 ${textMain}`}>Pagamento Confirmado!</h2>
                    <p className="opacity-60 max-w-xs mx-auto mb-8">
                        Sua assinatura Premium está ativa. Aproveite todos os recursos ilimitados agora mesmo.
                    </p>
                    <div className="animate-pulse text-xs font-bold uppercase tracking-widest opacity-40">
                        Fechando...
                    </div>
                </motion.div>
            )}
        </div>

      </motion.div>
    </div>
  );
};
