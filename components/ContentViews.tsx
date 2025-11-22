
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle, Clock, MapPin, Award, Briefcase, User, Calendar, GraduationCap, Settings, Monitor, Moon, Sun, ToggleLeft, ToggleRight, Link2, ExternalLink, Cpu, ShieldCheck, Eye, EyeOff, Key, Image as ImageIcon, Check, BookOpen, Palette, RefreshCw, Mail, Fingerprint, FileText, UserSquare2, Percent, Calculator, Flag, Target, CheckSquare, LogOut, ArrowRight, Copy, Clipboard, HelpCircle, Book, CalendarClock, ChevronRight, MoreHorizontal, Save } from 'lucide-react';
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
}

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg"
];

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// Constants for Google OAuth
const GOOGLE_CLIENT_ID = "493737247808-0rv9jbldtskqdg78l122foess6h1t7ll.apps.googleusercontent.com";

export const ContentView: React.FC<OverlayViewProps> = ({ view, onClose, onChangeView, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, grades, schedule, completionData, onLogout, autoExpandClassroom, onAutoExpandClassroom, initialProfileTab }) => {
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
  const iconColorClass = `text-${primaryColor}-500`;

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

  const getIcon = (v: ViewState) => {
      switch(v) {
          case ViewState.GRADES: return <BookOpen size={24} className={iconColorClass} />;
          case ViewState.ABSENCES: return <AlertTriangle size={24} className={iconColorClass} />;
          case ViewState.SCHEDULE: return <Calendar size={24} className={iconColorClass} />;
          case ViewState.CLASSROOM: return <Monitor size={24} className={iconColorClass} />;
          case ViewState.CONCLUSION: return <Flag size={24} className={iconColorClass} />;
          case ViewState.PROFILE: return <User size={24} className={iconColorClass} />;
          default: return <Settings size={24} />;
      }
  };

  const originY = getOriginY(view);
  const icon = getIcon(view);

  // Animation Variants
  const desktopVariants = {
      initial: { top: originY, left: '3rem', width: '48px', height: '48px', borderRadius: '24px', opacity: 0, scale: 0.8 },
      animate: { top: '6vh', left: '7rem', width: 'calc(100vw - 8rem)', height: '88vh', borderRadius: '40px', opacity: 1, scale: 1 },
      exit: { top: originY, left: '3rem', width: '48px', height: '48px', borderRadius: '24px', opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: "backIn" } }
  };

  const mobileVariants = {
      initial: { top: '100%', left: 0, width: '100%', height: '100%', borderRadius: '24px 24px 0 0', opacity: 1, scale: 1 },
      animate: { top: '0%', left: 0, width: '100%', height: '100%', borderRadius: '0px', opacity: 1, scale: 1 },
      exit: { top: '100%', left: 0, width: '100%', height: '100%', borderRadius: '24px 24px 0 0', opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  const variants = isMobile ? mobileVariants : desktopVariants;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* THE EXPANDING MODAL */}
      <motion.div 
        className={`${bgClass} shadow-2xl overflow-hidden absolute z-50 flex flex-col pointer-events-auto border ${borderClass}`}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ 
            type: 'spring', 
            stiffness: 280, 
            damping: 30,
            mass: 0.8 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon: Desktop Only animation */}
        {!isMobile && (
            <motion.div
                className="absolute z-50 flex items-center justify-center pointer-events-none"
                initial={{ top: '50%', left: '50%', x: '-50%', y: '-50%' }}
                animate={{ top: '2.5rem', left: '2rem', x: '0%', y: '-50%' }}
                transition={{ type: 'spring', stiffness: 280, damping: 30, delay: 0.05 }}
            >
                {icon}
            </motion.div>
        )}

        {/* HEADER */}
        <motion.div 
            className={`h-20 border-b ${borderClass} flex items-center justify-between px-6 md:px-8 ${bgClass} shrink-0 ${!isMobile ? 'pl-16' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.2 }}
        >
          <div>
              <h2 className={`text-xl md:text-2xl font-black tracking-tight uppercase ${textClass} truncate max-w-[200px] md:max-w-none`}>
                {view === ViewState.GRADES ? 'Boletim' : 
                view === ViewState.ABSENCES ? 'Faltas' : 
                view === ViewState.SCHEDULE ? 'Horários' :
                view === ViewState.CLASSROOM ? 'Classroom' :
                view === ViewState.CONCLUSION ? 'Conclusão' :
                'Perfil'}
              </h2>
              <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${subTextClass}`}>
                {userData?.nome_usual ? userData.nome_usual.split(' ')[0] : 'Estudante'}
              </p>
          </div>
          <button 
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors group ${isDarkMode ? 'bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-500'}`}
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </motion.div>

        {/* BODY: Fades in */}
        <motion.div 
            className={`flex-1 overflow-y-auto p-4 md:p-6 ${innerBgClass} pb-24 md:pb-6`} // Added padding-bottom for mobile nav
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.25, duration: 0.2 }}
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
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

// ... (Rest of the Sub-components: TaskCard, ClassroomContent, ConclusionContent, GradesContent, AbsencesContent, ScheduleContent are unchanged) ...

const TaskCard: React.FC<any> = ({ work, index, isDark, accentColor, secondaryColor }) => {
     // Simplified re-implementation for brevity as it wasn't changed
    const now = new Date();
    const isLate = work.jsDate && work.jsDate < now;
    const isDueSoon = work.jsDate && !isLate && (work.jsDate.getTime() - now.getTime()) < (1000 * 60 * 60 * 24 * 2); // 2 days
    const cardBase = isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50';
    const textMain = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className={`group relative p-5 rounded-[1.5rem] border w-full transition-all duration-300 ${cardBase}`}>
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
        </div>
    )
};

const ClassroomContent = ({ isDark, accentColor, secondaryColor, onRequestSettings }: { isDark: boolean, accentColor: string, secondaryColor: string, onRequestSettings: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [courses, setCourses] = useState<ClassroomCourse[]>([]);
    const [workList, setWorkList] = useState<ClassroomWork[]>([]);
    const [filter, setFilter] = useState<'all' | 'active'>('active');
    const token = localStorage.getItem('google_classroom_token');
    const textMain = isDark ? 'text-white' : 'text-gray-900';

    useEffect(() => {
        if (!token) { setLoading(false); setError('Integração não configurada.'); return; }
        const fetchData = async () => {
            try {
                const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', { headers: { Authorization: `Bearer ${token}` } });
                if (!coursesRes.ok) throw new Error('Token expirado ou inválido.');
                const coursesData = await coursesRes.json();
                const courses = coursesData.courses || [];
                setCourses(courses);
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

    if (loading) return <div className="flex justify-center items-center h-64 text-xs font-bold uppercase text-gray-500">Carregando...</div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertTriangle size={32} className={`text-${secondaryColor}-500`} />
            <span className="text-sm font-bold text-gray-500">{error}</span>
            <button onClick={onRequestSettings} className={`px-4 py-2 bg-${accentColor}-500 text-white rounded-lg text-xs font-bold shadow-lg`}>Configurar</button>
        </div>
    );

    const now = new Date();
    const displayedWork = filter === 'active' ? workList.filter(w => w.jsDate && w.jsDate >= now) : workList;
    
    return (
        <div className="space-y-6 pb-12 max-w-4xl mx-auto">
             <div className="flex justify-center gap-2 mb-6">
                <button onClick={() => setFilter('active')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'active' ? `bg-${accentColor}-500 text-white` : 'bg-gray-100 text-gray-500 dark:bg-white/10'}`}>Próximas</button>
                <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filter === 'all' ? `bg-${accentColor}-500 text-white` : 'bg-gray-100 text-gray-500 dark:bg-white/10'}`}>Todas</button>
             </div>
             <div className="space-y-3">
                {displayedWork.map((work, i) => <TaskCard key={work.id} work={work} index={i} isDark={isDark} accentColor={accentColor} secondaryColor={secondaryColor} />)}
                {displayedWork.length === 0 && <div className="text-center text-gray-500 text-xs py-10">Nenhuma atividade encontrada.</div>}
             </div>
        </div>
    );
};

const ConclusionContent = ({ isDark, accentColor, secondaryColor, data }: any) => {
    if(!data) return <div className="flex justify-center p-10 text-gray-400 text-xs font-bold">Carregando...</div>;
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Target size={48} className={`text-${accentColor}-500 mb-4`} />
            <div className="text-2xl font-black mb-2">{data.percentual_cumprida}% Concluído</div>
            <div className="text-xs font-bold uppercase">Total Cumprido: {data.totais.ch_cumprida}h / {data.totais.ch_esperada}h</div>
        </div>
    );
};

const GradesContent = ({ isDark, primaryColor, secondaryColor, grades }: any) => (
    <div className="space-y-4">
         {grades.map((g: any) => (
             <div key={g.code} className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} flex justify-between items-center`}>
                 <div>
                     <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.subject}</div>
                     <div className="text-xs text-gray-500">Média: {g.average}</div>
                 </div>
                 <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${g.status === 'Aprovado' ? `bg-${primaryColor}-500/10 text-${primaryColor}-500` : `bg-gray-100 text-gray-500`}`}>{g.status}</div>
             </div>
         ))}
    </div>
);

const AbsencesContent = ({ isDark, primaryColor, secondaryColor, grades }: any) => (
    <div className="space-y-4">
         {grades.map((g: any) => (
             <div key={g.code} className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                 <div className="flex justify-between mb-2">
                     <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{g.subject}</span>
                     <span className={`font-black text-${primaryColor}-500`}>{g.absences} Faltas</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-white/10">
                     <div className={`bg-${primaryColor}-500 h-2 rounded-full`} style={{ width: `${Math.min((g.absences/g.limit)*100, 100)}%` }} />
                 </div>
                 <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-bold uppercase">
                     <span>0</span>
                     <span>Limite: {g.limit}</span>
                 </div>
             </div>
         ))}
    </div>
);

const ScheduleContent = ({ isDark, accentColor, secondaryColor, schedule }: any) => (
     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map(day => {
             const classes = schedule.filter((s:any) => s.day === day);
             return (
                 <div key={day} className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                     <div className="font-black text-sm mb-3 text-center uppercase text-gray-400">{day}</div>
                     <div className="space-y-2">
                         {classes.map((c:any, i:number) => (
                             <div key={i} className="text-xs p-2 rounded-lg bg-black/5 dark:bg-white/5">
                                 <div className="font-bold">{c.startTime}</div>
                                 <div className="truncate">{c.name}</div>
                             </div>
                         ))}
                         {classes.length === 0 && <div className="text-xs text-center opacity-30 py-2">Sem aulas</div>}
                     </div>
                 </div>
             )
         })}
     </div>
);

// --- REFACTORED PROFILE CONTENT WITH SAVE BUTTON ---

const ProfileContent = ({ isDark, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, accentColor, secondaryColor, userData, academicData, grades, onLogout, autoExpandClassroom, onResetAutoExpand, initialTab }: { 
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
    initialTab?: 'profile' | 'settings' | 'wallpaper'
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'wallpaper'>('profile');
    const [useCustomPhoto, setUseCustomPhoto] = useState(false);
    
    // Update active tab if prop changes (e.g. via shortcut)
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // API Key Logic - Refactored for Manual Save
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
                    // ... PROFILE TAB CONTENT (Kept mostly same, just snippet here) ...
                     <motion.div 
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-y-auto"
                    >
                        <div className={`md:col-span-1 rounded-[2rem] border p-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden ${cardBg} h-fit`}>
                             <div className={`w-28 h-28 rounded-full p-1 transition-transform duration-300 group-hover:scale-105 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                                    <img src={userPhoto} className={`w-full h-full rounded-full object-cover border-4 ${isDark ? 'border-slate-800' : 'border-gray-50'}`} alt="Profile"/>
                             </div>
                             <h2 className={`mt-5 text-2xl font-black ${textMain}`}>{userData ? userData.nome_usual : 'Carregando...'}</h2>
                             <div className={`text-xl font-mono font-black tracking-widest ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{userData ? userData.matricula : '...'}</div>
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-8 pb-8">
                             <div className={`${cardBg} p-8 rounded-[2rem] border shadow-sm`}>
                                  <h3 className={`text-2xl font-bold leading-tight ${textMain}`}>{academicData?.curso || userData?.vinculo?.curso || 'Curso não identificado'}</h3>
                                  <p className="text-gray-400 text-sm">{academicData?.matriz && <span>Matriz: {academicData.matriz}</span>}</p>
                             </div>
                             {/* Added extra padding for mobile bottom */}
                        </div>
                    </motion.div>
                ) : activeTab === 'wallpaper' ? (
                    // ... WALLPAPER TAB CONTENT ...
                    <motion.div key="wallpaper" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full overflow-y-auto">
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
                    // ... SETTINGS TAB CONTENT ...
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full overflow-y-auto"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20 md:pb-6">
                            {/* Left Column: Appearance & Integrations */}
                            <div className="space-y-8">
                                {/* Section: Theme Mode */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Modo</h3>
                                    <div className={`${cardBg} rounded-3xl p-2 border shadow-sm flex`}>
                                        <button onClick={() => isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${!isDark ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-white'}`}>
                                            <Sun size={20} className={!isDark ? 'text-orange-500' : ''} />
                                            <span className="font-bold text-sm">Claro</span>
                                        </button>
                                        <button onClick={() => !isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 shadow-md text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                                            <Moon size={20} className={isDark ? 'text-blue-400' : ''} />
                                            <span className="font-bold text-sm">Escuro</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section: Integrations */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Integrações</h3>
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
