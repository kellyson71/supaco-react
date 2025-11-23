
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle, Clock, MapPin, Award, Briefcase, User, Calendar, GraduationCap, Settings, Monitor, Moon, Sun, ToggleLeft, ToggleRight, Link2, ExternalLink, Cpu, ShieldCheck, Eye, EyeOff, Key, Image as ImageIcon, Check, BookOpen, Palette, RefreshCw, Mail, Fingerprint, FileText, UserSquare2, Percent, Calculator, Flag, Target, CheckSquare, LogOut, ArrowRight, Copy, Clipboard, HelpCircle, Book, CalendarClock, ChevronRight, MoreHorizontal, Save, Download, Droplet, Coffee, Aperture, BookMarked, Users, Rocket, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ViewState, GradeInfo, ThemeVariant, SuapProfile, SuapMeusDadosAluno, ProcessedClass, SuapCompletionData, CompletionCategory, ClassroomCourse, ClassroomWork } from '../types';

interface OverlayViewProps {
  view: ViewState;
  onClose: () => void;
  onChangeView: (view: ViewState) => void;
  isDarkMode: boolean;
  onToggleTheme?: () => void;
  currentWallpaper?: string;
  onWallpaperChange?: (url: string) => void;
  themeVariant: ThemeVariant;
  onThemeVariantChange: (variant: ThemeVariant) => void;
  primaryColor: string;
  secondaryColor: string;
  userData: SuapProfile | null;
  academicData?: SuapMeusDadosAluno | null;
  grades: GradeInfo[];
  schedule: ProcessedClass[];
  completionData?: SuapCompletionData | null;
  onLogout: () => void;
  autoExpandClassroom: boolean;
  onAutoExpandClassroom: (v: boolean) => void;
  initialProfileTab?: 'profile' | 'settings' | 'wallpaper';
  onInstallPwa?: () => void;
  canInstall?: boolean;
}

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg"
];

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

const GOOGLE_CLIENT_ID = "493737247808-0rv9jbldtskqdg78l122foess6h1t7ll.apps.googleusercontent.com";

export const ContentView: React.FC<OverlayViewProps> = ({ view, onClose, onChangeView, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, grades, schedule, completionData, onLogout, autoExpandClassroom, onAutoExpandClassroom, initialProfileTab, onInstallPwa, canInstall }) => {
  if (view === ViewState.DASHBOARD) return null;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bgClass = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-100';
  const innerBgClass = isDarkMode ? 'bg-black/20' : 'bg-gray-50/50';

  // Configuration for the "Genie" effect position (Desktop only)
  const getOriginY = (v: ViewState) => {
      switch(v) {
          case ViewState.GRADES: return '28%';    // ~Top part of nav
          case ViewState.ABSENCES: return '38%';  // Below Grades
          case ViewState.SCHEDULE: return '48%';  // Below Absences
          case ViewState.CLASSROOM: return '58%'; // Below Schedule
          case ViewState.CONCLUSION: return '68%'; // Below Classroom
          case ViewState.PROFILE: return '88%';   // Bottom of sidebar
          default: return '50%';
      }
  };

  const originY = getOriginY(view);

  // Enhanced Animation Variants
  const desktopVariants = {
      initial: { 
          top: originY, 
          left: '3rem', 
          width: '48px', 
          height: '48px', 
          borderRadius: '24px', 
          opacity: 0,
          scale: 0.5
      },
      animate: { 
          top: '6vh', 
          left: '7rem', 
          width: 'calc(100vw - 8rem)', 
          height: '88vh', 
          borderRadius: '40px', 
          opacity: 1,
          scale: 1,
          transition: { 
              type: "spring",
              stiffness: 250,
              damping: 25,
              mass: 0.8
          }
      },
      exit: { 
          top: originY, 
          left: '3rem', 
          width: '48px', 
          height: '48px', 
          borderRadius: '24px', 
          opacity: 0,
          scale: 0.5,
          transition: { duration: 0.3, ease: "anticipate" } 
      }
  };

  const mobileVariants = {
      initial: { top: '100%', left: 0, width: '100%', height: '100%', borderRadius: '24px 24px 0 0', opacity: 1 },
      animate: { 
          top: '0%', 
          left: 0, 
          width: '100%', 
          height: '100%', 
          borderRadius: '0px', 
          opacity: 1,
          transition: { type: "spring", stiffness: 300, damping: 30 }
      },
      exit: { top: '100%', opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  // Stagger for content
  const contentContainerVariants = {
      hidden: { opacity: 0 },
      show: {
          opacity: 1,
          transition: {
              staggerChildren: 0.05,
              delayChildren: 0.2
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* THE EXPANDING MODAL */}
      <motion.div 
        className={`${bgClass} shadow-2xl overflow-hidden absolute z-50 flex flex-col pointer-events-auto border ${borderClass}`}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER - Adjusted padding, removed icon overlap */}
        <motion.div 
            className={`h-24 md:h-20 border-b ${borderClass} flex items-center justify-between px-6 md:px-8 ${bgClass} shrink-0 relative`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div>
              <h2 className={`text-xl md:text-3xl font-black tracking-tight uppercase ${textClass} truncate max-w-[200px] md:max-w-none`}>
                {view === ViewState.GRADES ? 'Boletim' : 
                view === ViewState.ABSENCES ? 'Faltas e Frequência' : 
                view === ViewState.SCHEDULE ? 'Horário Semanal' :
                view === ViewState.CLASSROOM ? 'Google Classroom' :
                view === ViewState.CONCLUSION ? 'Progresso do Curso' :
                'Perfil e Ajustes'}
              </h2>
              <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${subTextClass} flex items-center gap-2 mt-1`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${primaryColor}-500 inline-block`} />
                {userData?.nome_usual || 'Estudante'} 
                <span className="opacity-50">•</span> 
                {userData?.vinculo?.curso || 'IFRN'}
              </p>
          </div>
          <button 
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors group ${isDarkMode ? 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-500'}`}
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </motion.div>

        {/* BODY: Fades in with Stagger */}
        <motion.div 
            className={`flex-1 overflow-y-auto p-4 md:p-8 ${innerBgClass} pb-24 md:pb-8`} 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            variants={contentContainerVariants}
            initial="hidden"
            animate="show"
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>

          {view === ViewState.GRADES && <GradesContent isDark={isDarkMode} primaryColor={primaryColor} secondaryColor={secondaryColor} grades={grades} />}
          {view === ViewState.ABSENCES && <AbsencesContent isDark={isDarkMode} primaryColor={primaryColor} secondaryColor={secondaryColor} grades={grades} />}
          {view === ViewState.SCHEDULE && <ScheduleContent isDark={isDarkMode} accentColor={primaryColor} secondaryColor={secondaryColor} schedule={schedule} />}
          {view === ViewState.CLASSROOM && (
              <ClassroomContent 
                isDark={isDarkMode} 
                accentColor={primaryColor} 
                secondaryColor={secondaryColor} 
                onRequestSettings={() => {
                    onAutoExpandClassroom(true);
                    onChangeView(ViewState.PROFILE);
                }}
              />
          )}
          {view === ViewState.CONCLUSION && <ConclusionContent isDark={isDarkMode} accentColor={primaryColor} secondaryColor={secondaryColor} data={completionData} />}
          {view === ViewState.PROFILE && (
            <ProfileContent 
                isDark={isDarkMode} 
                onToggleTheme={onToggleTheme} 
                currentWallpaper={currentWallpaper} 
                onWallpaperChange={onWallpaperChange} 
                themeVariant={themeVariant}
                onThemeVariantChange={onThemeVariantChange}
                accentColor={primaryColor}
                secondaryColor={secondaryColor}
                userData={userData}
                academicData={academicData}
                grades={grades}
                onLogout={onLogout}
                autoExpandClassroom={autoExpandClassroom}
                onResetAutoExpand={() => onAutoExpandClassroom(false)}
                initialTab={initialProfileTab}
                onInstallPwa={onInstallPwa}
                canInstall={canInstall}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const TaskCard: React.FC<any> = ({ work, index, isDark, accentColor, secondaryColor }) => {
    const now = new Date();
    const isLate = work.jsDate && work.jsDate < now;
    const cardBase = isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50';
    const textMain = isDark ? 'text-white' : 'text-gray-900';

    return (
        <motion.div variants={itemAnim} className={`group relative p-5 rounded-[1.5rem] border w-full transition-all duration-300 ${cardBase}`}>
             <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black transition-colors duration-300
                    ${isLate 
                        ? (isDark ? `bg-${secondaryColor}-500/10 text-${secondaryColor}-500` : `bg-${secondaryColor}-50 text-${secondaryColor}-600`)
                        : (isDark ? `bg-${accentColor}-500/10 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`)
                    }`}
                >
                   {isLate ? <AlertCircle size={24} /> : <Book size={24} />}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md truncate max-w-[200px] ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            {work.courseName}
                        </span>
                        <span className={`text-xs font-bold ${isLate ? `text-${secondaryColor}-500` : 'text-gray-400'} flex items-center gap-1.5`}>
                            {work.jsDate ? work.jsDate.toLocaleDateString('pt-BR') : 'Sem prazo'}
                        </span>
                    </div>
                    <h3 className={`text-lg font-bold leading-snug ${textMain} mb-1`}>{work.title}</h3>
                    <a href={work.alternateLink} target="_blank" rel="noopener noreferrer" className={`text-[11px] font-bold text-${accentColor}-500 hover:underline`}>Abrir Atividade</a>
                </div>
            </div>
        </motion.div>
    )
};

const ClassroomContent = ({ isDark, accentColor, secondaryColor, onRequestSettings }: { isDark: boolean, accentColor: string, secondaryColor: string, onRequestSettings: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workList, setWorkList] = useState<ClassroomWork[]>([]);
    const [filter, setFilter] = useState<'all' | 'active'>('active');
    const token = localStorage.getItem('google_classroom_token');
    
    useEffect(() => {
        if (!token) { setLoading(false); setError('Integração não configurada.'); return; }
        const fetchData = async () => {
            try {
                const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', { headers: { Authorization: `Bearer ${token}` } });
                if (!coursesRes.ok) throw new Error('Token expirado.');
                const coursesData = await coursesRes.json();
                const courses = coursesData.courses || [];
                const workPromises = courses.map(async (course: any) => {
                    const workRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate desc`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!workRes.ok) return [];
                    const workData = await workRes.json();
                    return (workData.courseWork || []).map((w: ClassroomWork) => ({ ...w, courseName: course.name, jsDate: w.dueDate ? new Date(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day, w.dueTime?.hours || 23, w.dueTime?.minutes || 59) : undefined }));
                });
                const allWork = (await Promise.all(workPromises)).flat();
                allWork.sort((a, b) => { if (!a.jsDate) return 1; if (!b.jsDate) return -1; return a.jsDate.getTime() - b.jsDate.getTime(); });
                setWorkList(allWork); setLoading(false);
            } catch (err) { console.error(err); setError('Sessão expirada.'); setLoading(false); }
        };
        fetchData();
    }, [token]);

    if (loading) return <div className="flex justify-center items-center h-64 text-xs font-bold uppercase text-gray-500">Carregando Classroom...</div>;
    
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-70">
            <div className={`p-4 rounded-full bg-${secondaryColor}-500/10 text-${secondaryColor}-500`}><Monitor size={32} /></div>
            <span className="text-sm font-bold text-gray-500">{error}</span>
            <button onClick={onRequestSettings} className={`px-6 py-2.5 bg-${accentColor}-500 text-white rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-transform`}>Configurar Agora</button>
        </div>
    );

    const now = new Date();
    const displayedWork = filter === 'active' ? workList.filter(w => w.jsDate && w.jsDate >= now) : workList;
    
    return (
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
             <div className="flex justify-center gap-2 mb-6">
                <button onClick={() => setFilter('active')} className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${filter === 'active' ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` : 'bg-gray-100 text-gray-500 dark:bg-white/5 hover:bg-gray-200'}`}>Pendentes</button>
                <button onClick={() => setFilter('all')} className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${filter === 'all' ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` : 'bg-gray-100 text-gray-500 dark:bg-white/5 hover:bg-gray-200'}`}>Histórico</button>
             </div>
             <div className="space-y-3">
                {displayedWork.map((work, i) => <TaskCard key={work.id} work={work} index={i} isDark={isDark} accentColor={accentColor} secondaryColor={secondaryColor} />)}
                {displayedWork.length === 0 && <div className="text-center text-gray-500 text-xs py-10 italic">Nenhuma atividade encontrada neste filtro.</div>}
             </div>
        </div>
    );
};

const ConclusionContent = ({ isDark, accentColor, secondaryColor, data }: { isDark: boolean, accentColor: string, secondaryColor: string, data: SuapCompletionData | null }) => {
    if(!data) return <div className="flex justify-center p-10 text-gray-400 text-xs font-bold">Carregando dados de conclusão...</div>;

    const categories = [
        { key: 'regulares_obrigatorios', label: 'Obrigatórias', icon: BookMarked },
        { key: 'regulares_optativos', label: 'Optativas', icon: Zap },
        { key: 'seminarios', label: 'Seminários', icon: Users },
        { key: 'pratica_profissional', label: 'Prática Profissional', icon: Briefcase },
        { key: 'atividades_complementares', label: 'Ativ. Complementares', icon: Award },
        { key: 'tcc', label: 'TCC', icon: FileText },
    ];

    const CompletionCard: React.FC<{ cat: any }> = ({ cat }) => {
        const item = (data as any)[cat.key] as CompletionCategory;
        if (!item || item.ch_esperada === 0) return null;

        const progress = Math.min((item.ch_cumprida / item.ch_esperada) * 100, 100);
        const isComplete = progress >= 100;

        return (
             <motion.div variants={itemAnim} className={`p-5 rounded-[1.5rem] border relative overflow-hidden group hover:scale-[1.02] transition-transform ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
                 <div className="flex items-start justify-between mb-3 relative z-10">
                    <div className={`p-2 rounded-xl ${isComplete ? `bg-${accentColor}-500/20 text-${accentColor}-500` : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600')}`}>
                        <cat.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${isComplete ? `bg-${accentColor}-500 text-white` : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                        {isComplete ? 'Concluído' : `${progress.toFixed(0)}%`}
                    </span>
                 </div>
                 
                 <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{cat.label}</h4>
                 <div className="flex items-end gap-1 mb-3">
                     <span className={`text-2xl font-black ${isComplete ? `text-${accentColor}-500` : 'text-gray-500'}`}>{item.ch_cumprida}h</span>
                     <span className="text-[10px] font-bold text-gray-400 mb-1.5">/ {item.ch_esperada}h</span>
                 </div>

                 {/* Progress Bar */}
                 <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                     <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isComplete ? `bg-${accentColor}-500` : 'bg-gray-400'}`} 
                        style={{ width: `${progress}%` }} 
                     />
                 </div>
             </motion.div>
        )
    };

    return (
        <div className="max-w-5xl mx-auto pb-10">
            {/* HERO SECTION */}
            <motion.div variants={itemAnim} className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex justify-center md:justify-end">
                     {/* Radial Chart Container */}
                     <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                        {/* Background Circle */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="45%" fill="transparent" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="20" />
                            <circle 
                                cx="50%" cy="50%" r="45%" fill="transparent" stroke={`var(--${accentColor}-500)`} strokeWidth="20" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - (283 * data.percentual_cumprida) / 100} 
                                className={`text-${accentColor}-500 transition-all duration-1000 ease-out`}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.percentual_cumprida}%</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Concluído</span>
                        </div>
                     </div>
                </div>

                <div className="text-center md:text-left">
                    <h3 className={`text-3xl font-black mb-2 leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>Resumo Geral</h3>
                    <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Você cumpriu <strong className={`text-${accentColor}-500`}>{data.totais.ch_cumprida}h</strong> de um total de {data.totais.ch_esperada}h necessárias.</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className={`px-4 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                            <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Carga Horária Restante</div>
                            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{data.totais.ch_pendente}h</div>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                            <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Estimativa Conclusão</div>
                            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>2027.2</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* DETAILED GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map(cat => <CompletionCard key={cat.key} cat={cat} />)}
            </div>
        </div>
    );
};

// --- IMPROVED GRADES CONTENT (GRID LAYOUT + SUMMARY) ---
const GradesContent = ({ isDark, primaryColor, secondaryColor, grades }: any) => {
    
    // Calculate Stats
    const validGrades = grades.filter((g: any) => g.average !== '-' && !isNaN(parseFloat(g.average)));
    const periodAverage = validGrades.length > 0 
        ? (validGrades.reduce((acc: number, g: any) => acc + parseFloat(g.average), 0) / validGrades.length).toFixed(1)
        : '-';
    
    const approvedCount = grades.filter((g: any) => g.status?.includes('Aprovado')).length;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* SUMMARY HUD */}
            <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? `bg-${primaryColor}-500/10 border-${primaryColor}-500/20` : `bg-${primaryColor}-50 border-${primaryColor}-100`}`}>
                     <div className="relative z-10">
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? `text-${primaryColor}-400` : `text-${primaryColor}-600`}`}>Média do Semestre</div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{periodAverage}</div>
                        <div className="text-[10px] opacity-60 mt-2 font-medium">Calculado das notas lançadas</div>
                     </div>
                     <TrendingUp className={`absolute -right-4 -bottom-4 opacity-10 text-${primaryColor}-500`} size={80} />
                </div>

                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                     <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500">Disciplinas</div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{grades.length}</div>
                        <div className="text-[10px] opacity-60 mt-2 font-medium">Matriculadas neste período</div>
                     </div>
                     <BookOpen className="absolute -right-4 -bottom-4 opacity-5 text-gray-500" size={80} />
                </div>

                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                     <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500">Aprovações</div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{approvedCount}</div>
                        <div className="text-[10px] opacity-60 mt-2 font-medium">Disciplinas finalizadas</div>
                     </div>
                     <CheckCircle className="absolute -right-4 -bottom-4 opacity-5 text-gray-500" size={80} />
                </div>
            </motion.div>

            {/* GRADES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grades.map((g: any) => {
                     const isPassing = parseFloat(g.average) >= 60;
                     const avg = parseFloat(g.average);
                     const progress = isNaN(avg) ? 0 : avg;
                     
                     return (
                        <motion.div variants={itemAnim} key={g.code} className={`p-6 rounded-[2rem] border flex flex-col justify-between group hover:shadow-lg transition-all duration-300 relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100'}`}>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 z-10 relative">
                                <div className="max-w-[70%]">
                                    <h3 className={`font-black text-sm md:text-base leading-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.subject}</h3>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">CH: {g.totalHours}h • Faltas: {g.absences}</div>
                                </div>
                                <div className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wide border
                                    ${g.status?.includes('Aprovado') ? `bg-${primaryColor}-500/10 text-${primaryColor}-500 border-${primaryColor}-500/20` : 
                                      g.status?.includes('Reprovado') ? `bg-${secondaryColor}-500/10 text-${secondaryColor}-500 border-${secondaryColor}-500/20` : 
                                      `bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:border-white/10`
                                    }`}
                                >
                                    {g.status || 'Cursando'}
                                </div>
                            </div>

                            {/* Quarters Grid */}
                            <div className="grid grid-cols-4 gap-2 mb-6 z-10 relative">
                                {[g.n1, g.n2, g.n3, g.n4].map((note, idx) => (
                                    <div key={idx} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">N{idx + 1}</span>
                                        <span className={`font-black ${note !== '-' ? (isDark ? 'text-white' : 'text-gray-800') : 'text-gray-400 opacity-50'}`}>{note}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer / Average */}
                            <div className="mt-auto z-10 relative">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold uppercase text-gray-500">Média Parcial</span>
                                    <span className={`text-2xl font-black ${avg >= 60 ? `text-${primaryColor}-500` : (avg < 60 && g.average !== '-' ? `text-${secondaryColor}-500` : 'text-gray-400')}`}>
                                        {g.average}
                                    </span>
                                </div>
                                {/* Progress Bar */}
                                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-black/40' : 'bg-gray-100'}`}>
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${avg >= 60 ? `bg-${primaryColor}-500` : `bg-${secondaryColor}-500`}`}
                                        style={{ width: `${g.average !== '-' ? progress : 0}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                     );
                })}
            </div>
        </div>
    );
};

// --- IMPROVED ABSENCES CONTENT ---
const AbsencesContent = ({ isDark, primaryColor, secondaryColor, grades }: { isDark: boolean, primaryColor: string, secondaryColor: string, grades: GradeInfo[] }) => {
    
    // Calculate Summary Logic
    const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
    const criticalSubjects = grades.filter(g => {
        const remaining = g.limit - g.absences;
        return remaining <= 4 && remaining >= 0;
    });
    const failedSubjects = grades.filter(g => g.absences > g.limit);
    
    // Find the subject with strictly minimum safety margin (that hasn't failed yet)
    const activeSubjects = grades.filter(g => g.absences <= g.limit);
    activeSubjects.sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));
    const lowestMarginSubject = activeSubjects[0];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* SUMMARY DASHBOARD */}
            <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? `bg-${secondaryColor}-500/10 border-${secondaryColor}-500/20` : `bg-${secondaryColor}-50 border-${secondaryColor}-100`}`}>
                     <div className="relative z-10">
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? `text-${secondaryColor}-400` : `text-${secondaryColor}-600`}`}>Total de Faltas</div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalAbsences}</div>
                        <div className="text-[10px] opacity-60 mt-2 font-medium">Acumuladas no semestre</div>
                     </div>
                     <AlertTriangle className={`absolute -right-4 -bottom-4 opacity-10 text-${secondaryColor}-500`} size={80} />
                </div>

                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${criticalSubjects.length > 0 ? (isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100') : (isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100')}`}>
                     <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Risco Crítico</div>
                        <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{criticalSubjects.length}</div>
                        <div className="text-[10px] opacity-60 mt-2 font-medium">{criticalSubjects.length === 1 ? 'Disciplina em alerta' : 'Disciplinas em alerta'}</div>
                     </div>
                     <Flag className={`absolute -right-4 -bottom-4 opacity-10 ${criticalSubjects.length > 0 ? 'text-orange-500' : 'text-green-500'}`} size={80} />
                </div>

                <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                     <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500">Menor Margem</div>
                        {lowestMarginSubject ? (
                            <>
                                <div className={`text-xl font-bold truncate mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{lowestMarginSubject.subject.split(' ').slice(0,2).join(' ')}</div>
                                <div className={`text-xs font-bold ${isDark ? `text-${secondaryColor}-400` : `text-${secondaryColor}-600`}`}>Restam apenas {lowestMarginSubject.limit - lowestMarginSubject.absences} faltas</div>
                            </>
                        ) : (
                            <div className="text-sm font-bold opacity-50">Sem dados</div>
                        )}
                     </div>
                </div>
            </motion.div>

            {/* DETAILED LIST */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 pl-2">Detalhamento por Disciplina</h3>
                {grades.map((g: any) => {
                    const percentageUsed = (g.absences / g.limit) * 100;
                    const isCritical = (g.limit - g.absences) <= 4;
                    const isFailed = g.absences > g.limit;
                    
                    return (
                        <motion.div variants={itemAnim} key={g.code} className={`p-5 rounded-[1.5rem] border flex flex-col gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                                <div className="max-w-[70%]">
                                    <span className={`font-bold text-sm block mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.subject}</span>
                                    {isFailed && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-${secondaryColor}-500/20 text-${secondaryColor}-500`}>Reprovado por Faltas</span>}
                                    {isCritical && !isFailed && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-500">Risco Elevado</span>}
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-black ${isFailed ? `text-${secondaryColor}-500` : (isCritical ? 'text-orange-500' : (isDark ? 'text-white' : 'text-gray-900'))}`}>{g.absences}</span>
                                    <span className="text-xs text-gray-500 font-medium block">de {g.limit} permitidas</span>
                                </div>
                            </div>
                            
                            {/* Visual Progress Bar */}
                            <div className="relative w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ${isFailed ? `bg-${secondaryColor}-500` : (percentageUsed > 80 ? 'bg-orange-500' : `bg-${primaryColor}-500`)}`} 
                                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                                />
                                {/* Marker for safety limit */}
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500/50 z-10" title="Limite" />
                            </div>
                            
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <span>{percentageUsed.toFixed(0)}% Usado</span>
                                <span>{Math.max(g.limit - g.absences, 0)} Restantes</span>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    );
};

const ScheduleContent = ({ isDark, accentColor, secondaryColor, schedule }: any) => (
     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day, dayIndex) => {
             const classes = schedule.filter((s:any) => s.day === day);
             return (
                 <motion.div 
                    variants={itemAnim}
                    transition={{ delay: dayIndex * 0.1 }}
                    key={day} 
                    className={`p-4 rounded-[1.5rem] border h-full flex flex-col ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}
                 >
                     <div className="font-black text-xs mb-4 text-center uppercase tracking-widest text-gray-400 border-b border-dashed border-gray-500/20 pb-2">{day}</div>
                     <div className="space-y-3 flex-1">
                         {classes.map((c:any, i:number) => (
                             <div key={i} className={`text-xs p-3 rounded-xl border relative overflow-hidden group ${isDark ? 'bg-black/20 border-white/5 hover:border-white/20' : 'bg-gray-50 border-gray-100 hover:border-gray-200'} transition-colors`}>
                                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${i % 2 === 0 ? `bg-${accentColor}-500` : 'bg-indigo-500'}`} />
                                 <div className="font-black mb-1 opacity-80">{c.startTime}</div>
                                 <div className="font-bold leading-tight mb-1 line-clamp-2">{c.name}</div>
                                 <div className="text-[10px] opacity-60 flex items-center gap-1"><MapPin size={10} /> {c.room}</div>
                             </div>
                         ))}
                         {classes.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 min-h-[100px]">
                                <Coffee size={24} className="mb-2" />
                                <span className="text-[10px] font-bold uppercase">Sem Aula</span>
                            </div>
                         )}
                     </div>
                 </motion.div>
             )
         })}
     </div>
);

const ProfileContent = ({ isDark, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, accentColor, secondaryColor, userData, academicData, grades, onLogout, autoExpandClassroom, onResetAutoExpand, initialTab, onInstallPwa, canInstall }: { 
    isDark: boolean, 
    onToggleTheme?: () => void,
    currentWallpaper?: string,
    onWallpaperChange?: (url: string) => void,
    themeVariant: ThemeVariant,
    onThemeVariantChange: (variant: ThemeVariant) => void,
    accentColor: string,
    secondaryColor: string,
    userData: SuapProfile | null,
    academicData?: SuapMeusDadosAluno | null,
    grades: GradeInfo[],
    onLogout: () => void,
    autoExpandClassroom: boolean,
    onResetAutoExpand: () => void,
    initialTab?: 'profile' | 'settings' | 'wallpaper',
    onInstallPwa?: () => void,
    canInstall?: boolean
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'wallpaper'>('profile');
    const [useCustomPhoto, setUseCustomPhoto] = useState(false);
    
    // Update active tab if prop changes (e.g. via shortcut)
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // API Key Logic
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    // Google Classroom Logic
    const [classroomEnabled, setClassroomEnabled] = useState(false);
    const [classroomToken, setClassroomToken] = useState('');
    const [classroomStatus, setClassroomStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [manualTokenInput, setManualTokenInput] = useState('');
    
    // Detect Current Redirect URI (Dynamic)
    const redirectUri = window.location.origin;

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) setApiKey(storedKey);
        
        const storedClassroomToken = localStorage.getItem('google_classroom_token');
        if (storedClassroomToken) {
            setClassroomToken(storedClassroomToken);
            setClassroomEnabled(true);
            setClassroomStatus('success');
        }
    }, []);

    // Handle Auto Expansion and Focus
    useEffect(() => {
        if (autoExpandClassroom) {
            setActiveTab('settings');
            setClassroomEnabled(true);
            setTimeout(() => onResetAutoExpand(), 500);
        }
        if (initialTab === 'settings') {
             // Small delay to ensure rendering
             setTimeout(() => apiKeyInputRef.current?.focus(), 300);
        }
    }, [autoExpandClassroom, onResetAutoExpand, initialTab]);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        setKeySaved(false); // User edited, so it's unsaved
    };

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setKeySaved(true);
            // Optional: Show temporary success feedback
            setTimeout(() => setKeySaved(false), 2000);
        } else {
            // If cleared
            localStorage.removeItem('gemini_api_key');
            setApiKey('');
        }
    };

    // Construct auth URL with Detected URI
    const getAuthUrl = () => {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'token',
            scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly email profile',
            include_granted_scopes: 'true',
            enable_serial_consent: 'true'
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    };

    const handleSaveManualToken = async () => {
        if (!manualTokenInput.trim()) return;
        let tokenToSave = manualTokenInput.trim();
        if (tokenToSave.includes('access_token=')) {
            const match = tokenToSave.match(/access_token=([^&]+)/);
            if (match && match[1]) tokenToSave = match[1];
        }
        setClassroomStatus('loading');
        try {
            const verifyRes = await fetch('https://classroom.googleapis.com/v1/courses?pageSize=1', {
                headers: { Authorization: `Bearer ${tokenToSave}` }
            });
            if (verifyRes.ok) {
                localStorage.setItem('google_classroom_token', tokenToSave);
                setClassroomToken(tokenToSave);
                setClassroomStatus('success');
                setManualTokenInput('');
            } else {
                setClassroomStatus('error');
            }
        } catch (e) { setClassroomStatus('error'); }
    };
    
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const subTextClass = isDark ? 'text-gray-400' : 'text-gray-500';

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`px-4 md:px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === id
                ? `bg-${accentColor}-500 text-white shadow-lg shadow-${accentColor}-500/30` 
                : (isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white text-gray-500 hover:bg-gray-50')
            }`}
        >
            <div className="flex items-center gap-2">
                <Icon size={14} />
                <span>{label}</span>
            </div>
        </button>
    );

    const VariantButton = ({ variant, label, icon: Icon }: { variant: ThemeVariant, label: string, icon: any }) => {
        const isActive = themeVariant === variant;
        return (
            <button 
                onClick={() => onThemeVariantChange(variant)}
                className={`flex-1 min-w-[80px] p-3 rounded-[1rem] flex flex-col items-center justify-center gap-2 transition-all border ${
                    isActive 
                        ? `bg-${accentColor}-500 text-white border-${accentColor}-500 shadow-md` 
                        : (isDark ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')
                }`}
            >
                <Icon size={18} className={isActive ? 'text-white' : ''} />
                <span className="font-bold text-[10px] uppercase tracking-wide">{label}</span>
            </button>
        )
    };

    const suapPhotoPath = userData?.url_foto_150x200 || userData?.foto;
    const userPhoto = (useCustomPhoto || !suapPhotoPath) 
        ? DEFAULT_PROFILE_IMG 
        : (suapPhotoPath.startsWith('http') ? suapPhotoPath : `https://suap.ifrn.edu.br${suapPhotoPath}`);

    return (
        <div className="h-full flex flex-col">
            {/* Profile Navigation Tabs - Scrollable on mobile */}
            <div className="flex gap-3 mb-8 shrink-0 overflow-x-auto pb-2 hide-scrollbar">
                <TabButton id="profile" label="Perfil" icon={User} />
                <TabButton id="settings" label="Configurações" icon={Settings} />
                <TabButton id="wallpaper" label="Papéis de Parede" icon={ImageIcon} />
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'profile' ? (
                     <motion.div 
                        key="profile"
                        variants={itemAnim}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-y-auto"
                    >
                        <div className={`md:col-span-1 rounded-[2rem] border p-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden ${cardBg} h-fit`}>
                             <div className={`w-32 h-32 rounded-full p-1.5 transition-transform duration-300 group-hover:scale-105 ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'} mb-4`}>
                                    <img src={userPhoto} className={`w-full h-full rounded-full object-cover border-4 ${isDark ? 'border-slate-700' : 'border-gray-50'}`} alt="Profile"/>
                             </div>
                             <h2 className={`text-2xl font-black ${textMain}`}>{userData ? userData.nome_usual : 'Carregando...'}</h2>
                             <div className={`text-sm font-mono font-bold tracking-widest mt-1 opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{userData ? userData.matricula : '...'}</div>
                             
                             <div className="flex gap-2 mt-6 w-full">
                                <div className={`flex-1 p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} flex flex-col items-center`}>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">IRA</span>
                                    <span className={`text-xl font-black ${textMain}`}>{academicData?.ira || '-'}</span>
                                </div>
                                <div className={`flex-1 p-3 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} flex flex-col items-center`}>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">Período</span>
                                    <span className={`text-xl font-black ${textMain}`}>{academicData?.periodo_referencia || '-'}</span>
                                </div>
                             </div>
                        </div>
                        
                        <div className="md:col-span-2 flex flex-col gap-6 pb-8">
                             <div className={`${cardBg} p-8 rounded-[2rem] border shadow-sm`}>
                                  <h3 className={`text-2xl font-bold leading-tight mb-4 ${textMain}`}>{academicData?.curso || userData?.vinculo?.curso || 'Curso não identificado'}</h3>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className={`p-4 rounded-xl ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Campus</div>
                                          <div className={`font-medium ${textMain}`}>{userData?.campus}</div>
                                      </div>
                                      <div className={`p-4 rounded-xl ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Situação</div>
                                          <div className={`font-medium ${academicData?.situacao === 'Matriculado' ? `text-${accentColor}-500` : textMain}`}>
                                              {academicData?.situacao || userData?.vinculo?.situacao || '---'}
                                          </div>
                                      </div>
                                      <div className={`p-4 rounded-xl ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Email Acadêmico</div>
                                          <div className={`font-medium text-xs break-all ${textMain}`}>{userData?.email_academico}</div>
                                      </div>
                                      <div className={`p-4 rounded-xl ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
                                          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Ingresso</div>
                                          <div className={`font-medium ${textMain}`}>{academicData?.ingresso}</div>
                                      </div>
                                  </div>
                             </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'wallpaper' ? (
                    <motion.div key="wallpaper" variants={itemAnim} initial="hidden" animate="show" exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            {WALLPAPERS.map((wp, idx) => {
                                const isSelected = currentWallpaper === wp;
                                return (
                                    <div key={idx} onClick={() => onWallpaperChange?.(wp)} className={`group relative rounded-3xl overflow-hidden cursor-pointer aspect-video border-4 transition-all duration-300 ${isSelected ? `border-${accentColor}-500 scale-[1.02]` : 'border-transparent'}`}>
                                        <img src={wp} alt={`Wallpaper ${idx + 1}`} className="w-full h-full object-cover" />
                                        {isSelected && <div className={`absolute inset-0 z-20 bg-${accentColor}-500/20 flex items-center justify-center`}><div className={`bg-${accentColor}-500 text-white p-3 rounded-full shadow-lg`}><Check size={32} /></div></div>}
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="settings"
                        variants={itemAnim}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0 }}
                        className="h-full overflow-y-auto"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20 md:pb-6">
                            {/* Left Column: Appearance & Integrations */}
                            <div className="space-y-8">
                                {/* Section: Theme Mode */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Aparência</h3>
                                    
                                    {/* Light/Dark Toggle */}
                                    <div className={`${cardBg} rounded-3xl p-2 border shadow-sm flex mb-4`}>
                                        <button onClick={() => isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${!isDark ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-white'}`}>
                                            <Sun size={20} className={!isDark ? 'text-orange-500' : ''} />
                                            <span className="font-bold text-sm">Claro</span>
                                        </button>
                                        <button onClick={() => !isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 shadow-md text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                                            <Moon size={20} className={isDark ? 'text-blue-400' : ''} />
                                            <span className="font-bold text-sm">Escuro</span>
                                        </button>
                                    </div>

                                    {/* Variant Selector */}
                                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 px-2">Estilo Visual</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <VariantButton variant="dynamic" label="Dinâmico" icon={Aperture} />
                                        <VariantButton variant="monochrome" label="Mono" icon={Droplet} />
                                        <VariantButton variant="saturated" label="Neon" icon={Palette} />
                                        <VariantButton variant="sepia" label="Sépia" icon={Coffee} />
                                    </div>
                                </div>

                                {/* Section: Integrations */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Sistema</h3>
                                    
                                    {/* PWA INSTALL BUTTON */}
                                    {canInstall && (
                                        <button 
                                            onClick={onInstallPwa} 
                                            className={`w-full p-4 mb-4 rounded-[2rem] border flex items-center justify-between group transition-all ${isDark ? `bg-${accentColor}-500/10 border-${accentColor}-500/20 text-${accentColor}-400 hover:bg-${accentColor}-500/20` : `bg-${accentColor}-50 border-${accentColor}-100 text-${accentColor}-600 hover:bg-${accentColor}-100`}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? `bg-${accentColor}-500/20` : `bg-${accentColor}-100`}`}>
                                                    <Download size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">Instalar Aplicativo</div>
                                                    <div className="text-[10px] opacity-70">Adicionar à tela inicial</div>
                                                </div>
                                            </div>
                                            <ArrowRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}

                                    <div className={`${cardBg} rounded-[2rem] border shadow-sm overflow-hidden transition-all duration-300`}>
                                        <div className={`p-6 flex items-center justify-between ${classroomEnabled ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-100') : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${classroomEnabled ? `bg-${accentColor}-500 text-white` : (isDark ? `bg-${accentColor}-500/10 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`)}`}>
                                                    <Monitor size={24} />
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-base ${textMain}`}>Classroom</div>
                                                    <div className="text-xs text-gray-400">Sincronizar tarefas e avisos</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setClassroomEnabled(!classroomEnabled)} className={`text-4xl transition-colors relative z-10 ${classroomEnabled ? `text-${accentColor}-500` : 'text-gray-300'}`}>
                                                {classroomEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {classroomEnabled && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`overflow-hidden ${isDark ? 'bg-black/20' : 'bg-gray-50/50'}`}>
                                                    <div className="p-6 pt-4 space-y-6">
                                                        {classroomStatus !== 'success' && (
                                                            <>
                                                                <a href={getAuthUrl()} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm decoration-none`}>
                                                                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" /> Conectar com Google <ExternalLink size={12} className="opacity-50" />
                                                                </a>
                                                                <div className="space-y-2">
                                                                    <div className="relative">
                                                                        <input type="text" value={manualTokenInput} onChange={(e) => setManualTokenInput(e.target.value)} placeholder="Token Manual..." className={`w-full pl-9 pr-4 py-3 rounded-xl text-xs font-mono outline-none border transition-colors ${isDark ? `bg-black/30 border-white/10 focus:border-${accentColor}-500 text-white` : `bg-white border-gray-200 focus:border-${accentColor}-500 text-gray-800`}`} />
                                                                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                                                    </div>
                                                                    <button onClick={handleSaveManualToken} disabled={!manualTokenInput.trim() || classroomStatus === 'loading'} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all mt-2 ${!manualTokenInput.trim() ? 'opacity-50 cursor-not-allowed bg-gray-500 text-white' : `bg-${accentColor}-500 text-white hover:shadow-lg`}`}>Salvar e Testar <Check size={14} /></button>
                                                                </div>
                                                            </>
                                                        )}
                                                        {classroomStatus === 'success' && (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center">
                                                                <div className="font-bold text-sm text-green-500 flex items-center justify-center gap-2"><CheckCircle size={16} /> Integração Ativa</div>
                                                                <button onClick={() => { localStorage.removeItem('google_classroom_token'); setClassroomToken(''); setClassroomStatus('idle'); }} className="w-full py-2 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors">Desconectar</button>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Conta</h3>
                                    <button onClick={onLogout} className={`w-full p-4 rounded-[2rem] border flex items-center justify-between group transition-all ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100'}`}>
                                        <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}><LogOut size={20} /></div><div className="text-left"><div className="font-bold text-sm">Sair do SUAP</div><div className="text-[10px] opacity-70">Encerrar sessão atual</div></div></div><ArrowRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: AI Config (Full Height) */}
                            <div className="flex flex-col h-full">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Inteligência Artificial</h3>
                                <div className={`${cardBg} rounded-[2rem] border shadow-sm p-8 relative overflow-hidden flex-1 min-h-[320px]`}>
                                    <div className={`absolute -right-10 -bottom-10 w-48 h-48 bg-${accentColor}-500/10 rounded-full blur-3xl pointer-events-none`} />
                                    
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-500`}`}>
                                                <Cpu size={28} />
                                            </div>
                                            <div>
                                                <div className={`font-bold text-lg ${textMain}`}>Gemini 2.5 Flash</div>
                                                <div className="text-xs text-gray-400">Assistente Virtual</div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}>
                                            <ShieldCheck size={12} />
                                            Ativo
                                        </div>
                                    </div>

                                    {/* API Key Configuration (UPDATED WITH SAVE BUTTON) */}
                                    <div className="relative z-10 space-y-6">
                                        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block flex items-center gap-2">
                                                <Key size={12} />
                                                Chave de API (Google AI Studio)
                                            </label>
                                            
                                            <div className="relative">
                                                <input 
                                                    ref={apiKeyInputRef}
                                                    type={showKey ? "text" : "password"}
                                                    value={apiKey}
                                                    onChange={handleApiKeyChange}
                                                    placeholder="Cole sua API Key aqui..."
                                                    className={`w-full bg-transparent border-b px-2 py-2 text-sm font-mono tracking-wider outline-none transition-colors ${
                                                        isDark ? `border-white/10 focus:border-${accentColor}-500 text-white placeholder:text-white/20` : `border-gray-200 focus:border-${accentColor}-500 text-gray-800 placeholder:text-gray-400`
                                                    }`}
                                                />
                                                <button 
                                                    onClick={() => setShowKey(!showKey)}
                                                    className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-${accentColor}-500 transition-colors`}
                                                >
                                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            <motion.button 
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSaveApiKey}
                                                className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg
                                                    ${keySaved 
                                                        ? 'bg-green-500 text-white shadow-green-500/20' 
                                                        : `bg-${accentColor}-500 text-white shadow-${accentColor}-500/20`
                                                    }
                                                `}
                                            >
                                                {keySaved ? (
                                                    <>
                                                        <CheckCircle size={14} /> Salvo!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={14} /> Salvar Chave
                                                    </>
                                                )}
                                            </motion.button>
                                            
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500">
                                                    {localStorage.getItem('gemini_api_key') ? 'Chave personalizada salva localmente.' : 'Nenhuma chave salva.'}
                                                </span>
                                                {localStorage.getItem('gemini_api_key') && (
                                                    <button 
                                                        onClick={() => { setApiKey(''); localStorage.removeItem('gemini_api_key'); }}
                                                        className="text-[10px] font-bold text-red-400 hover:text-red-500"
                                                    >
                                                        LIMPAR
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-400 leading-relaxed">
                                            Sua chave de API permite aumentar os limites de uso do assistente Gemini. 
                                            A chave é salva apenas no seu navegador.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
