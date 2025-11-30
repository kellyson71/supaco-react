import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, X, Brain, Check, Copy, Book, MessageSquare, ChevronRight, AlertCircle, ArrowRight, ChevronLeft, Edit3, Lightbulb } from 'lucide-react';
import { ClassroomWork } from '../../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface ClassroomAIOverlayProps {
  work: ClassroomWork;
  onClose: () => void;
  isDark: boolean;
  apiKey?: string;
  onOpenChatWithContext?: (messages: any[], pendingMessage?: string) => void;
}

// Helper: Copy Button
const CopyButton = ({ text, isDark }: { text: string, isDark: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all
                ${copied 
                    ? 'bg-green-500 text-white' 
                    : (isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')}
            `}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
        </button>
    );
};

export const ClassroomAIOverlay: React.FC<ClassroomAIOverlayProps> = ({ 
    work, onClose, isDark, apiKey, onOpenChatWithContext 
}) => {
    const [status, setStatus] = useState<'ANALYZING' | 'NEEDS_CONTEXT' | 'SOLVING' | 'SOLVED' | 'ERROR'>('ANALYZING');
    
    // Questionnaire State
    const [questions, setQuestions] = useState<Array<{ id: string, label: string, options: string[], recommended_index?: number }>>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string>>({}); // Key: QuestionID, Value: Selected Option
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({}); // Key: QuestionID, Value: Custom Text

    const [solution, setSolution] = useState<{ core: string, explanation: string, suggestions: string[] } | null>(null);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        analyzeWork();
    }, []);

    // Helper to clean JSON from Markdown fences
    const cleanJson = (text: string) => {
        if (!text) return "{}";
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        return cleaned;
    };

    const analyzeWork = async () => {
        if (!apiKey) {
            setStatus('ERROR');
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            const prompt = `
                Você é um especialista acadêmico rigoroso. Analise esta atividade:
                
                Matéria: "${work.courseName}"
                Título: "${work.title}"
                Descrição: "${work.description || ''}"

                OBJETIVO:
                Determine se você tem informações SUFICIENTES para gerar uma resposta de alta qualidade AGORA.

                REGRAS DE VERIFICAÇÃO:
                1. Se a atividade pede código mas NÃO especifica a linguagem, você PRECISA perguntar.
                2. Se a descrição menciona anexos ou é vaga, pergunte detalhes.
                3. Se envolver escolha de tema ou complexidade, pergunte.

                SAÍDA JSON OBRIGATÓRIA:
                {
                    "status": "SOLVED" | "NEEDS_CONTEXT",
                    "questions": [ // Apenas se NEEDS_CONTEXT. Máximo 5 perguntas.
                        { 
                            "id": "unique_id", 
                            "label": "Pergunta clara ao usuário?", 
                            "options": ["Opção A", "Opção B"], // Mínimo 2 opções prováveis.
                            "recommended_index": 0 // Índice (0-based) da opção mais provável/recomendada caso o usuário não saiba.
                        }
                    ],
                    "solution": { // Apenas se SOLVED
                        "core_answer": "A resposta final (Código, Texto). Use Markdown.",
                        "explanation": "Explicação detalhada. Use Markdown.",
                        "suggestions": ["Sugestão 1", "Sugestão 2"] // 3-4 sugestões de prompts para continuar.
                    }
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const cleanedText = cleanJson(response.text || '{}');
            let result;
            try {
                result = JSON.parse(cleanedText);
            } catch (jsonError) {
                console.error("JSON Parse Error:", jsonError);
                setStatus('ERROR');
                return;
            }

            if (result.status === 'NEEDS_CONTEXT' && result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setStatus('NEEDS_CONTEXT');
            } else if (result.status === 'SOLVED' && result.solution) {
                setSolution({
                    core: result.solution.core_answer,
                    explanation: result.solution.explanation,
                    suggestions: result.solution.suggestions || []
                });
                setStatus('SOLVED');
            } else {
                // Fallback
                if (result.solution) {
                    setSolution({ 
                        core: result.solution.core_answer, 
                        explanation: result.solution.explanation,
                        suggestions: result.solution.suggestions || []
                    });
                    setStatus('SOLVED');
                } else {
                    setStatus('ERROR');
                }
            }

        } catch (e) {
            console.error("AI API Error:", e);
            setStatus('ERROR');
        }
    };

    const handleNextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSolveWithContext();
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleOptionSelect = (questionId: string, option: string) => {
        setSelections(prev => ({ ...prev, [questionId]: option }));
    };

    const handleCustomInputChange = (questionId: string, text: string) => {
        setCustomInputs(prev => ({ ...prev, [questionId]: text }));
    };

    const handleSolveWithContext = async () => {
        if (!apiKey) return;
        setStatus('SOLVING');

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            const contextString = questions.map(q => {
                const selected = selections[q.id];
                const finalValue = selected === 'Outro' ? (customInputs[q.id] || "Não especificado") : selected;
                return `P: ${q.label}\nR: ${finalValue}`;
            }).join('\n\n');

            const prompt = `
                RESOLVER ATIVIDADE COM CONTEXTO ADICIONAL.
                
                Atividade Original:
                ${work.title} - ${work.description}

                Informações Fornecidas pelo Aluno:
                ${contextString}

                Gere a solução agora.
                SAÍDA JSON:
                {
                    "core_answer": "A resposta técnica/direta (Código, Resolução). Markdown.",
                    "explanation": "Explicação educativa. Markdown.",
                    "suggestions": ["Sugestão curta 1", "Sugestão curta 2", "Sugestão curta 3"] // 3-4 sugestões para o usuário continuar a conversa (ex: Refatorar, Explicar, Testar).
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const cleanedText = cleanJson(response.text || '{}');
            let result;
            try {
                result = JSON.parse(cleanedText);
            } catch (jsonError) {
                console.error("JSON Parse Error:", jsonError);
                setStatus('ERROR');
                return;
            }

            setSolution({
                core: result.core_answer || "Não foi possível gerar a resposta.",
                explanation: result.explanation || "Sem explicação.",
                suggestions: result.suggestions || ["Explicar melhor", "Dar exemplos"]
            });
            setStatus('SOLVED');

        } catch (e) {
            console.error("AI API Error:", e);
            setStatus('ERROR');
        }
    };

    const handleContinueChat = (msgOverride?: string) => {
        if (!solution) return;
        
        const contextMessages = [
            { 
                role: 'user', 
                id: 'ctx-1', 
                text: `Estou vendo a atividade "${work.title}".\nDescrição: ${work.description || 'N/A'}` 
            },
            { 
                role: 'model', 
                id: 'ctx-2', 
                text: `Aqui está a solução gerada:\n\n${solution.core}\n\nExplicação: ${solution.explanation}` 
            }
        ];
        
        const msg = msgOverride || chatInput.trim() || "Tenho uma dúvida sobre isso...";
        onOpenChatWithContext?.(contextMessages, msg);
        onClose();
    };

    const activeQuestion = questions[currentStep];
    // Add "Outro" to options if it exists
    const currentOptions = activeQuestion ? [...(activeQuestion.options || []), 'Outro'] : [];

    return (
        <div className={`absolute inset-0 z-50 flex flex-col ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b shrink-0 ${isDark ? 'border-white/10 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30 text-white">
                        <Sparkles size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Supaco AI</h3>
                        <div className="text-[10px] font-bold opacity-60 truncate max-w-[200px]">{work.title}</div>
                    </div>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-800'}`}>
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scroll p-6 relative flex flex-col">
                
                {/* LOADING STATES */}
                {(status === 'ANALYZING' || status === 'SOLVING') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-violet-500 blur-3xl opacity-20 animate-pulse" />
                            <Loader2 size={48} className={`animate-spin ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {status === 'ANALYZING' ? 'Analisando requisitos...' : 'Gerando solução...'}
                        </h2>
                        <p className="text-sm opacity-50 max-w-xs mx-auto">
                            {status === 'ANALYZING' ? 'Verificando se faltam informações para uma resposta perfeita.' : 'Escrevendo o código e as explicações.'}
                        </p>
                    </div>
                )}

                {/* STEPPED QUESTIONNAIRE STATE */}
                {status === 'NEEDS_CONTEXT' && activeQuestion && (
                    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Progress Header */}
                        <div className="flex items-center justify-between mb-6">
                            <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                                Etapa {currentStep + 1} de {questions.length}
                            </span>
                            <div className="flex gap-1">
                                {questions.map((_, idx) => (
                                    <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-violet-500' : `w-1.5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}`} />
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <h2 className={`text-2xl font-black mb-6 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {activeQuestion.label}
                            </h2>

                            <div className="grid gap-3 mb-6">
                                {currentOptions.map((opt, optIdx) => {
                                    const isSelected = selections[activeQuestion.id] === opt;
                                    const isRecommended = optIdx === activeQuestion.recommended_index;

                                    return (
                                        <div key={opt}>
                                            <button
                                                onClick={() => handleOptionSelect(activeQuestion.id, opt)}
                                                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden
                                                    ${isSelected 
                                                        ? `bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/20` 
                                                        : (isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300' : 'bg-white border-gray-200 hover:border-violet-300 text-gray-700')
                                                    }
                                                `}
                                            >
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="font-bold text-sm">{opt === 'Outro' ? 'Outro / Personalizar' : opt}</span>
                                                    {isRecommended && !isSelected && (
                                                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                                                            <Sparkles size={8} /> Sugerida
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && <Check size={18} />}
                                                {isRecommended && isSelected && (
                                                    <div className="absolute right-12 text-[9px] font-bold uppercase opacity-50 flex items-center gap-1">
                                                        <Sparkles size={8} /> Recomendada
                                                    </div>
                                                )}
                                            </button>
                                            
                                            {/* Custom Input Reveal */}
                                            {opt === 'Outro' && isSelected && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }} 
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="pt-3 pl-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-3 w-6 h-[1px] ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                                                        <div className="flex-1">
                                                            <div className={`text-[10px] font-bold uppercase mb-1.5 opacity-60 flex items-center gap-1.5`}>
                                                                <Edit3 size={10} /> Sua resposta
                                                            </div>
                                                            <textarea
                                                                value={customInputs[activeQuestion.id] || ''}
                                                                onChange={(e) => handleCustomInputChange(activeQuestion.id, e.target.value)}
                                                                placeholder="Digite os detalhes..."
                                                                className={`w-full p-3 rounded-xl text-sm font-medium outline-none border resize-none h-24 transition-colors
                                                                    ${isDark ? 'bg-black/30 border-white/10 focus:border-violet-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-violet-500 text-gray-900'}
                                                                `}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 mt-auto pt-6 border-t border-dashed border-gray-500/20">
                            {currentStep > 0 && (
                                <button 
                                    onClick={handlePrevStep}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <button 
                                onClick={handleNextStep}
                                disabled={!selections[activeQuestion.id] || (selections[activeQuestion.id] === 'Outro' && !customInputs[activeQuestion.id])}
                                className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg
                                    ${!selections[activeQuestion.id] 
                                        ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' 
                                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30 active:scale-[0.98]'
                                    }
                                `}
                            >
                                {currentStep === questions.length - 1 ? 'Gerar Solução' : 'Próximo'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* SOLVED STATE */}
                {status === 'SOLVED' && solution && (
                    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
                        
                        {/* Core Answer Box */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-500">
                                    <Check size={16} strokeWidth={3} />
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                                    Resposta Principal
                                </span>
                            </div>
                            
                            <div className={`relative rounded-2xl border-2 overflow-hidden group
                                ${isDark ? 'bg-[#0d1117] border-violet-500/30' : 'bg-violet-50 border-violet-200'}
                            `}>
                                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CopyButton text={solution.core.replace(/```/g, '')} isDark={isDark} />
                                </div>
                                <div className={`p-6 prose prose-sm md:prose-base max-w-none ${isDark ? 'prose-invert' : 'prose-stone'}`}>
                                    <ReactMarkdown 
                                        components={{
                                            code({node, className, children, ...props}) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const isBlock = !!match;
                                                return isBlock ? (
                                                    <div className="relative group/code my-4">
                                                        <pre className={`!p-4 !rounded-xl !bg-black/50 border border-white/10 overflow-x-auto`}>
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </pre>
                                                    </div>
                                                ) : (
                                                    <code className={`px-1.5 py-0.5 rounded font-mono text-sm ${isDark ? 'bg-white/10 text-violet-300' : 'bg-black/5 text-violet-700'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {solution.core}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Explanation Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 opacity-60">
                                <Book size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">Explicação</span>
                            </div>
                            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200'}`}>
                                <div className={`prose prose-sm md:prose-base max-w-none ${isDark ? 'prose-invert' : 'prose-stone'}`}>
                                    <ReactMarkdown>{solution.explanation}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Quick Prompts (Suggestions) */}
                        {solution.suggestions && solution.suggestions.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 opacity-60">
                                    <Lightbulb size={16} />
                                    <span className="text-xs font-black uppercase tracking-widest">Continuar Aprendendo</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {solution.suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleContinueChat(suggestion)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border text-left
                                                ${isDark 
                                                    ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/50 text-gray-300 hover:text-white' 
                                                    : 'bg-white border-gray-200 hover:border-violet-300 hover:bg-gray-50 text-gray-700 hover:text-black'}
                                            `}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* ERROR STATE */}
                {status === 'ERROR' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-70">
                        <AlertCircle size={48} className="text-red-500 mb-4" />
                        <h3 className="text-lg font-bold">Algo deu errado</h3>
                        <p className="text-sm mb-4">Não consegui processar a atividade. Verifique sua chave de API ou tente novamente.</p>
                        <button onClick={onClose} className="underline text-xs">Voltar</button>
                    </div>
                )}
            </div>

            {/* Footer Chat Input (Only when Solved) */}
            {status === 'SOLVED' && (
                <div className={`p-4 border-t shrink-0 absolute bottom-0 left-0 right-0 z-20 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`flex items-center gap-2 p-2 pl-4 rounded-2xl border transition-colors focus-within:border-violet-500 shadow-lg ${isDark ? 'bg-slate-950 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        <MessageSquare size={18} className="opacity-40" />
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Dúvidas? Pergunte sobre a resposta..."
                            className={`flex-1 bg-transparent outline-none text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                            onKeyDown={(e) => e.key === 'Enter' && handleContinueChat()}
                        />
                        <button 
                            onClick={() => handleContinueChat()}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:scale-105 transition-transform flex items-center gap-2`}
                        >
                            Continuar <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};