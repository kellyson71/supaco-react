
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CornerDownLeft, Settings, MessageCircle, FileText, BarChart2, Crown, Maximize2, Minimize2 } from 'lucide-react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { GradeInfo, ProcessedClass, SuapProfile, Holiday } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AIChatWidgetProps {
  isDarkMode: boolean;
  accentColor: string;
  userData: SuapProfile | null;
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  holidays: Holiday[];
  onRequestSettings: () => void;
  isPremium?: boolean;
  internalApiKey?: string;
  initialContext?: Message[] | null;
  pendingMessage?: string;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ 
    isDarkMode, accentColor, userData, grades, schedule, holidays, onRequestSettings, isPremium, internalApiKey, initialContext, pendingMessage 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Automatically open and populate if initialContext is provided
  useEffect(() => {
      if (initialContext && initialContext.length > 0) {
          setMessages(initialContext);
          setIsOpen(true);
      }
  }, [initialContext]);

  // Handle pending message (auto-send)
  useEffect(() => {
      if (pendingMessage && isOpen && !isLoading) {
          handleSend(pendingMessage);
      }
  }, [pendingMessage, isOpen]); // Trigger when opened via prop change

  useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
            scrollToBottom();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [isOpen, isMaximized]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const getSystemPrompt = () => {
      const validGrades = grades.filter(g => typeof g.average === 'number' || (typeof g.average === 'string' && g.average !== '-'));
      const overallAverage = validGrades.length > 0 
        ? (validGrades.reduce((acc, g) => acc + (typeof g.average === 'number' ? g.average : parseFloat(g.average as string)), 0) / validGrades.length).toFixed(1)
        : 'N/A';

      const risks = grades.filter(g => (g.limit - g.absences) <= 4).map(g => `${g.subject} (Restam ${g.limit - g.absences} aulas)`);
      
      return `
Você é o SUPACO AI, um assistente acadêmico pessoal altamente avançado para o aluno ${userData?.nome_usual || 'Estudante'}.
Responda sempre em Português do Brasil. Seja conciso, amigável e direto. Use emojis ocasionalmente.
Use formatação Markdown (negrito, listas, code blocks) para tornar as respostas legíveis.

CONTEXTO ATUAL DO ALUNO:
- Curso: ${userData?.vinculo?.curso || 'N/A'}
- Campus: ${userData?.campus || 'N/A'}
- Média Geral Calculada: ${overallAverage}
- Disciplinas Críticas (Risco de Reprovação por Faltas): ${risks.length > 0 ? risks.join(', ') : 'Nenhuma no momento.'}

FERRAMENTAS DISPONÍVEIS:
Você tem acesso a ferramentas para consultar dados em tempo real. Use-as sempre que o usuário perguntar sobre:
- Notas ou boletim (ferramenta: get_grades)
- Horários de aula ou "onde estou agora" (ferramenta: get_schedule)
- Próximos feriados (ferramenta: get_next_holiday)
`;
  };

  const toolsDefinition: FunctionDeclaration[] = [
      {
          name: 'get_grades',
          description: 'Retorna a lista completa de disciplinas, notas parciais, média final, número de faltas e limite de faltas.',
          parameters: { type: Type.OBJECT, properties: {} }
      },
      {
          name: 'get_schedule',
          description: 'Retorna o horário das aulas. Pode filtrar por dia da semana (Ex: "Segunda", "Terça"). Se não informado, retorna a semana toda.',
          parameters: {
              type: Type.OBJECT,
              properties: {
                  day: { type: Type.STRING, description: 'Dia da semana (Segunda, Terça, Quarta, Quinta, Sexta)' }
              }
          }
      },
      {
          name: 'get_next_holiday',
          description: 'Retorna o próximo feriado baseado na data de hoje.',
          parameters: { type: Type.OBJECT, properties: {} }
      }
  ];

  const executeTool = (name: string, args: any) => {
      console.log(`Executing tool: ${name}`, args);
      switch(name) {
          case 'get_grades':
              return JSON.stringify(grades);
          case 'get_schedule':
              if (args?.day) {
                  return JSON.stringify(schedule.filter(s => s.day.toLowerCase().includes(args.day.toLowerCase())));
              }
              return JSON.stringify(schedule);
          case 'get_next_holiday':
              const today = new Date();
              const future = holidays
                  .map(h => ({ ...h, dateObj: new Date(h.date + 'T00:00:00') }))
                  .filter(h => h.dateObj >= today)
                  .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
              return future.length > 0 ? JSON.stringify(future[0]) : "Nenhum feriado próximo encontrado.";
          default:
              return "Ferramenta não encontrada.";
      }
  };

  const handleSend = async (overrideText?: string) => {
    const userText = overrideText || input;
    if (!userText.trim()) return;

    let apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey && isPremium && internalApiKey && internalApiKey.trim() !== '') {
        apiKey = internalApiKey;
    }
    if (!apiKey && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
        const systemMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: "Preciso da sua Chave de API do Google Gemini para funcionar. Redirecionando para as configurações..."
        };
        setMessages(prev => [...prev, systemMsg]);
        setTimeout(() => {
            setIsOpen(false);
            onRequestSettings();
        }, 2000);
        return;
    }
    
    setInput(''); 
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    
    setIsLoading(true);
    setTimeout(() => inputRef.current?.focus(), 10);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      let promptText = userText;
      if (userText.includes("Relatório")) {
          promptText = `${userText}\n\nDados Atuais:\n${JSON.stringify(grades, null, 2)}`;
      }

      // If we have history, format it for the model
      const historyContents = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const modelParams = {
        model: 'gemini-2.5-flash',
        contents: [
            ...historyContents,
            { role: 'user', parts: [{ text: promptText }] }
        ],
        config: {
            systemInstruction: getSystemPrompt(),
            tools: [{ functionDeclarations: toolsDefinition }]
        }
      };

      const response = await ai.models.generateContent(modelParams);
      
      const functionCall = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall)?.functionCall;

      if (functionCall) {
          const toolResult = executeTool(functionCall.name, functionCall.args);
          const toolResponsePart = {
              functionResponse: {
                  name: functionCall.name,
                  response: { result: toolResult }
              }
          };

          const finalResponse = await ai.models.generateContent({
              ...modelParams,
              contents: [
                  ...historyContents,
                  { role: 'user', parts: [{ text: promptText }] },
                  { role: 'model', parts: [{ functionCall: functionCall }] },
                  { role: 'user', parts: [toolResponsePart] }
              ]
          });

          const aiMsg: Message = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: finalResponse.text || "Processei os dados, mas não consegui gerar um texto."
          };
          setMessages(prev => [...prev, aiMsg]);

      } else {
          const aiMsg: Message = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: response.text || "Não consegui processar sua resposta agora."
          };
          setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      console.error(error);
      let text = "Erro de conexão ou configuração.";
      const errMsg = error.message || '';
      if (errMsg.includes('403') || errMsg.toLowerCase().includes('leaked')) {
          text = "A chave de API foi bloqueada por segurança. Verifique nas configurações.";
      } else if (errMsg.includes('400') || errMsg.includes('API key')) {
          text = "Sua chave de API parece inválida. Verifique nas configurações.";
      }
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReportRequest = () => {
      handleSend("Gere um Relatório de Desempenho acadêmico detalhado e estratégico. Analise minhas notas, faltas e identifique onde estou indo bem e onde preciso focar.");
  };

  const toggleMaximize = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMaximized(!isMaximized);
  };

  const glassClass = isDarkMode 
    ? 'bg-slate-900/95 border-white/10 shadow-2xl shadow-black/80' 
    : `bg-white/95 border-white/20 shadow-2xl shadow-${accentColor}-500/20`;

  const width = isOpen ? (isMobile || isMaximized ? '100vw' : 500) : (isMobile ? 48 : 140);
  const height = isOpen ? (isMobile || isMaximized ? '100dvh' : 550) : (isMobile ? 48 : 42);
  const borderRadius = isOpen ? (isMobile || isMaximized ? 0 : 32) : 99;

  return (
    <>
      {isOpen && !isMaximized && <div className="fixed inset-0 z-[240] bg-black/30 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />}

      <motion.div
        layout
        initial={false}
        animate={{ width, height, borderRadius }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className={`overflow-hidden flex flex-col z-[1000]
          ${isOpen && (isMobile || isMaximized) ? 'fixed inset-0 m-0' : 'relative'} 
          ${glassClass}
          ${!isOpen && isMobile ? 'rounded-full' : 'backdrop-blur-xl border'}
        `}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div 
              key="chat-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col h-full relative"
            >
              <div className={`flex items-center justify-between px-5 py-3 shrink-0 border-b ${isDarkMode ? 'border-white/5' : 'border-black/5'} pt-safe-area-top`}>
                  <div className="flex items-center gap-2">
                      <MonochromeIcon accentColor={accentColor} />
                      <span className={`text-xs font-bold tracking-wider uppercase ${isDarkMode ? 'text-white/90' : `text-${accentColor}-900/80`}`}>
                          Assistente
                      </span>
                      {isPremium && (
                        <div className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border border-amber-500/30">
                            <Crown size={8} fill="currentColor" /> Premium
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-1">
                      {!isMobile && (
                          <button
                              onClick={toggleMaximize}
                              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'}`}
                              title={isMaximized ? "Restaurar" : "Maximizar"}
                          >
                              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                          </button>
                      )}
                      <button 
                          onClick={(e) => { e.stopPropagation(); setIsOpen(false); onRequestSettings(); }}
                          className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'}`}
                          title="Configurações"
                      >
                          <Settings size={18} />
                      </button>
                      <button 
                          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                          className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/50' : 'hover:bg-black/5 text-black/50'}`}
                      >
                          <X size={20} />
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scroll">
                {messages.length === 0 && (
                     <div className="w-full mb-4">
                         <button onClick={handleReportRequest} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors text-left group ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                             <div className={`p-2 rounded-lg ${isDarkMode ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                                 <BarChart2 size={18} />
                             </div>
                             <div>
                                 <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5">Sugestão</div>
                                 <div className="text-sm font-bold">Analisar meu Semestre (Relatório)</div>
                             </div>
                         </button>
                     </div>
                )}

                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 gap-3 select-none py-10">
                      <MonochromeIcon size={32} pulse accentColor={accentColor} />
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-black'}`}>Como posso ajudar?</p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                       <div className="mt-1 shrink-0 opacity-80"><MonochromeIcon size={16} accentColor={accentColor} /></div>
                    )}
                    <div className={`max-w-[85%] py-2 px-3.5 rounded-2xl text-sm leading-relaxed border overflow-x-hidden ${msg.role === 'user' ? (isDarkMode ? `bg-${accentColor}-500/20 border-${accentColor}-500/30 text-white rounded-tr-sm` : `bg-${accentColor}-500 text-white border-${accentColor}-600 rounded-tr-sm`) : (isDarkMode ? 'bg-white/10 text-white rounded-tl-sm border-white/5' : 'bg-white/60 text-gray-800 rounded-tl-sm border-white/40 shadow-sm')}`}>
                       <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, strong: ({node, ...props}) => <strong className="font-black" {...props} />, code: ({node, ...props}) => <code className="bg-black/20 rounded px-1 text-xs font-mono break-all whitespace-pre-wrap" {...props} />, a: ({node, ...props}) => <a className="underline decoration-white/50 hover:decoration-white" target="_blank" rel="noopener noreferrer" {...props} /> }}>
                          {msg.text}
                       </ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <div className="flex items-center gap-2 ml-8">
                     <div className="flex space-x-1">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className={`w-1 h-1 rounded-full bg-${accentColor}-400`} />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={`w-1 h-1 rounded-full bg-${accentColor}-400`} />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={`w-1 h-1 rounded-full bg-${accentColor}-400`} />
                     </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 pt-0 pb-8 md:pb-4 mb-14 md:mb-0">
                  <div className={`flex items-center gap-2 rounded-2xl p-1 pl-4 border transition-colors ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/20'}`}>
                      <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Pergunte sobre notas, horários..." className={`flex-1 bg-transparent outline-none text-sm font-medium placeholder:font-medium ${isDarkMode ? 'text-white placeholder:text-white/20' : 'text-gray-800 placeholder:text-gray-500/40'}`} />
                      <button onClick={() => handleSend()} disabled={!input.trim()} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30 hover:scale-105` : 'bg-transparent text-gray-400 opacity-50'}`}>
                           <CornerDownLeft size={20} />
                      </button>
                  </div>
              </div>
            </motion.div>
          ) : (
            <motion.button 
              key="idle-capsule"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setIsOpen(true)}
              className={`absolute inset-0 flex items-center justify-center gap-2.5 w-full h-full group cursor-pointer hover:bg-white/5 transition-colors ${isMobile ? 'rounded-full' : ''}`}
            >
                <MonochromeIcon size={isMobile ? 24 : 18} accentColor={accentColor} />
                {!isMobile && (
                    <span className={`text-xs font-bold tracking-wider uppercase ${isDarkMode ? 'text-white/80' : `text-gray-600 group-hover:text-${accentColor}-600`}`}>AI Chat</span>
                )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

const MonochromeIcon: React.FC<{ size?: number, pulse?: boolean, accentColor: string }> = ({ size = 18, pulse, accentColor }) => {
    return (
        <div className={`relative flex items-center justify-center text-${accentColor}-500`}>
            <Sparkles size={size} strokeWidth={2.5} className={pulse ? 'animate-pulse' : ''} />
            {pulse && <div className={`absolute inset-0 bg-${accentColor}-500 rounded-full opacity-20 blur-md animate-ping`} />}
        </div>
    )
}
