
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle, Clock, MapPin, Award, Briefcase, User, Calendar, GraduationCap, Settings, Monitor, Moon, Sun, ToggleLeft, ToggleRight, Link2, ExternalLink, Cpu, ShieldCheck, Eye, EyeOff, Key, Image as ImageIcon, Check, BookOpen, Palette, RefreshCw, Mail, Fingerprint, FileText, UserSquare2, Percent, Calculator, Flag, Target, CheckSquare, LogOut, ArrowRight, Copy, Clipboard, HelpCircle, Book, CalendarClock, ChevronRight, MoreHorizontal, Save, Download, Droplet, Coffee, Aperture, BookMarked, Users, Rocket, Zap, TrendingUp, TrendingDown, Minus, Sparkles, Camera, PenLine, Trash2, Cloud, UploadCloud, Search, Shield, ChevronDown } from 'lucide-react';
import { ViewState, GradeInfo, ThemeVariant, SuapProfile, SuapMeusDadosAluno, ProcessedClass, SuapCompletionData, CompletionCategory, ClassroomCourse, ClassroomWork, PerformanceSettings, SuapPeriod } from '../types';
import { SecureStorage } from '../services/SecureStorage';

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
  initialProfileTab?: 'profile' | 'settings' | 'wallpaper' | 'performance';
  onInstallPwa?: () => void;
  canInstall?: boolean;
  performanceSettings?: PerformanceSettings;
  onUpdatePerformance?: (settings: PerformanceSettings) => void;
  // Profile Photo Props
  customPhotoUrl?: string;
  onUpdateCustomPhoto?: (url: string) => void;
  useCustomPhoto?: boolean;
  onToggleCustomPhoto?: (enable: boolean) => void;
  // Period Selection
  periods?: SuapPeriod[];
  viewingPeriod?: SuapPeriod | null;
  onPeriodChange?: (semestre: string) => void;
}

const WALLPAPERS = [
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png",
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png",
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg",
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg"
];

const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

const GOOGLE_CLIENT_ID = "493737247808-0rv9jbldtskqdg78l122foess6h1t7ll.apps.googleusercontent.com";

const VIEW_ORDER = [
  ViewState.GRADES,
  ViewState.ABSENCES,
  ViewState.SCHEDULE,
  ViewState.CLASSROOM,
  ViewState.CONCLUSION,
  ViewState.ADMIN,
  ViewState.PROFILE
];

export const ContentView: React.FC<OverlayViewProps> = ({ view, onClose, onChangeView, isDarkMode, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, primaryColor, secondaryColor, userData, academicData, grades, schedule, completionData, onLogout, autoExpandClassroom, onAutoExpandClassroom, initialProfileTab, onInstallPwa, canInstall, performanceSettings, onUpdatePerformance, customPhotoUrl = '', onUpdateCustomPhoto, useCustomPhoto = false, onToggleCustomPhoto, periods, viewingPeriod, onPeriodChange }) => {
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

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (!isMobile) return;
    const { offset, velocity } = info;
    
    if (offset.y > 80 || (offset.y > 40 && velocity.y > 0.4)) {
        onClose();
        return;
    }

    if (Math.abs(offset.x) > 60 || Math.abs(velocity.x) > 0.4) {
        const currentIndex = VIEW_ORDER.indexOf(view);
        if (currentIndex === -1) return;

        if (offset.x < 0) {
            const nextIndex = currentIndex + 1;
            if (nextIndex < VIEW_ORDER.length) {
                if (VIEW_ORDER[nextIndex] === ViewState.ADMIN && !SecureStorage.isAdmin(userData?.matricula)) {
                     if (nextIndex + 1 < VIEW_ORDER.length) {
                         onChangeView(VIEW_ORDER[nextIndex + 1]);
                     }
                } else {
                    onChangeView(VIEW_ORDER[nextIndex]);
                }
            }
        } else {
            const prevIndex = currentIndex - 1;
            if (prevIndex >= 0) {
                 if (VIEW_ORDER[prevIndex] === ViewState.ADMIN && !SecureStorage.isAdmin(userData?.matricula)) {
                     if (prevIndex - 1 >= 0) {
                         onChangeView(VIEW_ORDER[prevIndex - 1]);
                     }
                 } else {
                    onChangeView(VIEW_ORDER[prevIndex]);
                 }
            }
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <motion.div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div 
        className={`${bgClass} shadow-2xl overflow-hidden absolute z-50 flex flex-col pointer-events-auto border ${borderClass}`}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        drag={isMobile} 
        dragDirectionLock={isMobile}
        dragConstraints={{ top: 0, bottom: isMobile ? 800 : 0, left: isMobile ? -300 : 0, right: isMobile ? 300 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ touchAction: 'none' }} 
      >
        {isMobile && (
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 absolute top-0 z-50 pointer-events-none">
                <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
            </div>
        )}

        {/* HEADER */}
        <motion.div 
            className={`h-24 md:h-20 border-b ${borderClass} flex items-center justify-between px-6 md:px-8 ${bgClass} shrink-0 relative pt-4 md:pt-0`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex-1 min-w-0 pr-4">
              <h2 className={`text-xl md:text-3xl font-black tracking-tight uppercase ${textClass} truncate max-w-[200px] md:max-w-none`}>
                {view === ViewState.GRADES ? 'Boletim' : 
                view === ViewState.ABSENCES ? 'Faltas e Frequência' : 
                view === ViewState.SCHEDULE ? 'Horário Semanal' :
                view === ViewState.CLASSROOM ? 'Google Classroom' :
                view === ViewState.CONCLUSION ? 'Progresso do Curso' :
                view === ViewState.ADMIN ? 'Painel Administrativo' :
                'Perfil e Ajustes'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                  <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${subTextClass} flex items-center gap-2`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-${primaryColor}-500 inline-block`} />
                    {userData?.nome_usual || 'Estudante'} 
                  </p>
                  
                  {/* SHOW PERIOD SELECTOR IN GRADES & ABSENCES & SCHEDULE */}
                  {(view === ViewState.GRADES || view === ViewState.ABSENCES || view === ViewState.SCHEDULE) && periods && periods.length > 0 && (
                      <div className="relative group ml-2">
                           <select 
                                value={viewingPeriod?.semestre} 
                                onChange={(e) => onPeriodChange?.(e.target.value)}
                                className={`appearance-none pl-2 pr-6 py-0.5 rounded-lg text-[10px] font-bold bg-transparent outline-none cursor-pointer transition-colors ${isDarkMode ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                           >
                               {periods.map(p => (
                                   <option key={p.semestre} value={p.semestre} className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
                                       {p.semestre}
                                   </option>
                               ))}
                           </select>
                           <ChevronDown size={10} className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-white/50' : 'text-gray-400'}`} />
                      </div>
                  )}
              </div>
          </div>
          <button 
            onClick={onClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors group shrink-0 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black'}`}
          >
            {isMobile ? (
                <ArrowRight size={20} className={`rotate-180 md:rotate-0`} /> 
            ) : (
                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            )}
          </button>
        </motion.div>

        {/* BODY */}
        <motion.div 
            className={`flex-1 overflow-y-auto p-4 md:p-8 ${innerBgClass} pb-24 md:pb-8`} 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            variants={contentContainerVariants}
            initial="hidden"
            animate="show"
            onPointerDownCapture={(e) => {
               if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                   e.stopPropagation();
               }
            }}
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
          {view === ViewState.ADMIN && <AdminContent isDark={isDarkMode} accentColor={primaryColor} />}
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
                performanceSettings={performanceSettings}
                onUpdatePerformance={onUpdatePerformance}
                customPhotoUrl={customPhotoUrl}
                onUpdateCustomPhoto={onUpdateCustomPhoto}
                useCustomPhoto={useCustomPhoto}
                onToggleCustomPhoto={onToggleCustomPhoto}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

const itemAnim = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const AdminContent = ({ isDark, accentColor }: { isDark: boolean, accentColor: string }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await SecureStorage.getAllUsers();
            setUsers(data);
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u => 
        u.id.toLowerCase().includes(filter.toLowerCase()) || 
        u.profile?.nome_usual?.toLowerCase().includes(filter.toLowerCase()) ||
        u.profile?.nome_completo?.toLowerCase().includes(filter.toLowerCase()) ||
        u.profile?.vinculo?.curso?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <motion.div variants={itemAnim} className={`p-6 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                        <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                            <Shield size={24} className={`text-${accentColor}-500`} /> 
                            Usuários Cadastrados
                        </h2>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                            Total de registros no banco de dados: <strong>{users.length}</strong>
                        </p>
                     </div>
                     <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-full md:w-auto ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                         <Search size={16} className="opacity-50" />
                         <input 
                            type="text" 
                            placeholder="Buscar por nome ou matrícula..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent outline-none text-xs font-bold w-full md:w-64"
                         />
                     </div>
                 </div>
            </motion.div>

            {loading ? (
                <div className="flex justify-center p-10 opacity-50 font-bold text-xs uppercase animate-pulse">Carregando usuários...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => {
                        const profile = user.profile as SuapProfile;
                        const academic = user.academic as SuapMeusDadosAluno;
                        const lastUpdate = new Date(user.updated_at).toLocaleDateString('pt-BR');
                        const photoUrl = profile?.foto 
                             ? (profile.foto.startsWith('http') ? profile.foto : `https://suap.ifrn.edu.br${profile.foto}`)
                             : DEFAULT_PROFILE_IMG;

                        return (
                            <motion.div variants={itemAnim} key={user.id} className={`p-4 rounded-[1.5rem] border flex items-center gap-4 relative overflow-hidden group ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-gray-100 hover:shadow-md'}`}>
                                <div className={`w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <img src={photoUrl} className="w-full h-full object-cover" alt="Avatar" onError={(e) => e.currentTarget.src = DEFAULT_PROFILE_IMG} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{profile?.nome_usual || 'Sem Nome'}</div>
                                    <div className="text-[10px] font-mono opacity-60 mb-1">{user.id}</div>
                                    <div className={`text-[9px] font-bold uppercase truncate px-2 py-0.5 rounded w-fit ${isDark ? `bg-${accentColor}-500/10 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`}`}>
                                        {profile?.vinculo?.curso || academic?.curso || 'Curso N/A'}
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-black'}`}>
                                        {lastUpdate}
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    );
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

const GradesContent = ({ isDark, primaryColor, secondaryColor, grades }: any) => {
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
            {grades.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                    <BookOpen size={40} className="mb-4" />
                    <span className="text-sm font-bold uppercase">Nenhuma nota encontrada para este período.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grades.map((g: any) => {
                        const avg = parseFloat(g.average);
                        const progress = isNaN(avg) ? 0 : avg;
                        
                        return (
                            <motion.div variants={itemAnim} key={g.code} className={`p-6 rounded-[2rem] border flex flex-col justify-between group hover:shadow-lg transition-all duration-300 relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100'}`}>
                                
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

                                <div className="grid grid-cols-4 gap-2 mb-6 z-10 relative">
                                    {[g.n1, g.n2, g.n3, g.n4].map((note: any, idx: number) => (
                                        <div key={idx} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                            <span className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">N{idx + 1}</span>
                                            <span className={`font-black ${note !== '-' ? (isDark ? 'text-white' : 'text-gray-800') : 'text-gray-400 opacity-50'}`}>{note}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto z-10 relative">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold uppercase text-gray-500">Média Parcial</span>
                                        <span className={`text-2xl font-black ${avg >= 60 ? `text-${primaryColor}-500` : (avg < 60 && g.average !== '-' ? `text-${secondaryColor}-500` : 'text-gray-400')}`}>
                                            {g.average}
                                        </span>
                                    </div>
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
            )}
        </div>
    );
};

const AbsencesContent = ({ isDark, primaryColor, secondaryColor, grades }: { isDark: boolean, primaryColor: string, secondaryColor: string, grades: GradeInfo[] }) => {
    const totalAbsences = grades.reduce((acc, g) => acc + g.absences, 0);
    const criticalSubjects = grades.filter(g => {
        const remaining = g.limit - g.absences;
        return remaining <= 4 && remaining >= 0;
    });
    const failedSubjects = grades.filter(g => g.absences > g.limit);
    
    const activeSubjects = grades.filter(g => g.absences <= g.limit);
    activeSubjects.sort((a, b) => (a.limit - a.absences) - (b.limit - b.absences));
    const lowestMarginSubject = activeSubjects[0];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
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
                            
                            <div className="relative w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ${isFailed ? `bg-${secondaryColor}-500` : (percentageUsed > 80 ? 'bg-orange-500' : `bg-${primaryColor}-500`)}`} 
                                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                                />
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

const ProfileContent = ({ isDark, onToggleTheme, currentWallpaper, onWallpaperChange, themeVariant, onThemeVariantChange, accentColor, secondaryColor, userData, academicData, grades, onLogout, autoExpandClassroom, onResetAutoExpand, initialTab, onInstallPwa, canInstall, performanceSettings, onUpdatePerformance, customPhotoUrl, onUpdateCustomPhoto, useCustomPhoto, onToggleCustomPhoto }: { 
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
    initialTab?: 'profile' | 'settings' | 'wallpaper' | 'performance',
    onInstallPwa?: () => void,
    canInstall?: boolean,
    performanceSettings?: PerformanceSettings,
    onUpdatePerformance?: (settings: PerformanceSettings) => void,
    customPhotoUrl?: string,
    onUpdateCustomPhoto?: (url: string) => void,
    useCustomPhoto?: boolean,
    onToggleCustomPhoto?: (enable: boolean) => void
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'wallpaper' | 'performance'>('profile');
    
    const [showPhotoInput, setShowPhotoInput] = useState(false);
    const [localPhotoInput, setLocalPhotoInput] = useState(customPhotoUrl || '');
    const [imgError, setImgError] = useState(false);

    const [customWpInput, setCustomWpInput] = useState('');

    useEffect(() => {
        setLocalPhotoInput(customPhotoUrl || '');
    }, [customPhotoUrl]);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    const handleSavePhoto = () => {
        onUpdateCustomPhoto?.(localPhotoInput);
        setShowPhotoInput(false);
    };

    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const apiKeyInputRef = useRef<HTMLInputElement>(null);

    const [classroomEnabled, setClassroomEnabled] = useState(false);
    const [classroomToken, setClassroomToken] = useState('');
    const [classroomStatus, setClassroomStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [manualTokenInput, setManualTokenInput] = useState('');
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
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

    useEffect(() => {
        if (autoExpandClassroom) {
            setActiveTab('settings');
            setClassroomEnabled(true);
            setTimeout(() => onResetAutoExpand(), 500);
        }
        if (initialTab === 'settings') {
             setTimeout(() => apiKeyInputRef.current?.focus(), 300);
        }
    }, [autoExpandClassroom, onResetAutoExpand, initialTab]);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        setKeySaved(false);
    };

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setKeySaved(true);
            setTimeout(() => setKeySaved(false), 2000);
        } else {
            localStorage.removeItem('gemini_api_key');
            setApiKey('');
        }
    };

    const handleCloudSync = async () => {
        if (!userData?.matricula) return;
        setSyncState('syncing');
        const success = await SecureStorage.syncToCloud(userData.matricula);
        if (success) {
            setSyncState('success');
            setTimeout(() => setSyncState('idle'), 2000);
        } else {
            setSyncState('error');
            setTimeout(() => setSyncState('idle'), 3000);
        }
    };

    const handleCloudRestore = async () => {
        if (!userData?.matricula) return;
        setSyncState('syncing');
        const success = await SecureStorage.syncFromCloud(userData.matricula);
        if (success) {
            setSyncState('success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            setSyncState('error');
            setTimeout(() => setSyncState('idle'), 3000);
        }
    };

    const toggleMotion = () => onUpdatePerformance?.({ ...performanceSettings!, reduceMotion: !performanceSettings?.reduceMotion });
    const toggleBlur = () => onUpdatePerformance?.({ ...performanceSettings!, disableBlur: !performanceSettings?.disableBlur });
    const toggleGlow = () => onUpdatePerformance?.({ ...performanceSettings!, disableGlow: !performanceSettings?.disableGlow });
    const toggleEcoMode = () => {
        const isActive = performanceSettings?.reduceMotion && performanceSettings?.disableBlur && performanceSettings?.disableGlow;
        onUpdatePerformance?.({
            reduceMotion: !isActive,
            disableBlur: !isActive,
            disableGlow: !isActive
        });
    }

    const getCleanCourseName = (raw: string) => {
        if (!raw) return 'Curso não identificado';
        let clean = raw.replace(/^\d+\s-\s/, '');
        clean = clean.split(' - Campus')[0];
        return clean;
    };
    
    const cardBg = isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100';
    const textMain = isDark ? 'text-white' : 'text-gray-900';

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

    const ToggleRow = ({ label, description, active, onClick, icon: Icon }: any) => (
        <div onClick={onClick} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${active ? `border-${accentColor}-500/30 bg-${accentColor}-500/5` : (isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-gray-100')}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? `bg-${accentColor}-500 text-white` : (isDark ? 'bg-white/10 text-gray-400' : 'bg-white text-gray-400 shadow-sm')}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <div className={`font-bold text-sm ${textMain}`}>{label}</div>
                    <div className="text-[10px] opacity-60 max-w-[200px]">{description}</div>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? `bg-${accentColor}-500` : 'bg-gray-300 dark:bg-white/10'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${active ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
        </div>
    );

    const suapPhotoPath = userData?.url_foto_150x200 || userData?.foto;
    const effectivePhoto = (useCustomPhoto && customPhotoUrl && !imgError)
        ? customPhotoUrl
        : (suapPhotoPath 
            ? (suapPhotoPath.startsWith('http') ? suapPhotoPath : `https://suap.ifrn.edu.br${suapPhotoPath}`)
            : DEFAULT_PROFILE_IMG);
    
    useEffect(() => setImgError(false), [useCustomPhoto, customPhotoUrl]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex gap-3 mb-8 shrink-0 overflow-x-auto pb-2 hide-scrollbar">
                <TabButton id="profile" label="Perfil" icon={User} />
                <TabButton id="settings" label="Configurações" icon={Settings} />
                <TabButton id="wallpaper" label="Papéis de Parede" icon={ImageIcon} />
                <TabButton id="performance" label="Desempenho" icon={Zap} />
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'profile' ? (
                     <motion.div 
                        key="profile"
                        variants={itemAnim}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full overflow-y-auto space-y-6 pb-12"
                    >
                        <div className={`relative overflow-hidden rounded-[2.5rem] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className={`absolute inset-0 h-32 bg-gradient-to-r from-${accentColor}-500/20 to-${accentColor}-500/5`} />
                            <div className="relative z-10 px-8 pt-12 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
                                <div className="relative group">
                                    <div className={`w-32 h-32 rounded-[2rem] p-1.5 ${isDark ? 'bg-slate-900' : 'bg-white shadow-lg'} rotate-3 transition-transform group-hover:rotate-0`}>
                                        <img src={effectivePhoto} onError={() => setImgError(true)} className={`w-full h-full rounded-[1.7rem] object-cover border-2 ${isDark ? 'border-white/10' : 'border-gray-100'}`} alt="Profile"/>
                                    </div>
                                    <button onClick={() => setShowPhotoInput(!showPhotoInput)} className={`absolute bottom-0 right-0 p-2.5 rounded-xl shadow-lg transition-transform hover:scale-110 active:scale-90 ${isDark ? `bg-${accentColor}-500 text-white` : `bg-white text-${accentColor}-600`}`}>
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <div className="text-center md:text-left flex-1 pb-2 min-w-0 w-full">
                                    <h2 className={`text-3xl md:text-4xl font-black tracking-tight leading-none mb-2 truncate ${textMain}`}>{userData?.nome_usual || 'Estudante'}</h2>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider border ${isDark ? 'bg-black/40 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>{userData?.matricula}</span>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${academicData?.situacao?.includes('Matriculado') ? `bg-${accentColor}-500/10 text-${accentColor}-500` : 'bg-gray-100 text-gray-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${academicData?.situacao?.includes('Matriculado') ? `bg-${accentColor}-500` : 'bg-gray-400'}`} />
                                            {academicData?.situacao || 'Status Desconhecido'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {showPhotoInput && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`px-8 pb-8 overflow-hidden`}>
                                        <div className="flex flex-col gap-3">
                                            {localPhotoInput && (
                                                <div className="flex justify-center pb-2">
                                                    <div className={`relative w-20 h-20 rounded-2xl border-2 border-dashed p-1 flex items-center justify-center ${isDark ? 'border-white/20' : 'border-gray-300'}`}>
                                                         <img src={localPhotoInput} className="relative z-10 w-full h-full rounded-xl object-cover bg-transparent" alt="Preview" onError={(e) => e.currentTarget.style.display = 'none'} onLoad={(e) => e.currentTarget.style.display = 'block'} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`p-4 rounded-2xl border flex gap-2 ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                                <input type="text" placeholder="Cole a URL da sua foto..." value={localPhotoInput} onChange={(e) => setLocalPhotoInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSavePhoto(); }} className={`flex-1 bg-transparent outline-none text-xs font-bold ${isDark ? 'text-white placeholder:text-gray-600' : 'text-gray-800 placeholder:text-gray-400'}`} />
                                                <button onClick={handleSavePhoto} className={`p-2 rounded-lg ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}><Check size={14} /></button>
                                            </div>
                                            <div onClick={() => onToggleCustomPhoto?.(!useCustomPhoto)} className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${useCustomPhoto ? `border-${accentColor}-500/30 bg-${accentColor}-500/5` : (isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100')}`}>
                                                <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Usar foto personalizada</span>
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${useCustomPhoto ? `bg-${accentColor}-500` : 'bg-gray-400 dark:bg-white/20'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${useCustomPhoto ? 'translate-x-6' : 'translate-x-1'}`} /></div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={`p-6 rounded-[2rem] border relative overflow-hidden group ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2 relative z-10"><BookOpen size={14} /> Dados Acadêmicos</h3>
                                <div className="space-y-5 relative z-10">
                                    <div><label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Curso</label><div className={`text-sm font-bold leading-snug ${textMain}`}>{getCleanCourseName(academicData?.curso || '')}</div></div>
                                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Matriz</label><div className={`text-xs font-mono opacity-80 ${textMain}`}>{academicData?.matriz?.split(' - ')[0] || '-'}</div></div><div><label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Campus</label><div className={`text-xs opacity-80 ${textMain}`}>{userData?.campus}</div></div></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'wallpaper' ? (
                    <motion.div key="wallpaper" variants={itemAnim} initial="hidden" animate="show" exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                        <div className="space-y-6 pb-6">
                            <div className={`p-6 rounded-[2rem] border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <Link2 size={14} /> URL Personalizada
                                </h3>
                                <div className="flex gap-3">
                                     <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                         <ImageIcon size={16} className="text-gray-400" />
                                         <input 
                                            type="text" 
                                            value={customWpInput}
                                            onChange={(e) => setCustomWpInput(e.target.value)}
                                            placeholder="Cole o link da imagem..."
                                            className={`bg-transparent outline-none text-xs font-bold w-full ${isDark ? 'text-white' : 'text-gray-900'}`}
                                         />
                                     </div>
                                     <button 
                                        onClick={() => {
                                            if(customWpInput) {
                                                onWallpaperChange?.(customWpInput);
                                            }
                                        }}
                                        className={`px-5 rounded-xl font-bold text-xs transition-all ${isDark ? `bg-${accentColor}-500 text-white hover:bg-${accentColor}-400` : `bg-${accentColor}-500 text-white hover:bg-${accentColor}-600`}`}
                                     >
                                        Aplicar
                                     </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        </div>
                    </motion.div>
                ) : activeTab === 'performance' ? (
                    <motion.div key="performance" variants={itemAnim} initial="hidden" animate="show" exit={{ opacity: 0 }} className="h-full overflow-y-auto max-w-2xl mx-auto w-full">
                         <div className="space-y-6 pb-8">
                            <div className={`p-6 rounded-[2rem] border text-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                <h2 className="text-xl font-black mb-2">Otimização de Desempenho</h2>
                                <p className="text-sm opacity-60 max-w-md mx-auto">Ajuste os efeitos visuais para economizar bateria ou melhorar a fluidez em dispositivos mais antigos.</p>
                                <div className="mt-6 flex justify-center">
                                     <button onClick={toggleEcoMode} className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${performanceSettings?.reduceMotion && performanceSettings?.disableBlur && performanceSettings?.disableGlow ? `bg-${accentColor}-500 text-white shadow-lg` : `bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300`}`}>
                                        <Zap size={16} className={performanceSettings?.reduceMotion && performanceSettings?.disableBlur && performanceSettings?.disableGlow ? 'fill-current' : ''} />
                                        {performanceSettings?.reduceMotion && performanceSettings?.disableBlur && performanceSettings?.disableGlow ? 'Modo Econômico Ativado' : 'Ativar Modo Econômico'}
                                     </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <ToggleRow label="Reduzir Movimento" description="Desativa animações de transição para uma navegação mais direta." icon={Rocket} active={performanceSettings?.reduceMotion} onClick={toggleMotion} />
                                <ToggleRow label="Desativar Transparência" description="Substitui o efeito de vidro (blur) por fundos sólidos. Melhora muito o FPS." icon={Droplet} active={performanceSettings?.disableBlur} onClick={toggleBlur} />
                                <ToggleRow label="Desativar Efeitos Visuais" description="Remove brilhos, sombras complexas e orbs de fundo." icon={Sparkles} active={performanceSettings?.disableGlow} onClick={toggleGlow} />
                            </div>
                         </div>
                    </motion.div>
                ) : (
                    <motion.div key="settings" variants={itemAnim} initial="hidden" animate="show" exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20 md:pb-6">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Aparência</h3>
                                    <div className={`${cardBg} rounded-3xl p-2 border shadow-sm flex mb-4`}>
                                        <button onClick={() => isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${!isDark ? 'bg-white shadow-md text-black' : 'text-gray-400 hover:text-white'}`}><Sun size={20} className={!isDark ? 'text-orange-500' : ''} /><span className="font-bold text-sm">Claro</span></button>
                                        <button onClick={() => !isDark && onToggleTheme?.()} className={`flex-1 p-4 rounded-[1.3rem] flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 shadow-md text-white' : 'text-gray-400 hover:text-gray-900'}`}><Moon size={20} className={isDark ? 'text-blue-400' : ''} /><span className="font-bold text-sm">Escuro</span></button>
                                    </div>
                                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 px-2">Estilo Visual</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <VariantButton variant="dynamic" label="Dinâmico" icon={Aperture} />
                                        <VariantButton variant="monochrome" label="Mono" icon={Droplet} />
                                        <VariantButton variant="saturated" label="Neon" icon={Palette} />
                                        <VariantButton variant="sepia" label="Sépia" icon={Coffee} />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Sistema</h3>
                                    <div className={`p-4 mb-4 rounded-[2rem] border flex items-center justify-between transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`}`}><Cloud size={20} /></div><div><div className="font-bold text-sm">Nuvem Supaco</div><div className="text-[10px] opacity-70">{syncState === 'syncing' ? 'Sincronizando...' : syncState === 'success' ? 'Backup realizado' : syncState === 'error' ? 'Erro no backup' : 'Sincronizar dados'}</div></div></div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCloudRestore} disabled={syncState === 'syncing'} className={`p-2 rounded-xl border border-dashed transition-all ${isDark ? 'border-white/20 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-50'}`} title="Restaurar"><Download size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} /></button>
                                            <button onClick={handleCloudSync} disabled={syncState === 'syncing'} className={`p-2 rounded-xl transition-all ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400 hover:bg-${accentColor}-500/30` : `bg-${accentColor}-100 text-${accentColor}-600 hover:bg-${accentColor}-200`}`} title="Salvar">{syncState === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}</button>
                                        </div>
                                    </div>
                                    <div className={`${cardBg} rounded-[2rem] border shadow-sm overflow-hidden transition-all duration-300`}>
                                        <div className={`p-6 flex items-center justify-between ${classroomEnabled ? (isDark ? 'border-b border-white/5' : 'border-b border-gray-100') : ''}`}>
                                            <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${classroomEnabled ? `bg-${accentColor}-500 text-white` : (isDark ? `bg-${accentColor}-500/10 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-600`)}`}><Monitor size={24} /></div><div><div className={`font-bold text-base ${textMain}`}>Classroom</div><div className="text-xs text-gray-400">Sincronizar tarefas e avisos</div></div></div>
                                            <button onClick={() => setClassroomEnabled(!classroomEnabled)} className={`text-4xl transition-colors relative z-10 ${classroomEnabled ? `text-${accentColor}-500` : 'text-gray-300'}`}>{classroomEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}</button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Conta</h3>
                                    <button onClick={onLogout} className={`w-full p-4 rounded-[2rem] border flex items-center justify-between group transition-all ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100'}`}>
                                        <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}><LogOut size={20} /></div><div className="text-left"><div className="font-bold text-sm">Sair do SUAP</div><div className="text-[10px] opacity-70">Encerrar sessão atual</div></div></div><ArrowRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col h-full">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Inteligência Artificial</h3>
                                <div className={`${cardBg} rounded-[2rem] border shadow-sm p-8 relative overflow-hidden flex-1 min-h-[320px]`}>
                                    <div className={`absolute -right-10 -bottom-10 w-48 h-48 bg-${accentColor}-500/10 rounded-full blur-3xl pointer-events-none`} />
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-50 text-${accentColor}-500`}`}><Cpu size={28} /></div><div><div className={`font-bold text-lg ${textMain}`}>Gemini 2.5 Flash</div><div className="text-xs text-gray-400">Assistente Virtual</div></div></div>
                                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 ${isDark ? `bg-${accentColor}-500/20 text-${accentColor}-400` : `bg-${accentColor}-100 text-${accentColor}-600`}`}><ShieldCheck size={12} />Ativo</div>
                                    </div>
                                    <div className="relative z-10 space-y-6">
                                        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block flex items-center gap-2"><Key size={12} />Chave de API (Google AI Studio)</label>
                                            <div className="relative">
                                                <input ref={apiKeyInputRef} type={showKey ? "text" : "password"} value={apiKey} onChange={handleApiKeyChange} placeholder="Cole sua API Key aqui..." className={`w-full bg-transparent border-b px-2 py-2 text-sm font-mono tracking-wider outline-none transition-colors ${isDark ? `border-white/10 focus:border-${accentColor}-500 text-white placeholder:text-white/20` : `border-gray-200 focus:border-${accentColor}-500 text-gray-800 placeholder:text-gray-400`}`} />
                                                <button onClick={() => setShowKey(!showKey)} className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-${accentColor}-500 transition-colors`}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                            </div>
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveApiKey} className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${keySaved ? 'bg-green-500 text-white shadow-green-500/20' : `bg-${accentColor}-500 text-white shadow-${accentColor}-500/20`}`}>{keySaved ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar Chave</>}</motion.button>
                                            <div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-gray-500">{localStorage.getItem('gemini_api_key') ? 'Chave personalizada salva localmente.' : 'Nenhuma chave salva.'}</span>{localStorage.getItem('gemini_api_key') && (<button onClick={() => { setApiKey(''); localStorage.removeItem('gemini_api_key'); }} className="text-[10px] font-bold text-red-400 hover:text-red-500">LIMPAR</button>)}</div>
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