import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { supabase } from './services/supabaseClient';
import { WifiOff, RefreshCw, AlertTriangle, X } from 'lucide-react';

import { SplashScreen } from './components/SplashScreen';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapDiario, SuapBoletim, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse, PerformanceSettings, SuapMeusPeriodosLetivos, TodoItem, GoogleTokens, UserPreferences } from './types';

// --- DYNAMIC IMPORTS (Code Splitting) ---
// We handle named exports by destructuring the module in the promise result.
const DashboardLayout = React.lazy(() => import('./components/DashboardLayout').then(module => ({ default: module.DashboardLayout })));
const ContentView = React.lazy(() => import('./components/ContentViews').then(module => ({ default: module.ContentView })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const MobileNavBar = React.lazy(() => import('./components/MobileNavBar').then(module => ({ default: module.MobileNavBar })));
const TutorialOverlay = React.lazy(() => import('./components/TutorialOverlay').then(module => ({ default: module.TutorialOverlay })));
const PremiumModal = React.lazy(() => import('./components/PremiumModal').then(module => ({ default: module.PremiumModal })));
const AIChatWidget = React.lazy(() => import('./components/AIChatWidget').then(module => ({ default: module.AIChatWidget })));
const PomodoroWidget = React.lazy(() => import('./components/PomodoroWidget').then(module => ({ default: module.PomodoroWidget })));

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// --- INTERNAL CONFIG ---
const SUPACO_INTERNAL_KEY = process.env.API_KEY || "AIzaSyD-PREMIUM-PLACEHOLDER-KEY-FOR-SUPACO-APP";

// --- GOOGLE OAUTH CONFIG ---
// IMPORTANT: You must add your Client ID and Client Secret here.
// For production, these should be environment variables.
const GOOGLE_CLIENT_ID = '493737247808-0rv9jbldtskqdg78l122foess6h1t7ll.apps.googleusercontent.com'; 
const GOOGLE_CLIENT_SECRET = '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'; 
const REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:5173/' : 'https://supaco.vercel.app/';

// Cache Keys (Settings only - Data is now in SecureStorage)
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    PERFORMANCE: 'suap_performance_settings',
    PRIVACY_MODE: 'suap_privacy_mode',
    START_VIEW: 'suap_start_view',
    NOTIFICATIONS_ENABLED: 'suap_notifications_enabled',
    WELCOME_SEEN: 'suap_welcome_seen',
    TUTORIAL_SEEN: 'suap_tutorial_completed_v1',
    IS_PREMIUM: 'suap_user_is_premium' 
};

const DEFAULT_PERFORMANCE: PerformanceSettings = {
    reduceMotion: false,
    disableBlur: false,
    disableGlow: false
};

// Define palette structure
interface Palette {
    primary: string;   // Replaces 'Green' (Success, Status, Progress)
    secondary: string; // Replaces 'Red' (Warnings, Danger, Alerts)
}

// Wallpaper to Palette Map
const WALLPAPER_THEMES: Record<string, Palette> = {
    // Original Defaults
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png": { primary: "rose", secondary: "pink" },
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png": { primary: "amber", secondary: "orange" },
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg": { primary: "slate", secondary: "zinc" },
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg": { primary: "orange", secondary: "red" },

    // New Custom Wallpapers
    "https://images.alphacoders.com/135/thumb-1920-1350151.png": { primary: "indigo", secondary: "violet" }, 
    "https://images8.alphacoders.com/134/thumb-1920-1345659.png": { primary: "red", secondary: "orange" }, 
    "https://images.alphacoders.com/644/thumb-1920-644146.jpg": { primary: "cyan", secondary: "sky" }, 
    "https://images8.alphacoders.com/135/thumb-1920-1351412.png": { primary: "pink", secondary: "rose" }, 
    "https://images7.alphacoders.com/135/thumb-1920-1359055.png": { primary: "red", secondary: "zinc" }, 
    "https://images6.alphacoders.com/135/thumb-1920-1351414.png": { primary: "sky", secondary: "blue" }, 
    "https://images6.alphacoders.com/134/thumb-1920-1345656.png": { primary: "orange", secondary: "amber" }, 
    "https://images7.alphacoders.com/966/thumb-1920-966372.jpg": { primary: "purple", secondary: "slate" }, 
    "https://images4.alphacoders.com/138/thumb-1920-1383047.jpg": { primary: "violet", secondary: "indigo" }, 
    "https://images8.alphacoders.com/138/thumb-1920-1382989.png": { primary: "blue", secondary: "cyan" }, 
    "https://images6.alphacoders.com/132/thumb-1920-1323578.png": { primary: "slate", secondary: "gray" } 
};

// TUTORIAL STEPS CONFIGURATION
const TUTORIAL_STEPS: any[] = [
    {
        targetId: 'tut-carousel', 
        mobileTargetId: 'tut-carousel',
        title: 'Visão Geral',
        description: 'Aqui ficam seus cartões principais. Deslize para ver horários, feriados e tarefas pendentes de forma rápida.',
        position: 'right',
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
    },
    {
        targetId: 'tut-nav-desktop',
        mobileTargetId: 'tut-nav-mobile',
        title: 'Navegação',
        description: 'Acesse suas notas detalhadas, faltas, grade de horários e integração com o Google Classroom por aqui.',
        position: 'right', 
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 2 11 3 11"/></svg></div>
    },
    {
        targetId: 'tut-profile',
        mobileTargetId: 'tut-profile-mobile',
        title: 'Perfil & Ajustes',
        description: 'Toque na sua foto para ver estatísticas, personalizar temas, wallpapers e instalar o aplicativo.',
        position: 'left',
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
    }
];

export default function App() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- DATA STATES ---
  const [userData, setUserData] = useState<SuapProfile | null>(null);
  const [academicData, setAcademicData] = useState<SuapMeusDadosAluno | null>(null);
  const [periods, setPeriods] = useState<SuapPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<SuapPeriod | null>(null);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [schedule, setSchedule] = useState<ProcessedClass[]>([]);
  const [completionData, setCompletionData] = useState<SuapCompletionData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // --- CLASSROOM STATES ---
  const [classroomWork, setClassroomWork] = useState<ClassroomWork[]>([]);
  const [classroomStatus, setClassroomStatus] = useState<'connected'|'disconnected'|'expired'>('disconnected');

  // --- PREFERENCES STATES ---
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>('dynamic');
  const [currentWallpaper, setCurrentWallpaper] = useState(DEFAULT_WALLPAPER);
  const [palette, setPalette] = useState<Palette>(WALLPAPER_THEMES[DEFAULT_WALLPAPER] || { primary: "blue", secondary: "red" });
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [useCustomPhoto, setUseCustomPhoto] = useState(false);
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>(DEFAULT_PERFORMANCE);
  const [rightTab, setRightTab] = useState<'overview' | 'tasks' | 'holidays' | 'achievements'>('overview');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  
  // --- NEW SETTINGS ---
  const [privacyMode, setPrivacyMode] = useState(false);
  const [startView, setStartView] = useState<ViewState>(ViewState.DASHBOARD);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoExpandClassroom, setAutoExpandClassroom] = useState(false);

  // --- REFS ---
  const initialLoadDone = useRef(false);

  // --- EFFECTS ---

  // 1. Initial Load & Auth Check
  useEffect(() => {
    const initApp = async () => {
        // Load basic cached preferences immediately for fast UI
        const savedWallpaper = localStorage.getItem(CACHE_KEYS.WALLPAPER);
        const savedThemeMode = localStorage.getItem(CACHE_KEYS.THEME_MODE);
        const savedVariant = localStorage.getItem(CACHE_KEYS.THEME_VARIANT);
        const savedPerf = localStorage.getItem(CACHE_KEYS.PERFORMANCE);
        const savedPrivacy = localStorage.getItem(CACHE_KEYS.PRIVACY_MODE);
        const savedStartView = localStorage.getItem(CACHE_KEYS.START_VIEW);
        const savedNotif = localStorage.getItem(CACHE_KEYS.NOTIFICATIONS_ENABLED);
        const premiumStatus = localStorage.getItem(CACHE_KEYS.IS_PREMIUM) === 'true';
        
        if (savedWallpaper) {
            setCurrentWallpaper(savedWallpaper);
            if (WALLPAPER_THEMES[savedWallpaper]) setPalette(WALLPAPER_THEMES[savedWallpaper]);
        }
        if (savedThemeMode) setIsDarkMode(savedThemeMode === 'dark');
        if (savedVariant) setThemeVariant(savedVariant as ThemeVariant);
        if (savedPerf) setPerformanceSettings(JSON.parse(savedPerf));
        if (savedPrivacy) setPrivacyMode(savedPrivacy === 'true');
        if (savedStartView) setStartView(savedStartView as ViewState);
        if (savedNotif) setNotificationsEnabled(savedNotif !== 'false');
        setIsPremium(premiumStatus);

        // Check Login
        const token = localStorage.getItem('suap_access_token');
        const user = localStorage.getItem('suap_username'); // matricula

        if (token && user) {
            // Try to load data from SecureStorage (Local Cache) first
            const cachedProfile = SecureStorage.loadItem(user, 'profile');
            if (cachedProfile) {
                setUserData(cachedProfile);
                setIsLoggedIn(true);
                // Load other cached data
                const cachedAcademic = SecureStorage.loadItem(user, 'academic');
                const cachedGrades = SecureStorage.loadItem(user, 'grades');
                const cachedSchedule = SecureStorage.loadItem(user, 'schedule');
                const cachedCompletion = SecureStorage.loadItem(user, 'completion');
                const cachedTodos = SecureStorage.loadItem(user, 'todos');
                
                if (cachedAcademic) setAcademicData(cachedAcademic);
                if (cachedGrades) setGrades(cachedGrades);
                if (cachedSchedule) setSchedule(cachedSchedule);
                if (cachedCompletion) setCompletionData(cachedCompletion);
                if (cachedTodos) setTodos(cachedTodos);
                
                // Load Cloud Preferences if available and newer
                // We do this in background to not block UI
                SecureStorage.syncFromCloud(user).then((result) => {
                     if (result.hasData && result.preferences) {
                         // Update state with cloud preferences
                         const p = result.preferences;
                         if(p.visual?.wallpaper) updateWallpaper(p.visual.wallpaper);
                         if(p.visual?.themeMode) setIsDarkMode(p.visual.themeMode === 'dark');
                         if(p.visual?.themeVariant) setThemeVariant(p.visual.themeVariant);
                         if(p.visual?.customPhotoUrl) setCustomPhotoUrl(p.visual.customPhotoUrl);
                         setUseCustomPhoto(!!p.visual?.useCustomPhoto);
                         if(p.performance) setPerformanceSettings(p.performance);
                         if(p.privacy) setPrivacyMode(p.privacy.privacyMode);
                         if(p.behavior?.startView) setStartView(p.behavior.startView);
                         if(p.notifications) setNotificationsEnabled(p.notifications.enabled);
                     }
                     // Re-check premium status on cloud
                     SecureStorage.checkSubscriptionStatus(user).then(isPrem => {
                         setIsPremium(isPrem);
                         localStorage.setItem(CACHE_KEYS.IS_PREMIUM, String(isPrem));
                     });
                });

                // Also fetch Classroom Data if tokens exist
                const gTokens = SecureStorage.loadItem(user, 'google_tokens');
                if (gTokens) {
                    refreshClassroomData(gTokens);
                }
            } else {
                // No cache? Fetch from SUAP
                await fetchUserData(token, user);
            }
        }

        // Show Tutorial if first time
        const tutorialSeen = localStorage.getItem(CACHE_KEYS.TUTORIAL_SEEN);
        if (isLoggedIn && !tutorialSeen) {
            setTimeout(() => setShowTutorial(true), 2000);
        }

        // Apply Start View if logged in
        if (isLoggedIn && savedStartView) {
             setView(savedStartView as ViewState);
        }

        // Simulate Loading Time for Splash
        setTimeout(() => setIsLoading(false), 2000);
        initialLoadDone.current = true;
    };

    initApp();

    // Online/Offline Listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Persist Preferences when changed
  useEffect(() => {
     if (!initialLoadDone.current) return;
     localStorage.setItem(CACHE_KEYS.THEME_MODE, isDarkMode ? 'dark' : 'light');
     localStorage.setItem(CACHE_KEYS.THEME_VARIANT, themeVariant);
     localStorage.setItem(CACHE_KEYS.PERFORMANCE, JSON.stringify(performanceSettings));
     localStorage.setItem(CACHE_KEYS.PRIVACY_MODE, String(privacyMode));
     localStorage.setItem(CACHE_KEYS.START_VIEW, startView);
     localStorage.setItem(CACHE_KEYS.NOTIFICATIONS_ENABLED, String(notificationsEnabled));
     
     // Auto Sync to Cloud if user is logged in (Debounced ideally, but direct for now)
     if (userData?.matricula) {
         const prefs: UserPreferences = {
             visual: { themeMode: isDarkMode ? 'dark' : 'light', themeVariant, wallpaper: currentWallpaper, customPhotoUrl, useCustomPhoto },
             performance: performanceSettings,
             privacy: { privacyMode },
             behavior: { startView, autoExpandClassroom },
             notifications: { enabled: notificationsEnabled, gradeAlerts: true, absenceAlerts: true },
             widgets: { pomodoro: JSON.parse(localStorage.getItem('supaco_pomodoro_settings') || '{}') }
         };
         // We don't await here to not block UI
         SecureStorage.syncToCloud(userData.matricula, prefs);
     }
  }, [isDarkMode, themeVariant, currentWallpaper, customPhotoUrl, useCustomPhoto, performanceSettings, privacyMode, startView, notificationsEnabled, autoExpandClassroom, userData]);


  // --- API ACTIONS ---

  const fetchUserData = async (token: string, matricula: string) => {
      try {
          const headers = { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json', 
            'Accept': 'application/json' 
          };

          // 1. Profile
          const profileRes = await fetch('https://suap.ifrn.edu.br/api/minhas-informacoes/meus-dados/', { headers });
          if (!profileRes.ok) throw new Error('Falha ao carregar perfil');
          const profileData: SuapProfile = await profileRes.json();
          setUserData(profileData);
          SecureStorage.saveItem(matricula, 'profile', profileData);

          // 2. Periods
          const periodsRes = await fetch('https://suap.ifrn.edu.br/api/ensino/periodos-letivos/', { headers });
          if (periodsRes.ok) {
              const periodsData = await periodsRes.json();
              // Sort desc and take top 4
              const sorted = (periodsData.results || []).sort((a: any, b: any) => b.ano_letivo - a.ano_letivo || b.periodo_letivo - a.periodo_letivo).slice(0, 4);
              const mappedPeriods: SuapPeriod[] = sorted.map((p: any) => ({ id: 0, semestre: `${p.ano_letivo}.${p.periodo_letivo}` }));
              setPeriods(mappedPeriods);
              
              // Select current period (first one usually)
              if (mappedPeriods.length > 0) {
                  const current = mappedPeriods[0];
                  setSelectedPeriod(current);
                  // Fetch data for this period
                  await fetchPeriodData(token, matricula, current.semestre);
              }
          }
          
          setIsLoggedIn(true);
      } catch (error) {
          console.error("Error fetching initial data", error);
          if (localStorage.getItem('suap_access_token')) {
              // Token might be expired
              alert("Sessão expirada. Por favor, faça login novamente.");
              handleLogout();
          }
      }
  };

  const fetchPeriodData = async (token: string, matricula: string, semestre: string) => {
      try {
          const headers = { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          
          // 1. Grades (Boletim)
          const gradesRes = await fetch(`https://suap.ifrn.edu.br/api/ensino/boletim/${semestre}/`, { headers });
          if (gradesRes.ok) {
              const gradesData: SuapBoletim[] = await gradesRes.json();
              
              // Process Grades
              const processedGrades: GradeInfo[] = gradesData.map(g => ({
                  subject: g.disciplina.replace(/(^|\s)\S/g, l => l.toUpperCase()), // Title Case
                  code: g.codigo_diario,
                  status: g.situacao,
                  n1: g.nota_etapa_1?.nota || '-',
                  n2: g.nota_etapa_2?.nota || '-',
                  n3: g.nota_etapa_3?.nota || '-',
                  n4: g.nota_etapa_4?.nota || '-',
                  finalGrade: g.nota_avaliacao_final?.nota || '-',
                  average: g.media_disciplina || '-',
                  frequency: g.percentual_carga_horaria_frequentada || 0,
                  absences: g.numero_faltas || 0,
                  limit: Math.floor((g.carga_horaria * 0.25)), // 25% allowance
                  totalHours: g.carga_horaria
              }));
              setGrades(processedGrades);
              SecureStorage.saveItem(matricula, 'grades', processedGrades);
          }

          // 2. Schedule (Turmas Virtuais -> Horários)
          // Since there is no direct "Schedule" endpoint that is easy, we assume we get it from /minhas-turmas/ or similar
          // For now, using the cached schedule or empty if not implemented deeply in this snippet
          // *In a real app, this would parse the 'diarios' endpoint*
          
          // Mock fetch for Academic Data (Meus Dados)
          const academicRes = await fetch('https://suap.ifrn.edu.br/api/ensino/meus-dados/', { headers });
          if (academicRes.ok) {
              const acData = await academicRes.json();
              setAcademicData(acData);
              SecureStorage.saveItem(matricula, 'academic', acData);
          }

          // Completion Data (Progresso)
          // Not available in standard API easily, often scraped or calculated. 
          // We will use a placeholder or check if cached.
          const cachedCompletion = SecureStorage.loadItem(matricula, 'completion');
          if (cachedCompletion) setCompletionData(cachedCompletion);

      } catch (e) {
          console.error("Error fetching period data", e);
      }
  };

  const updateWallpaper = (url: string) => {
      setCurrentWallpaper(url);
      localStorage.setItem(CACHE_KEYS.WALLPAPER, url);
      if (WALLPAPER_THEMES[url]) {
          setPalette(WALLPAPER_THEMES[url]);
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('suap_access_token');
      localStorage.removeItem('suap_refresh_token');
      localStorage.removeItem('suap_username');
      setUserData(null);
      setIsLoggedIn(false);
      setGrades([]);
      setSchedule([]);
      setView(ViewState.DASHBOARD);
  };

  // --- GOOGLE CLASSROOM INTEGRATION ---
  
  const initiateGoogleAuth = () => {
      if ((GOOGLE_CLIENT_ID as string) === 'YOUR_GOOGLE_CLIENT_ID') {
           alert("Configuração de API Pendente. Adicione o Client ID no código.");
           return;
      }

      const scope = encodeURIComponent('https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly');
      // Using 'token' response type for implicit flow (simpler for client-side without backend)
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scope}&prompt=consent`;
      
      window.location.href = authUrl;
  };

  // Handle OAuth Redirect
  useEffect(() => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const expiresIn = params.get('expires_in');
          
          if (accessToken && userData?.matricula) {
              const tokens: GoogleTokens = {
                  access_token: accessToken,
                  expiry_date: Date.now() + (Number(expiresIn) * 1000)
              };
              SecureStorage.saveItem(userData.matricula, 'google_tokens', tokens);
              
              // Clear URL
              window.history.replaceState({}, document.title, window.location.pathname);
              
              refreshClassroomData(tokens);
          }
      }
  }, [userData]);

  const refreshClassroomData = async (tokens: GoogleTokens) => {
      if (!tokens.access_token) return;
      if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
          setClassroomStatus('expired');
          return;
      }

      setClassroomStatus('connected');
      
      try {
          // 1. Fetch Courses
          const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
              headers: { 'Authorization': `Bearer ${tokens.access_token}` }
          });
          
          if (!coursesRes.ok) {
              if (coursesRes.status === 401) setClassroomStatus('expired');
              return;
          }
          
          const coursesData = await coursesRes.json();
          const courses: ClassroomCourse[] = coursesData.courses || [];
          
          // 2. Fetch Work for each course
          let allWork: ClassroomWork[] = [];
          
          await Promise.all(courses.map(async (course) => {
              const workRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate`, {
                  headers: { 'Authorization': `Bearer ${tokens.access_token}` }
              });
              
              if (workRes.ok) {
                  const workData = await workRes.json();
                  if (workData.courseWork) {
                      const works = workData.courseWork.map((w: any) => {
                           // Construct Date Object
                           let jsDate = undefined;
                           if (w.dueDate) {
                               jsDate = new Date(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day, w.dueTime?.hours || 23, w.dueTime?.minutes || 59);
                           }
                           
                           return {
                               ...w,
                               courseName: course.name,
                               jsDate: jsDate
                           };
                      });
                      allWork = [...allWork, ...works];
                  }
              }
          }));

          // Sort by Date
          allWork.sort((a, b) => {
              if (!a.jsDate) return 1;
              if (!b.jsDate) return -1;
              return a.jsDate.getTime() - b.jsDate.getTime();
          });

          setClassroomWork(allWork);

      } catch (error) {
          console.error("Classroom fetch error", error);
      }
  };


  // --- TODOS ---
  const handleAddTodo = (text: string) => {
      const newTodo: TodoItem = { id: Date.now().toString(), text, completed: false };
      const updated = [newTodo, ...todos];
      setTodos(updated);
      if (userData?.matricula) SecureStorage.saveItem(userData.matricula, 'todos', updated);
  };
  
  const handleToggleTodo = (id: string) => {
      const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setTodos(updated);
      if (userData?.matricula) SecureStorage.saveItem(userData.matricula, 'todos', updated);
  };

  const handleRemoveTodo = (id: string) => {
      const updated = todos.filter(t => t.id !== id);
      setTodos(updated);
      if (userData?.matricula) SecureStorage.saveItem(userData.matricula, 'todos', updated);
  };


  if (isLoading) return <SplashScreen />;

  return (
    <>
      {isLoggedIn ? (
        <Suspense fallback={<SplashScreen />}>
            <DashboardLayout 
                currentView={view} 
                onChangeView={setView} 
                isDarkMode={isDarkMode} 
                onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                currentWallpaper={currentWallpaper}
                primaryColor={palette.primary}
                secondaryColor={palette.secondary}
                isLoggedIn={isLoggedIn}
                onLogin={() => {}} 
                userData={userData}
                academicData={academicData}
                currentPeriod={selectedPeriod}
                grades={grades}
                schedule={schedule}
                completionData={completionData}
                holidays={holidays}
                classroomWork={classroomWork}
                rightTab={rightTab}
                onRightTabChange={setRightTab}
                onOpenSettings={() => setView(ViewState.PROFILE)}
                userPhoto={
                    useCustomPhoto && customPhotoUrl 
                    ? customPhotoUrl 
                    : (userData?.url_foto_150x200 
                        ? (userData.url_foto_150x200.startsWith('http') ? userData.url_foto_150x200 : `https://suap.ifrn.edu.br${userData.url_foto_150x200}`) 
                        : DEFAULT_PROFILE_IMG)
                }
                onRefresh={() => {
                    if (userData?.matricula) {
                       const token = localStorage.getItem('suap_access_token');
                       if (token) {
                           fetchUserData(token, userData.matricula);
                           const gTokens = SecureStorage.loadItem(userData.matricula, 'google_tokens');
                           if(gTokens) refreshClassroomData(gTokens);
                           SecureStorage.syncFromCloud(userData.matricula); // Check for cloud updates
                       }
                    }
                }}
                isClassroomLinked={classroomStatus === 'connected'}
                todos={todos}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onRemoveTodo={handleRemoveTodo}
                classroomStatus={classroomStatus}
                privacyMode={privacyMode}
            />

            <AnimatePresence>
                {view !== ViewState.DASHBOARD && (
                    <ContentView 
                        view={view} 
                        onClose={() => setView(ViewState.DASHBOARD)} 
                        onChangeView={setView}
                        isDarkMode={isDarkMode}
                        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                        currentWallpaper={currentWallpaper}
                        onWallpaperChange={updateWallpaper}
                        themeVariant={themeVariant}
                        onThemeVariantChange={setThemeVariant}
                        primaryColor={palette.primary}
                        secondaryColor={palette.secondary}
                        userData={userData}
                        academicData={academicData}
                        grades={grades}
                        schedule={schedule}
                        completionData={completionData}
                        onLogout={handleLogout}
                        autoExpandClassroom={autoExpandClassroom}
                        onAutoExpandClassroom={setAutoExpandClassroom}
                        onInstallPwa={() => {
                            // Check for PWA install event
                            const promptEvent = (window as any).deferredPrompt;
                            if (promptEvent) {
                                promptEvent.prompt();
                                (window as any).deferredPrompt = null;
                            } else {
                                alert("Para instalar, use a opção 'Adicionar à Tela Inicial' do seu navegador.");
                            }
                        }}
                        canInstall={!!(window as any).deferredPrompt}
                        performanceSettings={performanceSettings}
                        onUpdatePerformance={(s) => setPerformanceSettings(s)}
                        customPhotoUrl={customPhotoUrl}
                        onUpdateCustomPhoto={setCustomPhotoUrl}
                        useCustomPhoto={useCustomPhoto}
                        onToggleCustomPhoto={setUseCustomPhoto}
                        periods={periods}
                        viewingPeriod={selectedPeriod}
                        onPeriodChange={(semestre) => {
                             const p = periods.find(p => p.semestre === semestre);
                             if (p && userData?.matricula) {
                                 setSelectedPeriod(p);
                                 const token = localStorage.getItem('suap_access_token');
                                 if (token) fetchPeriodData(token, userData.matricula, p.semestre);
                             }
                        }}
                        isPremium={isPremium}
                        onOpenPremiumModal={() => setShowPremiumModal(true)}
                        classroomWork={classroomWork}
                        isClassroomLinked={classroomStatus === 'connected'}
                        onLinkClassroom={initiateGoogleAuth}
                        classroomStatus={classroomStatus}
                        // New Props Pass-through
                        privacyMode={privacyMode}
                        onTogglePrivacyMode={setPrivacyMode}
                        startView={startView}
                        onUpdateStartView={setStartView}
                        notificationsEnabled={notificationsEnabled}
                        onToggleNotifications={setNotificationsEnabled}
                    />
                )}
            </AnimatePresence>

            <MobileNavBar 
                currentView={view} 
                onChangeView={setView} 
                isDarkMode={isDarkMode} 
                primaryColor={palette.primary} 
            />
            
            <PomodoroWidget isDarkMode={isDarkMode} primaryColor={palette.primary} />
            
            <AIChatWidget 
                isDarkMode={isDarkMode} 
                accentColor={palette.primary}
                userData={userData}
                grades={grades}
                schedule={schedule}
                holidays={holidays}
                onRequestSettings={() => setView(ViewState.PROFILE)}
                isPremium={isPremium}
                internalApiKey={SUPACO_INTERNAL_KEY}
            />

            <AnimatePresence>
                {showTutorial && (
                    <TutorialOverlay 
                        steps={TUTORIAL_STEPS} 
                        onComplete={() => {
                            setShowTutorial(false);
                            localStorage.setItem(CACHE_KEYS.TUTORIAL_SEEN, 'true');
                        }} 
                        isDarkMode={isDarkMode}
                        primaryColor={palette.primary}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPremiumModal && userData && (
                    <PremiumModal 
                        onClose={() => setShowPremiumModal(false)}
                        onSubscribe={() => {
                            setIsPremium(true);
                            localStorage.setItem(CACHE_KEYS.IS_PREMIUM, 'true');
                            SecureStorage.checkSubscriptionStatus(userData.matricula || '').then(res => setIsPremium(res));
                        }}
                        isDarkMode={isDarkMode}
                        accentColor={palette.primary}
                        userData={userData}
                    />
                )}
            </AnimatePresence>
            
            {/* OFFLINE INDICATOR */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-red-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 z-[300]"
                    >
                        <WifiOff size={14} /> Offline Mode
                    </motion.div>
                )}
            </AnimatePresence>

        </Suspense>
      ) : (
        <LandingPage 
            onComplete={() => {}} 
            onLogin={() => {
                 const token = localStorage.getItem('suap_access_token');
                 const user = localStorage.getItem('suap_username');
                 if (token && user) {
                     fetchUserData(token, user);
                 }
            }}
            isDarkMode={isDarkMode}
            primaryColor={palette.primary}
            currentWallpaper={currentWallpaper}
        />
      )}
    </>
  );
}