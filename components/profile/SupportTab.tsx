
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Mail, Send, Lightbulb, Rocket, Copy, Check, Loader2, AlertCircle
} from 'lucide-react';
import { UserFeedback } from '../../types';
import { SecureStorage } from '../../services/SecureStorage';

const DEVELOPER_EMAIL = "kellyson.medeiros.pdf@gmail.com";

const CopyButton = ({ text, isDark }: { text: string, isDark: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className={`p-1.5 rounded-lg transition-colors ${copied ? 'bg-green-500 text-white' : (isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200')}`}
            title="Copiar Email"
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
    );
};

const SectionHeader = ({ icon: Icon, title, color }: any) => (
    <div className="flex items-center gap-2 mb-4 opacity-70">
        <Icon size={16} className={`text-${color}-500`} />
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
);

export const SupportTabContent = ({ isDark, accentColor, userData }: any) => {
    
    // Feedback State
    const [feedbackType, setFeedbackType] = useState<'suggestion' | 'feature'>('suggestion');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackEmail, setFeedbackEmail] = useState(userData?.email_secundario || userData?.email_academico || '');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSendFeedback = async () => {
        if (!feedbackMessage.trim() || !userData?.matricula) return;
        
        setIsSendingFeedback(true);
        setErrorMsg('');
        
        try {
            const feedbackData: UserFeedback = {
                type: feedbackType,
                message: feedbackMessage,
                contact_email: feedbackEmail
            };
            
            const { error } = await SecureStorage.sendFeedback(userData.matricula, feedbackData);
            
            if (!error) {
                setFeedbackSuccess(true);
                setFeedbackMessage('');
                setTimeout(() => setFeedbackSuccess(false), 3000);
            } else {
                setErrorMsg('Falha ao enviar. Verifique sua conexão.');
            }
        } catch (e) {
            console.error("Feedback error", e);
            setErrorMsg('Erro inesperado.');
        } finally {
            setIsSendingFeedback(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto space-y-8 pb-10">
            
            <div className="text-center mb-8">
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Central de Suporte</h2>
                <p className="text-sm font-medium opacity-60">Encontrou um bug ou tem uma ideia incrível? Fale com a gente.</p>
            </div>

            {/* Developer Contact */}
            <div>
                <SectionHeader icon={Mail} title="Contato Direto" color={accentColor} />
                <div className={`flex items-center justify-between p-6 rounded-[2rem] border shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`}`}>
                            <Mail size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-[10px] font-bold uppercase opacity-60 mb-1`}>Email do Desenvolvedor</div>
                            <div className={`text-sm md:text-base font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{DEVELOPER_EMAIL}</div>
                        </div>
                    </div>
                    <CopyButton text={DEVELOPER_EMAIL} isDark={isDark} />
                </div>
            </div>

            {/* Feedback Form */}
            <div>
                <SectionHeader icon={MessageSquare} title="Enviar Feedback" color={accentColor} />
                <div className={`rounded-[2rem] border overflow-hidden p-6 md:p-8 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                    
                    <div className="space-y-6">
                        {/* Type Selector */}
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-60 mb-2 block ml-1">Tipo de Mensagem</label>
                            <div className={`flex p-1.5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <button 
                                    onClick={() => setFeedbackType('suggestion')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${feedbackType === 'suggestion' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                                >
                                    <Lightbulb size={16} /> Sugestão
                                </button>
                                <button 
                                    onClick={() => setFeedbackType('feature')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${feedbackType === 'feature' ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                                >
                                    <Rocket size={16} /> Nova Feature
                                </button>
                            </div>
                        </div>

                        {/* Message Input */}
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-60 mb-2 block ml-1">Mensagem</label>
                            <textarea 
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                placeholder="Descreva sua ideia, sugestão ou reporte um erro..."
                                className={`w-full p-4 rounded-2xl text-sm font-medium h-40 outline-none border resize-none transition-colors
                                    ${isDark ? 'bg-black/30 border-white/10 focus:border-white/30 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 focus:border-gray-400 text-gray-900 placeholder:text-gray-400'}
                                `}
                            />
                        </div>

                        {/* Contact Email */}
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-60 mb-2 block ml-1">Email para Retorno (Opcional)</label>
                            <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <Mail size={18} className="opacity-40" />
                                <input 
                                    type="email" 
                                    value={feedbackEmail} 
                                    onChange={(e) => setFeedbackEmail(e.target.value)} 
                                    placeholder="seu@email.com" 
                                    className={`bg-transparent outline-none w-full text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`} 
                                />
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 p-3 rounded-xl">
                                <AlertCircle size={16} /> {errorMsg}
                            </div>
                        )}

                        <button 
                            onClick={handleSendFeedback}
                            disabled={!feedbackMessage.trim() || isSendingFeedback}
                            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg
                                ${feedbackSuccess 
                                    ? 'bg-green-500 text-white' 
                                    : (isDark ? `bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white` : `bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white`)
                                }
                                ${(!feedbackMessage.trim() || isSendingFeedback) && !feedbackSuccess ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}
                            `}
                        >
                            {isSendingFeedback ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : feedbackSuccess ? (
                                <>Enviado com Sucesso <Check size={18} /></>
                            ) : (
                                <>Enviar Feedback <Send size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
