
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, FileText, HelpCircle, ArrowRight, Loader2, RefreshCw, X, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface AIStudioModalProps {
  isDark: boolean;
  accentColor: string;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
  apiKey?: string;
}

type ToolType = 'flashcards' | 'quiz' | 'summary';

interface Flashcard {
    front: string;
    back: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export const AIStudioModal: React.FC<AIStudioModalProps> = ({ isDark, accentColor, isPremium, onOpenPremiumModal, apiKey }) => {
    const [activeTool, setActiveTool] = useState<ToolType | null>(null);
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Result States
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
    const [summary, setSummary] = useState('');
    
    // Interactive States
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [quizScore, setQuizScore] = useState(0);
    const [showQuizResult, setShowQuizResult] = useState(false);

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className={`w-20 h-20 rounded-full bg-violet-600/20 text-violet-500 flex items-center justify-center mb-6`}>
                    <Brain size={40} />
                </div>
                <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Supaco Brain</h2>
                <p className="text-sm opacity-60 max-w-xs mb-8">Ferramentas de estudo avançadas com IA. Crie flashcards, quizzes e resumos instantaneamente.</p>
                <button 
                    onClick={onOpenPremiumModal}
                    className="px-8 py-3 rounded-xl bg-violet-600 text-white font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-violet-700 transition-colors"
                >
                    Desbloquear Premium
                </button>
            </div>
        );
    }

    const resetState = () => {
        setFlashcards([]);
        setQuizData([]);
        setSummary('');
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setCurrentQuizIndex(0);
        setSelectedOption(null);
        setQuizScore(0);
        setShowQuizResult(false);
        setIsLoading(false);
    };

    const handleBack = () => {
        setActiveTool(null);
        resetState();
    };

    const generateContent = async () => {
        if (!topic.trim() || !apiKey) return;
        setIsLoading(true);
        // Do not reset state immediately here to prevent flicker if we were to show old data, 
        // but since we switch to loading screen, it's fine.
        // resetState(); // actually let's keep data until new one arrives or just clear it.
        // Clearing specifically result data:
        setFlashcards([]);
        setQuizData([]);
        setSummary('');

        try {
            const ai = new GoogleGenAI({ apiKey });
            let prompt = '';
            let schema = null;

            if (activeTool === 'flashcards') {
                prompt = `Gere 8 flashcards de estudo sobre o tema: "${topic}". Resposta em JSON puro.`;
                schema = {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            front: { type: "STRING" },
                            back: { type: "STRING" }
                        }
                    }
                };
            } else if (activeTool === 'quiz') {
                prompt = `Gere 5 perguntas de múltipla escolha sobre o tema: "${topic}". Resposta em JSON puro.`;
                schema = {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            options: { type: "ARRAY", items: { type: "STRING" } },
                            correctIndex: { type: "INTEGER" },
                            explanation: { type: "STRING" }
                        }
                    }
                };
            } else {
                prompt = `Faça um resumo didático e estruturado (Markdown) sobre: "${topic}". Use tópicos, negrito e seja direto.`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: activeTool === 'summary' ? 'text/plain' : 'application/json',
                    responseSchema: schema as any
                }
            });

            if (activeTool === 'summary') {
                setSummary(response.text || "Erro ao gerar resumo.");
            } else {
                const json = JSON.parse(response.text || '[]');
                if (activeTool === 'flashcards') setFlashcards(json);
                if (activeTool === 'quiz') setQuizData(json);
            }

        } catch (e) {
            console.error("AI Error", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER TOOLS ---

    const renderToolSelector = () => (
        <div className="flex flex-col h-full">
            <div className="mb-8">
                <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Estúdio IA</h2>
                <p className="text-sm opacity-60">Escolha uma ferramenta para potencializar seus estudos.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {[
                    { id: 'flashcards', label: 'Flashcards', icon: RefreshCw, desc: 'Memorize conceitos com cartões interativos.', color: 'blue' },
                    { id: 'quiz', label: 'Simulado', icon: HelpCircle, desc: 'Teste seus conhecimentos com questões geradas.', color: 'purple' },
                    { id: 'summary', label: 'Resumidor', icon: FileText, desc: 'Transforme tópicos complexos em guias simples.', color: 'emerald' }
                ].map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as ToolType)}
                        className={`p-6 rounded-[2rem] border text-left transition-all hover:scale-[1.02] group relative overflow-hidden
                            ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
                        `}
                    >
                        <div className={`absolute top-0 right-0 p-6 opacity-10 text-${tool.color}-500 group-hover:scale-110 transition-transform`}>
                            <tool.icon size={80} />
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-${tool.color}-500/20 text-${tool.color}-500`}>
                            <tool.icon size={24} />
                        </div>
                        <h3 className={`text-lg font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tool.label}</h3>
                        <p className="text-xs opacity-60 max-w-[200px]">{tool.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderInputScreen = () => (
        <div className="flex flex-col h-full relative">
            <button onClick={handleBack} className={`absolute top-0 left-0 p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <ChevronLeft size={24} />
            </button>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-${accentColor}-500/20 text-${accentColor}-500`}>
                    {activeTool === 'flashcards' && <RefreshCw size={32} />}
                    {activeTool === 'quiz' && <HelpCircle size={32} />}
                    {activeTool === 'summary' && <FileText size={32} />}
                </div>
                
                <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {activeTool === 'flashcards' ? 'Criar Flashcards' : activeTool === 'quiz' ? 'Gerar Simulado' : 'Resumir Tópico'}
                </h3>
                <p className="text-sm opacity-60 mb-8 max-w-xs">
                    Sobre o que você quer estudar hoje? Seja específico para melhores resultados.
                </p>

                <div className={`w-full max-w-md p-2 rounded-2xl border flex items-center gap-2 mb-4 ${isDark ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Revolução Industrial, Mitocôndrias..."
                        className={`flex-1 bg-transparent p-3 outline-none text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                        onKeyDown={(e) => e.key === 'Enter' && generateContent()}
                    />
                    <button 
                        onClick={generateContent}
                        disabled={!topic.trim() || isLoading}
                        className={`p-3 rounded-xl transition-all ${topic.trim() ? `bg-${accentColor}-500 text-white shadow-lg` : 'bg-gray-500/20 text-gray-500'}`}
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderLoading = () => (
        <div className="flex flex-col h-full items-center justify-center text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-${accentColor}-500 rounded-full blur-[100px] opacity-20 animate-pulse`} />
            
            <div className="relative z-10 flex flex-col items-center">
                <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 bg-${accentColor}-500/10 text-${accentColor}-500 border border-${accentColor}-500/20 shadow-2xl`}>
                    <Sparkles size={40} className="animate-spin-slow" /> 
                </div>
                
                <h2 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {activeTool === 'flashcards' ? 'Gerando Flashcards...' : activeTool === 'quiz' ? 'Criando Simulado...' : 'Resumindo Conteúdo...'}
                </h2>
                <p className="text-sm opacity-60 max-w-[280px] leading-relaxed">
                    A IA está analisando o tema <span className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>"{topic}"</span> para criar o melhor material de estudo.
                </p>
                
                <div className="mt-8 flex gap-1">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className={`w-2 h-2 rounded-full bg-${accentColor}-500`} />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={`w-2 h-2 rounded-full bg-${accentColor}-500`} />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={`w-2 h-2 rounded-full bg-${accentColor}-500`} />
                </div>
            </div>
        </div>
    );

    // --- RESULT VIEWS ---

    const renderFlashcards = () => {
        if (currentCardIndex >= flashcards.length) {
             return (
                <div className="flex flex-col h-full items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-green-500/20 text-green-500`}>
                        <Check size={48} strokeWidth={4} />
                    </div>
                    <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Estudo Concluído!</h2>
                    <p className="text-sm opacity-60 mb-8 max-w-xs">Você revisou {flashcards.length} cartões sobre "{topic}".</p>
                    <div className="flex gap-3">
                        <button onClick={handleBack} className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-colors ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>Voltar</button>
                        <button onClick={() => { setCurrentCardIndex(0); setIsFlipped(false); }} className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-${accentColor}-500 text-white shadow-lg`}>Revisar Novamente</button>
                    </div>
                </div>
             )
        }

        const currentCard = flashcards[currentCardIndex];

        return (
            <div className="flex flex-col h-full items-center justify-center relative w-full max-w-lg mx-auto">
                {/* Header Navigation */}
                <div className="w-full flex items-center justify-between mb-8">
                    <button onClick={handleBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                        <X size={20} className="opacity-60" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Flashcards</span>
                        <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-black'}`}>{currentCardIndex + 1}</span>
                            <span className="text-xs opacity-30 font-bold">/</span>
                            <span className="text-xs opacity-30 font-bold">{flashcards.length}</span>
                        </div>
                    </div>
                    <div className="w-9" /> {/* Spacer */}
                </div>
                
                {/* 3D Card Container */}
                <div className="w-full aspect-[4/3] perspective-1000 group cursor-pointer relative" onClick={() => setIsFlipped(!isFlipped)}>
                    <motion.div 
                        className="w-full h-full relative"
                        style={{ transformStyle: "preserve-3d" }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                        {/* Front Face */}
                        <div 
                            className={`absolute inset-0 rounded-[2.5rem] border p-8 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden
                                ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'}
                            `}
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <div className="flex-1 flex items-center justify-center">
                                <span className={`text-2xl md:text-3xl font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {currentCard.front}
                                </span>
                            </div>
                            <div className={`mt-4 text-[9px] font-bold uppercase tracking-widest py-1 px-3 rounded-full ${isDark ? 'bg-white/5 text-white/30' : 'bg-black/5 text-black/30'}`}>
                                Toque para virar
                            </div>
                        </div>

                        {/* Back Face */}
                        <div 
                            className={`absolute inset-0 rounded-[2.5rem] border p-8 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden
                                ${isDark ? `bg-${accentColor}-950/50 border-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100`}
                            `}
                            style={{ 
                                backfaceVisibility: 'hidden', 
                                transform: 'rotateY(180deg)' 
                            }}
                        >
                            <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scroll w-full">
                                <span className={`text-lg md:text-xl font-medium leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {currentCard.back}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-xs mt-8 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <motion.div 
                        className={`h-full bg-${accentColor}-500`} 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-6 mt-8 w-full justify-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(currentCardIndex > 0) { setIsFlipped(false); setTimeout(() => setCurrentCardIndex(p => p - 1), 200); } }} 
                        disabled={currentCardIndex === 0}
                        className={`p-4 rounded-2xl border transition-all ${currentCardIndex === 0 ? 'opacity-30 cursor-not-allowed' : (isDark ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-white hover:bg-gray-50 border-gray-200')}`}
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setTimeout(() => setCurrentCardIndex(p => p + 1), 200); }}
                        className={`flex-1 max-w-[140px] py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95
                            ${isDark ? 'bg-white text-black' : 'bg-black text-white'}
                        `}
                    >
                        {currentCardIndex === flashcards.length - 1 ? 'Concluir' : 'Próximo'}
                        {currentCardIndex === flashcards.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
                    </button>
                </div>
            </div>
        );
    };

    const renderQuiz = () => {
        if (showQuizResult) {
            const percentage = (quizScore / quizData.length) * 100;
            return (
                <div className="flex flex-col h-full items-center justify-center text-center">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${percentage >= 70 ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                        <span className="text-4xl font-black">{percentage}%</span>
                    </div>
                    <h3 className="text-2xl font-black mb-2">{percentage >= 70 ? 'Mandou bem!' : 'Continue estudando'}</h3>
                    <p className="text-sm opacity-60 mb-8">Você acertou {quizScore} de {quizData.length} questões.</p>
                    <button onClick={handleBack} className="px-8 py-3 rounded-xl border font-bold uppercase text-xs">Novo Estudo</button>
                </div>
            )
        }

        const question = quizData[currentQuizIndex];
        return (
            <div className="flex flex-col h-full max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={handleBack}><X size={20} className="opacity-50" /></button>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">Questão {currentQuizIndex + 1}/{quizData.length}</span>
                    <div className="w-5" />
                </div>

                <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-6 leading-relaxed ${isDark ? 'text-white' : 'text-gray-900'}`}>{question.question}</h3>
                    
                    <div className="space-y-3">
                        {question.options.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = idx === question.correctIndex;
                            const showStatus = selectedOption !== null;
                            
                            let style = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
                            if (showStatus) {
                                if (isCorrect) style = 'bg-green-500/20 border-green-500 text-green-500';
                                else if (isSelected && !isCorrect) style = 'bg-red-500/20 border-red-500 text-red-500';
                            } else if (isSelected) {
                                style = `bg-${accentColor}-500 text-white border-${accentColor}-500`;
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={showStatus}
                                    onClick={() => {
                                        setSelectedOption(idx);
                                        if(idx === question.correctIndex) setQuizScore(p => p + 1);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left font-medium text-sm transition-all ${style}`}
                                >
                                    {opt}
                                </button>
                            )
                        })}
                    </div>

                    {selectedOption !== null && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs leading-relaxed">
                            <div className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={12} /> Explicação:</div>
                            {question.explanation}
                        </motion.div>
                    )}
                </div>

                {selectedOption !== null && (
                    <button 
                        onClick={() => {
                            if (currentQuizIndex < quizData.length - 1) {
                                setCurrentQuizIndex(p => p + 1);
                                setSelectedOption(null);
                            } else {
                                setShowQuizResult(true);
                            }
                        }}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-4 ${isDark ? 'bg-white text-black' : 'bg-black text-white'} shadow-lg`}
                    >
                        {currentQuizIndex < quizData.length - 1 ? 'Próxima' : 'Finalizar'}
                    </button>
                )}
            </div>
        );
    };

    const renderSummary = () => (
        <div className="flex flex-col h-full relative">
            <div className="flex items-center justify-between mb-4 border-b border-dashed border-gray-500/20 pb-4">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowRight className="rotate-180" /></button>
                <span className="font-black uppercase tracking-widest text-xs truncate max-w-[200px]">{topic}</span>
                <div className="w-8" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll pr-2">
                <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                    <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full p-6 md:p-8">
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
                        {renderLoading()}
                    </motion.div>
                ) : !activeTool ? (
                    <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        {renderToolSelector()}
                    </motion.div>
                ) : (flashcards.length > 0 || quizData.length > 0 || summary) ? (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        {activeTool === 'flashcards' ? renderFlashcards() : activeTool === 'quiz' ? renderQuiz() : renderSummary()}
                    </motion.div>
                ) : (
                    <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
                        {renderInputScreen()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
