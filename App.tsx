
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ContentView } from './components/ContentViews';
import { LandingPage } from './components/LandingPage';
import { MobileNavBar } from './components/MobileNavBar';
import { TutorialOverlay, TutorialStep } from './components/TutorialOverlay';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapDiario, SuapBoletim, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse, PerformanceSettings, SuapMeusPeriodosLetivos, TodoItem } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { WifiOff, RefreshCw, Navigation, Layers, Zap, User } from 'lucide-react';

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// Cache Keys (Settings only - Data is now in SecureStorage)
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    PERFORMANCE: 'suap_performance_settings',
    WELCOME_SEEN: 'suap_welcome_seen',
    TUTORIAL_SEEN: 'suap_tutorial_completed_v1' // New key for tutorial
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
    // Makima (Pink/Red)
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png": { primary: "rose", secondary: "pink" },
    // Landscape (Sunset - Amber/Orange)
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png": { primary: "amber", secondary: "orange" },
    // Astronauts (Black/White - Zinc/Slate) - True Monochrome
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg": { primary: "slate", secondary: "zinc" },
    // Power (Orange/Red)
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg": { primary: "orange", secondary: "red" }
};

// TUTORIAL STEPS CONFIGURATION
const TUTORIAL_STEPS: TutorialStep[] = [
    {
        targetId: 'tut-carousel', 
        mobileTargetId: 'tut-carousel',
        title: 'Visão Geral',
        description: 'Aqui ficam seus cartões principais. Deslize para ver horários, feriados e tarefas pendentes de forma rápida.',
        position: 'right',
        icon: <Layers />
    },
    {
        targetId: 'tut-nav-desktop',
        mobileTargetId: 'tut-nav-mobile',
        title: 'Navegação',
        description: 'Acesse suas notas detalhadas, faltas, grade de horários e integração com o Google Classroom por aqui.',
        position: 'right', // Desktop defaults to right of sidebar
        icon: <Navigation />
    },
    {
        targetId: 'tut-widgets',
        mobileTargetId: 'tut-widgets',
        title: 'Ferramentas Inteligentes',
        description: 'Converse com a IA sobre suas notas ou use o Pomodoro para focar nos estudos.',
        position: 'top',
        icon: <Zap />
    },
    {
        targetId: 'tut-profile',
        mobileTargetId: 'tut-profile-mobile',
        title: 'Seu Perfil',
        description: 'Personalize o tema, troque o papel de parede e sincronize seus dados com a nuvem.',
        position: 'left',
        icon: <User />
    }
];

const App: React.FC = () => {
  // --- LANDING PAGE STATE ---
  const [showLanding, setShowLanding] = useState(() => {
      return !localStorage.getItem(CACHE_KEYS.WELCOME_SEEN);
  });

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Settings State (Initialize from cache if available)
  const [isDarkMode, setIsDarkMode] = useState(() => {
      return localStorage.getItem(CACHE_KEYS.THEME_MODE) === 'dark';
  });
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => {
      return (localStorage.getItem(CACHE_KEYS.THEME_VARIANT) as ThemeVariant) || 'dynamic';
  });
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
      return localStorage.getItem(CACHE_KEYS.WALLPAPER) || DEFAULT_WALLPAPER;
  });
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>(() => {
      const saved = localStorage.getItem(CACHE_KEYS.PERFORMANCE);
      return saved ? JSON.parse(saved) : DEFAULT_PERFORMANCE;
  });

  // Profile Photo State
  const [customPhotoUrl, setCustomPhotoUrl] = useState(localStorage.getItem('suap_custom_photo') || '');
  const [useCustomPhoto, setUseCustomPhoto] = useState(localStorage.getItem('suap_use_custom_photo') === 'true');
  
  // UI State
  const [rightSidebarTab, setRightSidebarTab] = useState<'overview' | 'tasks' | 'holidays'>('overview');
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'settings' | 'wallpaper' | 'performance'>('profile');

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  // Data State
  const [userData, setUserData] = useState<SuapProfile | null>(null);
  const [academicData, setAcademicData] = useState<SuapMeusDadosAluno | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<SuapPeriod | null>(null); // The actual current period (time-based)
  const [periods, setPeriods] = useState<SuapPeriod[]>([]); // List of all periods
  
  // Viewing State (The period currently being viewed in Grades)
  const [viewingPeriod, setViewingPeriod] = useState<SuapPeriod | null>(null);

  const [processedSchedule, setProcessedSchedule] = useState<ProcessedClass[]>([]);
  const [processedGrades, setProcessedGrades] = useState<GradeInfo[]>([]);
  const [completionData, setCompletionData] = useState<SuapCompletionData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [classroomWork, setClassroomWork] = useState<ClassroomWork[]>([]);
  const [isClassroomLinked, setIsClassroomLinked] = useState(false);

  // Todo List State
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // Auto Expand Classroom Setting Logic
  const [autoExpandClassroom, setAutoExpandClassroom] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- PERSISTENCE HELPERS ---

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.THEME_MODE, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.THEME_VARIANT, themeVariant);
  }, [themeVariant]);

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.WALLPAPER, currentWallpaper);
  }, [currentWallpaper]);

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.PERFORMANCE, JSON.stringify(performanceSettings));
  }, [performanceSettings]);

  // Check Tutorial Status whenever Login or Landing changes
  useEffect(() => {
      if (isLoggedIn && !showLanding) {
          const seen = localStorage.getItem(CACHE_KEYS.TUTORIAL_SEEN);
          if (!seen) {
              // Wait a bit for layout to settle/animations to finish
              const t = setTimeout(() => setShowTutorial(true), 1500);
              return () => clearTimeout(t);
          }
      }
  }, [isLoggedIn, showLanding]);

  const handleFinishTutorial = () => {
      setShowTutorial(false);
      localStorage.setItem(CACHE_KEYS.TUTORIAL_SEEN, 'true');
  };

  // Profile Photo Handlers
  const handleUpdateCustomPhoto = (url: string) => {
      setCustomPhotoUrl(url);
      if(url) {
          localStorage.setItem('suap_custom_photo', url);
          // Auto-enable if setting a new valid URL and currently not using custom
          if (!useCustomPhoto) {
              setUseCustomPhoto(true);
              localStorage.setItem('suap_use_custom_photo', 'true');
          }
      } else {
          localStorage.removeItem('suap_custom_photo');
      }
  };

  const handleToggleCustomPhoto = (enable: boolean) => {
      setUseCustomPhoto(enable);
      localStorage.setItem('suap_use_custom_photo', String(enable));
  };

  // --- AUTO SYNC FOR SETTINGS ---
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      if (isLoggedIn && userData?.matricula && !isOffline) {
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          
          setIsSyncing(true);
          syncTimeoutRef.current = setTimeout(async () => {
              console.log("[App] Auto-syncing settings to cloud...");
              await SecureStorage.syncToCloud(userData.matricula!);
              setIsSyncing(false);
          }, 3000); 
      }
  }, [currentWallpaper, customPhotoUrl, useCustomPhoto, themeVariant, isDarkMode, performanceSettings, isLoggedIn, userData?.matricula]);


  // Calculate Active User Photo
  const activeUserPhoto = useMemo(() => {
      if (useCustomPhoto && customPhotoUrl) return customPhotoUrl;
      if (userData?.foto) {
          return userData.foto.startsWith('http') ? userData.foto : `https://suap.ifrn.edu.br${userData.foto}`;
      }
      return DEFAULT_PROFILE_IMG;
  }, [useCustomPhoto, customPhotoUrl, userData]);


  // --- OFFLINE DETECTION & PWA PROMPT ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- OAUTH CALLBACK HANDLER ---
  useEffect(() => {
      const checkClassroomToken = () => {
          const token = localStorage.getItem('google_classroom_token');
          setIsClassroomLinked(!!token);
      };
      
      checkClassroomToken();
      window.addEventListener('storage', checkClassroomToken);

      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          
          if (accessToken) {
              localStorage.setItem('google_classroom_token', accessToken);
              setIsClassroomLinked(true);
              window.history.replaceState(null, '', window.location.pathname);
              setTimeout(() => {
                  setCurrentView(ViewState.PROFILE);
                  setProfileInitialTab('settings');
                  setAutoExpandClassroom(true);
                  setShowLanding(false);
                  localStorage.setItem(CACHE_KEYS.WELCOME_SEEN, 'true');
              }, 100);
          }
      }
      return () => window.removeEventListener('storage', checkClassroomToken);
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showLanding) return; 

        if (e.repeat) return; 
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (e.key === 'Escape') {
            handleCloseOverlay();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
            switch(e.key) {
                case '1': e.preventDefault(); setCurrentView(ViewState.DASHBOARD); break;
                case '2': e.preventDefault(); setCurrentView(ViewState.GRADES); break;
                case '3': e.preventDefault(); setCurrentView(ViewState.ABSENCES); break;
                case '4': e.preventDefault(); setCurrentView(ViewState.SCHEDULE); break;
                case '5': e.preventDefault(); setCurrentView(ViewState.CLASSROOM); break;
                case '6': e.preventDefault(); setCurrentView(ViewState.CONCLUSION); break;
                case 'i': e.preventDefault(); handleOpenSettings(); break;
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLanding]);

  // --- PROCESSING LOGIC ---

  // Refactored to work with SuapBoletim[] from /api/ensino/meu-boletim/
  // This endpoint provides accurate absence counts compared to diarios
  const processGradesFromBoletim = (boletim: SuapBoletim[]): GradeInfo[] => {
      return boletim.map(b => {
          // Sometimes discipline names come with codes like "1234 - Math". Clean it for UI.
          // Fallback to original string if regex fails.
          const cleanSubject = b.disciplina.replace(/(^\d+ - )|( - .+$)/g, '') || b.disciplina;

          return {
              subject: cleanSubject,
              code: b.codigo_diario,
              status: b.situacao,
              n1: b.nota_etapa_1?.nota ?? '-',
              n2: b.nota_etapa_2?.nota ?? '-',
              n3: b.nota_etapa_3?.nota ?? '-',
              n4: b.nota_etapa_4?.nota ?? '-',
              finalGrade: b.nota_avaliacao_final?.nota ?? '-',
              average: b.media_disciplina ?? '-',
              frequency: b.percentual_carga_horaria_frequentada || 0,
              absences: b.numero_faltas || 0,
              totalHours: b.carga_horaria || 0,
              limit: Math.floor((b.carga_horaria || 0) * 0.25)
          };
      });
  };

  const processScheduleFromDiarios = (diarios: SuapDiario[]): ProcessedClass[] => {
      const dayMap: Record<string, number> = {
          'Segunda': 2, 'Terça': 3, 'Quarta': 4, 'Quinta': 5, 'Sexta': 6, 'Sábado': 7, 'Domingo': 1
      };

      const classes: ProcessedClass[] = [];

      diarios.forEach(diario => {
          if (!diario.horarios) return;
          diario.horarios.forEach((h: any) => {
              if (!h.horario) return;
              const [start, end] = h.horario.split(' - ');
              const dayInt = dayMap[h.dia] || 0;

              classes.push({
                  day: h.dia,
                  dayInt: dayInt,
                  startTime: start ? start.trim() : '',
                  endTime: end ? end.trim() : '',
                  timeLabel: h.horario,
                  name: diario.disciplina?.descricao || 'Disciplina',
                  shortName: diario.disciplina?.sigla || '',
                  room: diario.local?.sala || 'N/A',
                  fullRoom: diario.local?.sala || 'N/A',
                  professors: diario.professores?.map((p:any) => p.nome) || [],
                  type: 'Regular'
              });
          });
      });

      return classes.sort((a, b) => {
          if (a.dayInt !== b.dayInt) return a.dayInt - b.dayInt;
          return a.startTime.localeCompare(b.startTime);
      });
  };

  // --- CACHE LOADING (DECRYPTED) ---
  const loadUserCache = (matricula: string) => {
      try {
          console.log(`[App] Loading encrypted cache for user: ${matricula}`);
          
          const profile = SecureStorage.loadItem(matricula, 'profile');
          if (profile) setUserData(profile);

          const academic = SecureStorage.loadItem(matricula, 'academic');
          if (academic) setAcademicData(academic);

          const completion = SecureStorage.loadItem(matricula, 'completion');
          if (completion) setCompletionData(completion);

          const cachedPeriods = SecureStorage.loadItem(matricula, 'periods');
          if (cachedPeriods) setPeriods(cachedPeriods);

          const cachedTodos = SecureStorage.loadItem(matricula, 'todos');
          if (cachedTodos) setTodos(cachedTodos);

          const activeP = SecureStorage.loadItem(matricula, 'active_period');
          if (activeP) {
              setCurrentPeriod(activeP);
              setViewingPeriod(activeP);
              
              const grades = SecureStorage.loadItem(matricula, `grades_${activeP.semestre}`);
              if (grades) setProcessedGrades(grades);

              const schedule = SecureStorage.loadItem(matricula, `schedule_${activeP.semestre}`);
              if (schedule) setProcessedSchedule(schedule);
          }

          const cachedHolidays = localStorage.getItem('suap_cache_holidays');
          if (cachedHolidays) setHolidays(JSON.parse(cachedHolidays));

      } catch (e) {
          console.error("[App] Error loading secure cache:", e);
      }
  };

  // --- API FETCHING ---

  const refreshSuapToken = async () => {
      if (!navigator.onLine) return false;
      const refresh = localStorage.getItem('suap_refresh_token');
      if (!refresh) return false;
      try {
          const response = await fetch('https://suap.ifrn.edu.br/api/token/refresh/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh })
          });
          if (response.ok) {
              const data = await response.json();
              localStorage.setItem('suap_access_token', data.access);
              if (data.refresh) localStorage.setItem('suap_refresh_token', data.refresh);
              return true;
          }
      } catch (e) { console.error("Refresh token failed", e); }
      return false;
  };

  const fetchWithAuth = async (url: string) => {
    let token = localStorage.getItem('suap_access_token');
    if (!token) return null;
    if (!navigator.onLine) return null; 

    try {
        console.log(`[App] Fetching API: ${url}`);
        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            const refreshed = await refreshSuapToken();
            if (refreshed) {
                token = localStorage.getItem('suap_access_token');
                response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
            } else {
                handleLogout();
                return null;
            }
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`Fetch failed for ${url}`, error);
        return null;
    }
  };

  const fetchHolidays = async () => {
      const year = new Date().getFullYear();
      try {
          const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
          if (response.ok) {
              const data = await response.json();
              setHolidays(data);
              localStorage.setItem('suap_cache_holidays', JSON.stringify(data));
          }
      } catch (error) { console.warn("Failed to update holidays (offline)", error); }
  };

  const fetchClassroomData = async () => {
    const token = localStorage.getItem('google_classroom_token');
    if (!token || !navigator.onLine) {
        setIsClassroomLinked(false);
        return;
    }
    setIsClassroomLinked(true);
    try {
        const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!coursesRes.ok) return;
        const coursesData = await coursesRes.json();
        const courses: ClassroomCourse[] = coursesData.courses || [];
        const workPromises = courses.map(async (course) => {
            const workRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate desc`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!workRes.ok) return [];
            const workData = await workRes.json();
            return (workData.courseWork || []).map((w: ClassroomWork) => ({
                ...w,
                courseName: course.name,
                jsDate: w.dueDate ? new Date(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day, w.dueTime?.hours || 23, w.dueTime?.minutes || 59) : undefined
            }));
        });
        const allWork = (await Promise.all(workPromises)).flat();
        const futureWork = allWork.filter(w => w.jsDate && w.jsDate >= new Date()).sort((a, b) => a.jsDate!.getTime() - b.jsDate!.getTime());
        setClassroomWork(futureWork);
    } catch (e) { console.error("Failed to fetch classroom data", e); }
  };

  // --- BACKGROUND SYNC ENGINE ---
  const fetchAllUserDataBackground = async (currentMatricula: string, forceRefresh = false) => {
    console.log(`[App] Syncing data for ${currentMatricula} (Force: ${forceRefresh})`);
    
    const shouldFetch = (key: string) => {
        if (forceRefresh) return true;
        const data = SecureStorage.loadItem(currentMatricula, key);
        return !data; 
    };

    try {
        setIsSyncing(true);

        if (shouldFetch('profile')) {
            const profile = await fetchWithAuth('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/');
            if (profile) {
                setUserData(profile);
                SecureStorage.saveItem(currentMatricula, 'profile', profile);
            }
        }

        if (shouldFetch('academic')) {
            const academic = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-dados-aluno/');
            if (academic) {
                setAcademicData(academic);
                SecureStorage.saveItem(currentMatricula, 'academic', academic);
            }
        }

        if (shouldFetch('completion')) {
            const completion = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/requisitos-conclusao/');
            if (completion) {
                setCompletionData(completion);
                SecureStorage.saveItem(currentMatricula, 'completion', completion);
            }
        }

        // --- PERIODS LOGIC (Using meus-periodos-letivos) ---
        let periodList = SecureStorage.loadItem(currentMatricula, 'periods');
        let activePeriod = SecureStorage.loadItem(currentMatricula, 'active_period');

        if (!periodList || forceRefresh) {
            const data = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-periodos-letivos/');
            if (data && data.results) {
                const mappedPeriods: SuapPeriod[] = data.results.map((p: SuapMeusPeriodosLetivos) => ({
                    id: p.ano_letivo * 10 + p.periodo_letivo, 
                    semestre: `${p.ano_letivo}.${p.periodo_letivo}`
                }));

                mappedPeriods.sort((a, b) => b.semestre.localeCompare(a.semestre));
                
                periodList = mappedPeriods;
                setPeriods(mappedPeriods);
                SecureStorage.saveItem(currentMatricula, 'periods', mappedPeriods);

                if (mappedPeriods.length > 0) {
                    activePeriod = mappedPeriods[0];
                    setCurrentPeriod(activePeriod);
                    SecureStorage.saveItem(currentMatricula, 'active_period', activePeriod);
                    
                    if (!viewingPeriod) setViewingPeriod(activePeriod);
                }
            }
        } else {
             setPeriods(periodList);
             setCurrentPeriod(activePeriod);
             if (!viewingPeriod) setViewingPeriod(activePeriod);
        }

        // --- FETCH DETAILS (Grades & Schedule) ---
        if (activePeriod) {
            const cacheKeyGrades = `grades_${activePeriod.semestre}`;
            const cacheKeySchedule = `schedule_${activePeriod.semestre}`;

            if (shouldFetch(cacheKeyGrades) || shouldFetch(cacheKeySchedule) || forceRefresh) {
                // FORCE UI UPDATE if we are loading the active period
                await fetchAcademicDetails(activePeriod.semestre, currentMatricula, true);
            }
        }
        
        await fetchClassroomData();

        if (forceRefresh) {
             await SecureStorage.syncToCloud(currentMatricula);
        }

    } catch (error) {
        console.error("[App] Error in background sync:", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const fetchAcademicDetails = async (semestre: string, matricula: string, forceUIUpdate = false) => {
      console.log(`[App] Fetching details for ${semestre}`);

      // 1. SCHEDULE (Horários) via DIARIOS
      // Keep fetching diarios for schedule info, locations, etc.
      const diariesResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/diarios/${semestre}/`);
      
      let diariesList: SuapDiario[] = [];
      if (Array.isArray(diariesResponse)) diariesList = diariesResponse;
      else if (diariesResponse?.results) diariesList = diariesResponse.results;

      if (diariesList.length > 0) {
          const processedScheduleData = processScheduleFromDiarios(diariesList);
          SecureStorage.saveItem(matricula, `schedule_${semestre}`, processedScheduleData);
          setProcessedSchedule(prev => {
              if (forceUIUpdate || viewingPeriod?.semestre === semestre) return processedScheduleData;
              return prev;
          });
      }

      // 2. GRADES (Notas/Faltas) via BOLETIM
      // This endpoint provides accurate absence counts.
      const [ano, periodo] = semestre.split('.').map(Number);
      if (ano && periodo) {
          const boletimResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/meu-boletim/${ano}/${periodo}/`);
          
          let boletimList: SuapBoletim[] = [];
          if (Array.isArray(boletimResponse)) boletimList = boletimResponse;
          else if (boletimResponse?.results) boletimList = boletimResponse.results;

          if (boletimList.length > 0) {
              const processedGradesData = processGradesFromBoletim(boletimList);
              SecureStorage.saveItem(matricula, `grades_${semestre}`, processedGradesData);
              setProcessedGrades(prev => {
                  if (forceUIUpdate || viewingPeriod?.semestre === semestre) return processedGradesData;
                  return prev;
              });
          }
      }
  };

  const handlePeriodChange = async (semestre: string) => {
      const targetPeriod = periods.find(p => p.semestre === semestre);
      if (!targetPeriod) return;

      setViewingPeriod(targetPeriod);
      const matricula = localStorage.getItem('suap_username');
      if (!matricula) return;

      const cachedGrades = SecureStorage.loadItem(matricula, `grades_${semestre}`);
      const cachedSchedule = SecureStorage.loadItem(matricula, `schedule_${semestre}`);

      if (cachedGrades) setProcessedGrades(cachedGrades);
      else setProcessedGrades([]); 

      if (cachedSchedule) setProcessedSchedule(cachedSchedule);
      else setProcessedSchedule([]);

      if (!cachedGrades || !cachedSchedule) {
           setIsSyncing(true);
           try {
               await fetchAcademicDetails(semestre, matricula, true); // Force update since we just switched
           } finally {
               setIsSyncing(false);
           }
      }
  };

  // --- TODO HANDLERS ---
  const handleAddTodo = (text: string) => {
      if (!text.trim()) return;
      const newTodo: TodoItem = {
          id: Date.now().toString(),
          text: text,
          completed: false
      };
      const updatedTodos = [newTodo, ...todos];
      setTodos(updatedTodos);
      
      const matricula = localStorage.getItem('suap_username');
      if (matricula) {
          SecureStorage.saveItem(matricula, 'todos', updatedTodos);
          // Trigger sync (debouncing would be better, but direct call is okay for now)
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => SecureStorage.syncToCloud(matricula), 2000);
      }
  };

  const handleToggleTodo = (id: string) => {
      const updatedTodos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setTodos(updatedTodos);

      const matricula = localStorage.getItem('suap_username');
      if (matricula) {
          SecureStorage.saveItem(matricula, 'todos', updatedTodos);
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => SecureStorage.syncToCloud(matricula), 2000);
      }
  };

  const handleRemoveTodo = (id: string) => {
      const updatedTodos = todos.filter(t => t.id !== id);
      setTodos(updatedTodos);

      const matricula = localStorage.getItem('suap_username');
      if (matricula) {
          SecureStorage.saveItem(matricula, 'todos', updatedTodos);
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          syncTimeoutRef.current = setTimeout(() => SecureStorage.syncToCloud(matricula), 2000);
      }
  };


  // --- INITIALIZATION ---
  
  useEffect(() => {
    fetchHolidays(); 
    const token = localStorage.getItem('suap_access_token');
    const matricula = localStorage.getItem('suap_username');

    if (token && matricula) {
      setIsLoggedIn(true);
      loadUserCache(matricula);
      if (navigator.onLine) {
        // Fetch background data on load, but don't force unnecessary refreshes if cache exists
        // However, the issue described was initial load not showing.
        // fetchAllUserDataBackground logic now forces UI update for active period.
        fetchAllUserDataBackground(matricula, false);
      }
    }
  }, []);

  const handleManualRefresh = () => {
    const matricula = localStorage.getItem('suap_username');
    if (matricula && navigator.onLine) {
        fetchAllUserDataBackground(matricula, true);
    }
  };

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
    if (view === ViewState.PROFILE) setProfileInitialTab('profile');
  };

  const handleOpenSettings = () => {
    setCurrentView(ViewState.PROFILE);
    setProfileInitialTab('settings');
  };

  const handleCloseOverlay = () => {
    setCurrentView(ViewState.DASHBOARD);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = () => {
      const matricula = localStorage.getItem('suap_username');
      if (matricula) {
          setIsLoggedIn(true);
          fetchAllUserDataBackground(matricula, true);
      }
  };

  const handleLogout = () => {
      localStorage.clear(); 
      localStorage.setItem(CACHE_KEYS.WALLPAPER, DEFAULT_WALLPAPER);
      
      setUserData(null);
      setAcademicData(null);
      setProcessedSchedule([]);
      setProcessedGrades([]);
      setCompletionData(null);
      setCurrentPeriod(null);
      setClassroomWork([]);
      setPeriods([]);
      setViewingPeriod(null);
      setTodos([]);
      setIsClassroomLinked(false);
      
      setIsLoggedIn(false);
      setCurrentView(ViewState.DASHBOARD);
  };

  const handleFinishLanding = () => {
      setShowLanding(false);
      localStorage.setItem(CACHE_KEYS.WELCOME_SEEN, 'true');
  };

  const palette = useMemo((): Palette => {
      switch (themeVariant) {
          case 'monochrome': return { primary: 'zinc', secondary: 'zinc' };
          case 'saturated': return { primary: 'fuchsia', secondary: 'cyan' };
          case 'sepia': return { primary: 'amber', secondary: 'stone' };
          case 'dynamic': return WALLPAPER_THEMES[currentWallpaper] || { primary: 'emerald', secondary: 'rose' };
          default: return { primary: 'emerald', secondary: 'rose' };
      }
  }, [themeVariant, currentWallpaper]);

  return (
    <div className={`font-sans antialiased transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      
      <style>
        {`
            ${performanceSettings.disableBlur ? `
                .backdrop-blur-xl, .backdrop-blur-md, .backdrop-blur-2xl, .backdrop-blur-lg, .backdrop-blur-sm, .backdrop-blur { 
                    backdrop-filter: none !important; 
                    -webkit-backdrop-filter: none !important;
                    background-color: ${isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'} !important;
                }
            ` : ''}
            
            ${performanceSettings.reduceMotion ? `
                *, *::before, *::after {
                    animation-duration: 0.01s !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01s !important;
                    scroll-behavior: auto !important;
                }
                .animate-pulse, .animate-spin, .animate-ping, .animate-bounce {
                    animation: none !important;
                }
            ` : ''}

            ${performanceSettings.disableGlow ? `
                .shadow-2xl, .shadow-xl, .shadow-lg, .shadow-md, .shadow-sm, .shadow {
                    box-shadow: none !important;
                }
                .blur-3xl, .blur-2xl, .blur-xl {
                    display: none !important;
                }
            ` : ''}
        `}
      </style>

      <AnimatePresence>
        {isSyncing && (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed top-4 right-4 z-[300] pointer-events-none"
            >
                <div className={`p-2 rounded-full shadow-lg backdrop-blur-md ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-gray-800'}`}>
                    <RefreshCw size={14} className="animate-spin" />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOffline && isLoggedIn && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-0 inset-x-0 z-[300] flex justify-center pointer-events-none"
            >
                <div className={`mt-2 px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shadow-xl backdrop-blur-md ${isDarkMode ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    <WifiOff size={12} />
                    <span>Modo Offline</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className={showLanding ? 'fixed inset-0' : ''}>
        
        {themeVariant === 'sepia' && (
            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.12] mix-blend-overlay" 
                 style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}} 
            />
        )}
        
        <div style={{ filter: themeVariant === 'sepia' ? 'sepia(80%) contrast(90%)' : 'none', transition: 'filter 0.5s ease' }} className="h-full w-full absolute inset-0 z-0" />

        <div className="relative z-10 h-full">
            <DashboardLayout 
                key="dashboard"
                currentView={currentView} 
                onChangeView={handleViewChange} 
                isDarkMode={isDarkMode}
                onToggleTheme={toggleTheme}
                currentWallpaper={currentWallpaper}
                primaryColor={palette.primary}
                secondaryColor={palette.secondary}
                isLoggedIn={isLoggedIn}
                onLogin={handleLogin}
                userData={userData}
                currentPeriod={currentPeriod}
                grades={processedGrades}
                schedule={processedSchedule}
                completionData={completionData}
                holidays={holidays}
                classroomWork={classroomWork}
                rightTab={rightSidebarTab}
                onRightTabChange={setRightSidebarTab}
                onOpenSettings={handleOpenSettings}
                userPhoto={activeUserPhoto} 
                onRefresh={handleManualRefresh}
                isClassroomLinked={isClassroomLinked}
                todos={todos}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onRemoveTodo={handleRemoveTodo}
            />

            <AnimatePresence>
                {/* TUTORIAL OVERLAY */}
                {showTutorial && (
                    <TutorialOverlay 
                        steps={TUTORIAL_STEPS}
                        onComplete={handleFinishTutorial}
                        isDarkMode={isDarkMode}
                        primaryColor={palette.primary}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {currentView !== ViewState.DASHBOARD && (
                <ContentView 
                    view={currentView} 
                    onClose={handleCloseOverlay}
                    onChangeView={handleViewChange}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                    currentWallpaper={currentWallpaper}
                    onWallpaperChange={setCurrentWallpaper}
                    themeVariant={themeVariant}
                    onThemeVariantChange={setThemeVariant}
                    primaryColor={palette.primary}
                    secondaryColor={palette.secondary}
                    userData={userData}
                    academicData={academicData}
                    grades={processedGrades}
                    schedule={processedSchedule}
                    completionData={completionData}
                    onLogout={handleLogout}
                    autoExpandClassroom={autoExpandClassroom}
                    onAutoExpandClassroom={setAutoExpandClassroom}
                    initialProfileTab={profileInitialTab}
                    onInstallPwa={handleInstallPwa}
                    canInstall={!!deferredPrompt}
                    performanceSettings={performanceSettings}
                    onUpdatePerformance={setPerformanceSettings}
                    customPhotoUrl={customPhotoUrl}
                    onUpdateCustomPhoto={handleUpdateCustomPhoto}
                    useCustomPhoto={useCustomPhoto}
                    onToggleCustomPhoto={handleToggleCustomPhoto}
                    // New Props for Period Selection
                    periods={periods}
                    viewingPeriod={viewingPeriod}
                    onPeriodChange={handlePeriodChange}
                />
                )}
            </AnimatePresence>
            
            {isLoggedIn && !showLanding && (
               <MobileNavBar 
                 currentView={currentView}
                 onChangeView={handleViewChange}
                 isDarkMode={isDarkMode}
                 primaryColor={palette.primary}
               />
            )}
        </div>
      </div>

      <AnimatePresence>
        {showLanding && (
            <LandingPage 
                key="landing"
                onComplete={handleFinishLanding}
                onLogin={handleLogin} 
                isDarkMode={isDarkMode} 
                primaryColor={palette.primary}
                currentWallpaper={currentWallpaper}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
