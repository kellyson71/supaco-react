
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Sparkles, Brain, ArrowRight, X, ChevronLeft, Check, Lightbulb, Zap, Layers, Trophy, GraduationCap, AlertCircle, Loader2, Copy, MessageSquare, Edit3, History, Trash2, Clock, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { SecureStorage } from '../../services/SecureStorage';
import { AIHistoryItem, AIHistoryType } from '../../types';

interface AIStudioModalProps {
  isDark: boolean;
  accentColor: string;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
  apiKey?: string;
}

type ToolType = 'flashcards' | 'quiz' | 'summary' | 'history' | 'view_summary';

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

// --- DINO RUNNER GAME (Canvas Implementation) ---
const DinoGameLoader = ({ isDark, accentColor, onScoreUpdate }: { isDark: boolean, accentColor: string, onScoreUpdate: (score: number) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const scoreRef = useRef(0);
    const speedRef = useRef(5);
    
    // Game State Refs (to avoid closures in animation loop)
    const gameState = useRef({
        dinoY: 0,
        dinoVy: 0,
        isJumping: false,
        isDucking: false,
        obstacles: [] as { x: number, type: 'ground' | 'air', w: number, h: number }[],
        frameCount: 0
    });

    // Constants
    const GRAVITY = 0.6;
    const JUMP_FORCE = -12;
    const GROUND_HEIGHT = 40;
    
    // Assets (Emojis)
    const PLAYER_SPRITE = "🏃";
    const OBSTACLE_GROUND = "📚";
    const OBSTACLE_AIR = "🎓";

    const jump = useCallback(() => {
        if (!gameState.current.isJumping) {
            gameState.current.dinoVy = JUMP_FORCE;
            gameState.current.isJumping = true;
        }
    }, []);

    const duck = useCallback((isDown: boolean) => {
        gameState.current.isDucking = isDown;
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                jump();
            }
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                duck(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'ArrowDown') duck(false);
        };
        const handleTouchStart = (e: TouchEvent) => {
            // Simple tap to jump, hold bottom screen logic could be added but keep it simple
            jump();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('touchstart', handleTouchStart);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('touchstart', handleTouchStart);
        };
    }, [jump, duck]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Init
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            gameState.current.dinoY = canvas.height - GROUND_HEIGHT;
        };
        resize();
        window.addEventListener('resize', resize);

        const spawnObstacle = () => {
            const type = Math.random() > 0.7 ? 'air' : 'ground';
            gameState.current.obstacles.push({
                x: canvas.width,
                type,
                w: 30,
                h: 30
            });
        };

        const update = () => {
            gameState.current.frameCount++;
            scoreRef.current++;
            
            // Speed up slightly
            if (gameState.current.frameCount % 600 === 0) speedRef.current += 0.5;

            // Spawn
            if (gameState.current.frameCount % 100 === 0) { // Approx every 1.5s
                if (Math.random() > 0.3) spawnObstacle();
            }

            // Player Physics
            if (gameState.current.isJumping) {
                gameState.current.dinoY += gameState.current.dinoVy;
                gameState.current.dinoVy += GRAVITY;
                
                // Land
                if (gameState.current.dinoY > canvas.height - GROUND_HEIGHT) {
                    gameState.current.dinoY = canvas.height - GROUND_HEIGHT;
                    gameState.current.isJumping = false;
                    gameState.current.dinoVy = 0;
                }
            } else {
                gameState.current.dinoY = canvas.height - GROUND_HEIGHT;
            }

            // Obstacles
            for (let i = gameState.current.obstacles.length - 1; i >= 0; i--) {
                const obs = gameState.current.obstacles[i];
                obs.x -= speedRef.current;
                
                // Remove offscreen
                if (obs.x < -50) {
                    gameState.current.obstacles.splice(i, 1);
                    continue;
                }

                // Collision Detection
                const playerW = 30;
                const playerH = gameState.current.isDucking ? 20 : 40; // Ducking reduces height
                const playerX = 50;
                const playerY = gameState.current.dinoY - (gameState.current.isDucking ? -10 : 10); // Adjust Y visual center

                const obsW = 25;
                const obsH = 25;
                const obsX = obs.x;
                const obsY = obs.type === 'air' 
                    ? canvas.height - GROUND_HEIGHT - 35 // Flying height
                    : canvas.height - GROUND_HEIGHT; // Ground height

                // Simple Box Collision
                if (
                    playerX < obsX + obsW &&
                    playerX + playerW > obsX &&
                    playerY - playerH < obsY && // Top of player vs Bottom of obstacle (coord system inverted Y)
                    playerY > obsY - obsH
                ) {
                    // Collision! Reset score, keep running (it's a loader, don't frustrate)
                    scoreRef.current = Math.max(0, scoreRef.current - 100);
                    gameState.current.obstacles.splice(i, 1); // Remove hit obstacle
                    // Visual feedback could be added here
                }
            }

            // Sync Score
            if (gameState.current.frameCount % 10 === 0) {
                onScoreUpdate(Math.floor(scoreRef.current / 5)); // Normalize score
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Ground Line
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - 20);
            ctx.lineTo(canvas.width, canvas.height - 20);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw Player
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            const pY = gameState.current.dinoY;
            const sprite = gameState.current.isDucking ? "🧘" : PLAYER_SPRITE;
            ctx.fillText(sprite, 65, pY + 5);

            // Draw Obstacles
            gameState.current.obstacles.forEach(obs => {
                const oY = obs.type === 'air' ? canvas.height - GROUND_HEIGHT - 25 : canvas.height - GROUND_HEIGHT;
                const sprite = obs.type === 'air' ? OBSTACLE_AIR : OBSTACLE_GROUND;
                ctx.fillText(sprite, obs.x + 15, oY + 5);
            });

            // Draw Score
            ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
            ctx.font = "bold 14px monospace";
            ctx.textAlign = "right";
            ctx.fillText(`SCORE: ${Math.floor(scoreRef.current / 5).toString().padStart(5, '0')}`, canvas.width - 20, 30);
        };

        const loop = () => {
            update();
            draw();
            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isDark, onScoreUpdate]);

    return (
        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            <div className="absolute top-10 text-center space-y-2 pointer-events-none opacity-60">
                <h3 className={`text-xl font-black uppercase tracking-tight animate-pulse ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Gerando Conteúdo...
                </h3>
                <p className="text-[10px] font-mono">Enquanto isso, treine seus reflexos!</p>
            </div>
            
            <canvas ref={canvasRef} className="w-full h-full block" />

            <div className="absolute bottom-10 text-[10px] font-bold uppercase tracking-widest opacity-40">
                Toque ou Espaço para Pular • Baixo para Abaixar
            </div>
        </div>
    );
};

export const AIStudioModal: React.FC<AIStudioModalProps> = ({ isDark, accentColor, isPremium, onOpenPremiumModal, apiKey }) => {
    const [activeTool, setActiveTool] = useState<ToolType | null>(null);
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Result States
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
    const [summary, setSummary] = useState('');
    
    // Game & Notification State
    const [lastGameScore, setLastGameScore] = useState(0);
    const [showScoreToast, setShowScoreToast] = useState(false);
    
    // Interactive States
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [flashcardStats, setFlashcardStats] = useState<{ known: number, unknown: number }>({ known: 0, unknown: 0 });
    const [showFlashcardResult, setShowFlashcardResult] = useState(false);

    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [quizScore, setQuizScore] = useState(0);
    const [showQuizResult, setShowQuizResult] = useState(false);

    // History State
    const [historyItems, setHistoryItems] = useState<AIHistoryItem[]>([]);
    const [historyFilter, setHistoryFilter] = useState<AIHistoryType | 'all'>('all');

    useEffect(() => {
        const mat = localStorage.getItem('suap_username');
        if (mat && activeTool === 'history') {
            SecureStorage.fetchHistory(mat).then(setHistoryItems);
        }
    }, [activeTool]);

    // Reset Logic
    const resetState = () => {
        setFlashcards([]);
        setQuizData([]);
        setSummary('');
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setFlashcardStats({ known: 0, unknown: 0 });
        setShowFlashcardResult(false);
        setCurrentQuizIndex(0);
        setSelectedOption(null);
        setQuizScore(0);
        setShowQuizResult(false);
        setLastGameScore(0);
    };

    const handleBack = () => {
        if ((flashcards.length > 0 || quizData.length > 0 || summary) && !isLoading) {
             resetState();
             if (activeTool === 'view_summary') {
                 setActiveTool('history');
             } else {
                 setActiveTool(null);
             }
        } else {
             setActiveTool(null);
             resetState();
        }
    };

    const saveToHistory = (type: AIHistoryType, title: string, content: any) => {
        const mat = localStorage.getItem('suap_username');
        if (mat) {
            SecureStorage.addHistoryItem(mat, type, title, content);
        }
    };

    const restoreFromHistory = (item: AIHistoryItem) => {
        resetState();
        if (item.type === 'flashcards') {
            setFlashcards(item.content);
            setActiveTool('flashcards');
        } else if (item.type === 'quiz') {
            setQuizData(item.content);
            setActiveTool('quiz');
        } else if (item.type === 'summary') {
            setSummary(item.content);
            setActiveTool('summary');
        } else if (item.type === 'classroom_solver') {
             const text = `## Solução\n${item.content.core}\n\n## Explicação\n${item.content.explanation}`;
             setSummary(text);
             setActiveTool('view_summary'); 
        } else if (item.type === 'chat') {
            const transcript = item.content.map((m: any) => `**${m.role === 'user' ? 'Você' : 'Supaco AI'}**: ${m.text}`).join('\n\n---\n\n');
            setSummary(transcript);
            setActiveTool('view_summary');
        }
    };

    const deleteHistory = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const mat = localStorage.getItem('suap_username');
        if (mat) {
            SecureStorage.deleteHistoryItem(mat, id);
            setHistoryItems(prev => prev.filter(h => h.id !== id));
        }
    };

    const generateContent = async () => {
        if (!topic.trim() || !apiKey) return;
        setIsLoading(true);
        resetState(); 

        try {
            const ai = new GoogleGenAI({ apiKey });
            let prompt = '';
            let schema = null;

            if (activeTool === 'flashcards') {
                prompt = `Gere 8 flashcards de estudo sobre: "${topic}". Resposta JSON estrito. Front: Pergunta curta. Back: Resposta clara.`;
                schema = {
                    type: "ARRAY",
                    items: { type: "OBJECT", properties: { front: { type: "STRING" }, back: { type: "STRING" } } }
                };
            } else if (activeTool === 'quiz') {
                prompt = `Gere 5 perguntas de múltipla escolha sobre: "${topic}". JSON estrito. explanation deve explicar porque a correta é a correta.`;
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
                prompt = `Resumo Markdown sobre "${topic}". Tópicos, negrito e emojis.`;
            }

            // Simulate slight delay to enjoy the game if response is too fast (optional, but good for UX here)
            const minTime = new Promise(resolve => setTimeout(resolve, 2000));
            
            const [response] = await Promise.all([
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: activeTool === 'summary' ? 'text/plain' : 'application/json',
                        responseSchema: schema as any
                    }
                }),
                minTime
            ]);

            if (activeTool === 'summary') {
                const text = response.text || "Erro ao gerar.";
                setSummary(text);
                saveToHistory('summary', topic, text);
            } else {
                const json = JSON.parse(response.text || '[]');
                if (activeTool === 'flashcards') {
                    setFlashcards(json);
                    saveToHistory('flashcards', topic, json);
                }
                if (activeTool === 'quiz') {
                    setQuizData(json);
                    saveToHistory('quiz', topic, json);
                }
            }

        } catch (e) {
            console.error("AI Error", e);
        } finally {
            setIsLoading(false);
            // Trigger game saved toast
            setShowScoreToast(true);
            setTimeout(() => setShowScoreToast(false), 4000);
        }
    };

    const handleFlashcardResult = (result: 'known' | 'unknown') => {
        setFlashcardStats(prev => ({ ...prev, [result]: prev[result] + 1 }));
        if (isFlipped) {
            setIsFlipped(false);
            setTimeout(() => advanceCard(), 300);
        } else {
            advanceCard();
        }
    };

    const advanceCard = () => {
        if (currentCardIndex < flashcards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setShowFlashcardResult(true);
        }
    };

    // --- ANIMATION VARIANTS ---
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 relative overflow-hidden">
                <div className={`w-32 h-32 rounded-[2.5rem] bg-${accentColor}-500/10 flex items-center justify-center mb-6`}>
                    <Brain size={48} className={`text-${accentColor}-500`} />
                </div>
                <h2 className={`text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Supaco Brain</h2>
                <p className="text-sm opacity-60 max-w-sm mx-auto mb-8 font-medium">Flashcards e Simulados gerados por IA.</p>
                <button onClick={onOpenPremiumModal} className={`px-8 py-4 rounded-xl bg-${accentColor}-500 text-white font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform`}>
                    Desbloquear
                </button>
            </div>
        );
    }

    // --- HISTORY RENDERER ---
    const filteredHistory = historyItems.filter(item => historyFilter === 'all' || item.type === historyFilter);

    const renderHistory = () => (
        <div className="flex flex-col h-full relative">
            <div className="flex flex-col p-6 pb-2 shrink-0 gap-4">
                <div className="flex items-center justify-between">
                    <button onClick={handleBack} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                        <ChevronLeft size={24} />
                    </button>
                    <span className="text-sm font-black uppercase tracking-widest">Histórico Completo</span>
                    <div className="w-10" />
                </div>
                
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {[
                        { id: 'all', label: 'Tudo' },
                        { id: 'flashcards', label: 'Flashcards' },
                        { id: 'quiz', label: 'Simulados' },
                        { id: 'summary', label: 'Resumos' },
                        { id: 'classroom_solver', label: 'Classroom' },
                        { id: 'chat', label: 'Chats' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setHistoryFilter(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors
                                ${historyFilter === tab.id 
                                    ? `bg-${accentColor}-500 text-white` 
                                    : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll p-6 pt-0 space-y-3">
                {filteredHistory.length === 0 ? (
                    <div className="text-center opacity-40 mt-20">
                        <History size={48} className="mx-auto mb-4" />
                        <p>Nenhum item encontrado.</p>
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => restoreFromHistory(item)}
                            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] group
                                ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
                            `}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {item.type === 'flashcards' && <Layers size={20} />}
                                {item.type === 'quiz' && <GraduationCap size={20} />}
                                {item.type === 'summary' && <Lightbulb size={20} />}
                                {item.type === 'classroom_solver' && <Zap size={20} />}
                                {item.type === 'chat' && <MessageSquare size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] opacity-50 mt-1">
                                    <Clock size={10} />
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => deleteHistory(e, item.id)}
                                className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    // --- TOOL SELECTOR ---
    const renderToolSelector = () => (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col h-full p-2 md:p-6 overflow-y-auto custom-scroll relative z-10"
        >
            <motion.div variants={itemVariants} className="flex justify-between items-start mb-12 mt-4 px-2">
                <div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 border ${isDark ? `bg-${accentColor}-500/10 border-${accentColor}-500/20 text-${accentColor}-300` : `bg-${accentColor}-50 border-${accentColor}-100 text-${accentColor}-600`}`}>
                        <Sparkles size={12} fill="currentColor" /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest">Estúdio de Criação</span>
                    </div>
                    <h2 className={`text-4xl md:text-6xl font-black tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Supaco <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${accentColor}-400 to-${accentColor}-600`}>Brain</span>
                    </h2>
                    <p className={`text-sm md:text-base font-medium mt-4 max-w-md leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Ferramentas de inteligência artificial para potencializar seus estudos. Crie, revise e aprenda mais rápido.
                    </p>
                </div>
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTool('history')}
                    className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' : 'bg-white border-gray-100 hover:shadow-xl'}`}
                    title="Histórico Completo"
                >
                    <History size={24} className={isDark ? 'text-white' : 'text-gray-700'} />
                </motion.button>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 pb-10">
                {[
                    { id: 'flashcards', label: 'Flashcards', icon: Layers, desc: 'Memorização ativa com repetição espaçada.', color: 'blue' },
                    { id: 'quiz', label: 'Simulado', icon: GraduationCap, desc: 'Teste seus conhecimentos com questões geradas.', color: 'emerald' },
                    { id: 'summary', label: 'Resumo', icon: Lightbulb, desc: 'Explicações claras e concisas sobre qualquer tema.', color: 'amber' }
                ].map((tool) => (
                    <motion.button
                        key={tool.id}
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTool(tool.id as ToolType)}
                        className={`group relative p-8 rounded-[2.5rem] text-left transition-all duration-300 border overflow-hidden
                            ${isDark 
                                ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                                : 'bg-white border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50'}
                        `}
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${tool.color}-500/10 rounded-bl-[100px] transition-transform group-hover:scale-150 duration-500`} />

                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-12 relative z-10 transition-transform group-hover:scale-110 duration-300 ${isDark ? `bg-${tool.color}-500/20 text-${tool.color}-400` : `bg-${tool.color}-50 text-${tool.color}-600`}`}>
                            <tool.icon size={32} />
                        </div>
                        <div className="relative z-10">
                            <h3 className={`text-2xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{tool.label}</h3>
                            <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tool.desc}</p>
                        </div>
                        
                        <div className={`absolute bottom-8 right-8 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-300 ${isDark ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            <ArrowRight size={20} />
                        </div>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );

    // --- INPUT SCREEN ---
    const renderInputScreen = () => (
        <div className="flex flex-col h-full relative p-6 md:p-10 justify-center">
            <button onClick={handleBack} className={`absolute top-8 left-8 p-3 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-gray-100 text-black/50 hover:text-black'}`}>
                <ChevronLeft size={24} />
            </button>
            
            <div className="max-w-xl mx-auto w-full">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
                    <div className={`inline-flex items-center justify-center p-3 rounded-2xl mb-6 shadow-sm ${isDark ? `bg-${accentColor}-500/10 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`}`}>
                        {activeTool === 'flashcards' && <Layers size={24} />}
                        {activeTool === 'quiz' && <GraduationCap size={24} />}
                        {activeTool === 'summary' && <Lightbulb size={24} />}
                    </div>
                    <h3 className={`text-3xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {activeTool === 'flashcards' ? 'Criar Deck' : activeTool === 'quiz' ? 'Gerar Simulado' : 'Resumir Tópico'}
                    </h3>
                    <p className="text-sm opacity-50 font-medium">Digite o tema ou cole um texto base.</p>
                </motion.div>

                <div className={`relative transition-all duration-300 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/5 focus-within:bg-black/40 focus-within:border-white/20' : 'bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-gray-300'} shadow-inner`}>
                    <div className={`absolute top-1/2 left-6 -translate-y-1/2 transition-colors ${isDark ? 'text-white/20' : 'text-black/20'}`}>
                        <Edit3 size={24} />
                    </div>
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Revolução Francesa, Leis de Newton..."
                        className={`w-full bg-transparent p-8 pl-16 pr-16 text-left text-xl font-bold outline-none placeholder:opacity-40 transition-colors ${isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
                        onKeyDown={(e) => e.key === 'Enter' && generateContent()}
                        autoFocus
                    />
                    {topic && (
                        <button onClick={() => setTopic('')} className={`absolute top-1/2 right-6 -translate-y-1/2 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/10 text-black/50 hover:text-black'}`}>
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="mt-12 flex justify-center">
                    <button 
                        onClick={generateContent}
                        disabled={!topic.trim() || isLoading}
                        className={`group relative px-8 py-4 rounded-2xl flex items-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                            ${topic.trim() 
                                ? `bg-${accentColor}-500 text-white shadow-lg hover:shadow-${accentColor}-500/25 hover:-translate-y-1` 
                                : `bg-gray-100 dark:bg-white/5 text-gray-400`}
                        `}
                    >
                        <span className="font-bold text-sm uppercase tracking-widest">Gerar Conteúdo</span>
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );

    // --- FLASHCARDS RENDERER ---
    const renderFlashcards = () => {
        if (showFlashcardResult) {
             const mastery = Math.round((flashcardStats.known / flashcards.length) * 100);
             return (
                <div className="flex flex-col h-full items-center justify-center text-center p-8 animate-in zoom-in duration-300">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-${accentColor}-500/10 text-${accentColor}-500`}>
                        <Trophy size={48} />
                    </div>
                    <h2 className={`text-5xl font-black mb-2 tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{mastery}%</h2>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-50 mb-12">Domínio do Conteúdo</p>
                    <div className="flex gap-4">
                        <button onClick={handleBack} className={`px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest border transition-colors ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>Sair</button>
                        <button onClick={resetState} className={`px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-${accentColor}-500 text-white hover:opacity-90 shadow-lg`}>Reiniciar</button>
                    </div>
                </div>
             )
        }

        return (
            <div className="flex flex-col h-full items-center w-full max-w-3xl mx-auto p-6 pt-8">
                <div className="w-full flex items-center justify-between mb-8">
                    <button onClick={handleBack} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={20} className="opacity-50" /></button>
                    <div className="flex gap-1.5">
                        {flashcards.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentCardIndex ? `bg-${accentColor}-500 w-8` : `w-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}`} />
                        ))}
                    </div>
                    <div className="w-8" /> 
                </div>
                
                <div className="w-full flex-1 relative perspective-1000 mb-8">
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div 
                            key={currentCardIndex}
                            initial={{ x: 300, opacity: 0, rotate: 10 }}
                            animate={{ x: 0, opacity: 1, rotate: 0 }}
                            exit={{ x: -300, opacity: 0, rotate: -10 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            className="w-full h-full absolute inset-0 cursor-pointer"
                            onClick={() => setIsFlipped(!isFlipped)}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <motion.div 
                                className="w-full h-full relative"
                                style={{ transformStyle: 'preserve-3d' }}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.4, type: 'tween', ease: 'easeInOut' }}
                            >
                                {/* Front (Question) */}
                                <div 
                                    className={`absolute inset-0 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl border ${isDark ? `bg-[#121212] border-white/10` : `bg-white border-gray-100`}`}
                                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-${accentColor}-500/10 text-${accentColor}-500`}>
                                        <Brain size={24} />
                                    </div>
                                    <span className={`text-2xl md:text-4xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {flashcards[currentCardIndex].front}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-8 absolute bottom-10">Toque para virar</span>
                                </div>

                                {/* Back (Answer) */}
                                <div 
                                    className={`absolute inset-0 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl border ${isDark ? `bg-${accentColor}-900/10 border-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100`}`}
                                    style={{ 
                                        backfaceVisibility: 'hidden', 
                                        WebkitBackfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)' 
                                    }}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-${accentColor}-500`}>Resposta</span>
                                    <span className={`text-xl md:text-3xl font-medium leading-relaxed ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        {flashcards[currentCardIndex].back}
                                    </span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex gap-4 w-full max-w-md">
                    <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult('unknown'); }} className={`flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        <X size={18} className="mx-auto mb-1" />
                        Não lembrei
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleFlashcardResult('known'); }} className={`flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        <Check size={18} className="mx-auto mb-1" />
                        Acertei
                    </button>
                </div>
            </div>
        );
    };

    // --- QUIZ RENDERER ---
    const renderQuiz = () => {
        if (showQuizResult) {
            const percentage = (quizScore / quizData.length) * 100;
            return (
                <div className="flex flex-col h-full items-center justify-center text-center p-8 animate-in zoom-in duration-300">
                    <div className="mb-8 relative">
                        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#333' : '#eee'} strokeWidth="6" />
                            <motion.circle 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: percentage / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                cx="50" cy="50" r="45" fill="none" stroke={`var(--color-${accentColor}-500)`} strokeWidth="6" strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black">{quizScore}/{quizData.length}</span>
                            <span className="text-[10px] font-bold uppercase opacity-50 mt-1">Acertos</span>
                        </div>
                    </div>
                    <button onClick={handleBack} className={`px-10 py-4 rounded-xl bg-${accentColor}-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-transform`}>Concluir</button>
                </div>
            )
        }

        const question = quizData[currentQuizIndex];
        const isSubmitted = selectedOption !== null;

        return (
            <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-6 pt-8 relative">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={handleBack} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={20} className="opacity-50" /></button>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-50">Questão {currentQuizIndex + 1}/{quizData.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll pb-24">
                    <h3 className={`text-2xl md:text-3xl font-black leading-tight mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>{question.question}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options.map((opt, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = idx === question.correctIndex;
                            const letter = String.fromCharCode(65 + idx);
                            
                            let btnStyle = isDark 
                                ? 'bg-white/5 border-transparent text-gray-300 hover:bg-white/10' 
                                : 'bg-white border-gray-100 text-gray-700 shadow-sm hover:border-gray-300';
                            
                            if (isSubmitted) {
                                if (isCorrect) btnStyle = 'bg-green-500/20 text-green-500 border-green-500/50';
                                else if (isSelected && !isCorrect) btnStyle = 'bg-red-500/20 text-red-500 border-red-500/50';
                                else btnStyle = 'opacity-40 grayscale';
                            } else if (isSelected) {
                                btnStyle = `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/20`;
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={isSubmitted}
                                    onClick={() => {
                                        setSelectedOption(idx);
                                        if (idx === question.correctIndex) setQuizScore(p => p + 1);
                                    }}
                                    className={`w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all duration-300 flex items-start gap-3 group active:scale-[0.98] ${btnStyle}`}
                                >
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black shrink-0 ${isSubmitted ? 'opacity-50' : (isDark ? 'bg-white/10 text-white/60' : 'bg-black/5 text-black/50')}`}>
                                        {letter}
                                    </span>
                                    <span className="flex-1 pt-0.5">{opt}</span>
                                    <div className="shrink-0 pt-0.5">
                                        {isSubmitted && isCorrect && <Check size={16} />}
                                        {isSubmitted && isSelected && !isCorrect && <X size={16} />}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <AnimatePresence>
                        {isSubmitted && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20, height: 0 }} 
                                animate={{ opacity: 1, y: 0, height: 'auto' }} 
                                className={`mt-6 p-6 rounded-3xl border flex gap-4 overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <div className="p-2 h-fit rounded-xl bg-yellow-500/20 text-yellow-500 shrink-0">
                                    <Lightbulb size={20} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Explicação</div>
                                    <p className="text-sm leading-relaxed opacity-90">{question.explanation}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t ${isDark ? 'from-black via-black/90' : 'from-white via-white/90'} to-transparent z-20`}>
                    {isSubmitted && (
                        <button 
                            onClick={() => {
                                if (currentQuizIndex < quizData.length - 1) {
                                    setCurrentQuizIndex(p => p + 1);
                                    setSelectedOption(null);
                                } else {
                                    setShowQuizResult(true);
                                }
                            }}
                            className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs bg-${accentColor}-500 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}
                        >
                            {currentQuizIndex < quizData.length - 1 ? 'Próxima Questão' : 'Ver Resultado'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSummary = () => (
        <div className="flex flex-col h-full relative p-6 md:p-10 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8 shrink-0">
                <button onClick={handleBack} className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}><ChevronLeft size={20} /></button>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>Visualizador Inteligente</div>
                <button onClick={() => navigator.clipboard.writeText(summary)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><Copy size={20} className="opacity-50 hover:opacity-100" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll pr-2 pb-10">
                {activeTool !== 'view_summary' && <h1 className={`text-3xl md:text-4xl font-black mb-8 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{topic}</h1>}
                <div className={`prose prose-lg max-w-none ${isDark ? 'prose-invert prose-p:text-gray-300 prose-headings:text-white prose-li:text-gray-300' : 'prose-stone prose-headings:text-gray-900'}`}>
                    <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`h-full overflow-hidden relative`}>
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-${accentColor}-500/10 rounded-full blur-[120px]`} />
                <div className={`absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]`} />
            </div>

            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                        <DinoGameLoader isDark={isDark} accentColor={accentColor} onScoreUpdate={setLastGameScore} />
                    </motion.div>
                )}
                
                {!activeTool ? (
                    <motion.div key="selector" className="h-full">
                        {renderToolSelector()}
                    </motion.div>
                ) : activeTool === 'history' ? (
                    <motion.div key="history" className="h-full">
                        {renderHistory()}
                    </motion.div>
                ) : (flashcards.length > 0 || quizData.length > 0 || summary) ? (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        {activeTool === 'flashcards' ? renderFlashcards() : activeTool === 'quiz' ? renderQuiz() : renderSummary()}
                    </motion.div>
                ) : (
                    <motion.div key="input" className="h-full">
                        {renderInputScreen()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Score Toast */}
            <AnimatePresence>
                {showScoreToast && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-full flex items-center gap-3 shadow-xl backdrop-blur-md border ${isDark ? 'bg-black/80 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900'}`}
                    >
                        <div className={`p-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                            <Save size={14} />
                        </div>
                        <span className="text-xs font-bold">Jogo salvo — pontuação final: {lastGameScore}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
