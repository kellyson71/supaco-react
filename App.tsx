

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ContentView } from './components/ContentViews';
import { LandingPage } from './components/LandingPage';
import { MobileNavBar } from './components/MobileNavBar';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapDiario, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse, PerformanceSettings, SuapMeusPeriodosLetivos } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { WifiOff, RefreshCw } from 'lucide-react';

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// Cache Keys (Settings only - Data is now in SecureStorage)
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    PERFORMANCE: 'suap_performance_settings',
    WELCOME_SEEN: 'suap_welcome_seen'
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
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          
          if (accessToken) {
              localStorage.setItem('google_classroom_token', accessToken);
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

  // Refactored to work with SuapDiario[] from /api/ensino/diarios/
  const processGradesFromDiarios = (diarios: SuapDiario[]): GradeInfo[] => {
      return diarios.map(d => {
          // Attempt to extract grades from 'notas' or 'medias' if available
          // Since structure can be generic, we use best-effort access
          const notas = d.disciplina.notas || [];
          const medias = d.disciplina.medias || [];
          
          // Helper to safely get a grade value
          const getVal = (arr: any[], idx: number) => {
              if (arr && arr[idx]) {
                  return arr[idx].nota !== undefined ? arr[idx].nota : (arr[idx].media !== undefined ? arr[idx].media : '-');
              }
              return '-';
          };

          // Use media_final_disciplina or situacao.rotulo logic if available
          // Usually diarios has `situacao` which helps determine status
          
          return {
              subject: d.disciplina.descricao || 'Disciplina',
              code: d.disciplina.sigla || String(d.id),
              status: d.disciplina.situacao?.rotulo || d.disciplina.situacao?.status || 'Cursando',
              n1: getVal(notas, 0), // Assumes sequential order if API returns array
              n2: getVal(notas, 1),
              n3: getVal(notas, 2),
              n4: getVal(notas, 3),
              finalGrade: '-', // Diaries usually don't separate final exam explicitly in top level, often inside evaluations
              average: '-', // Will be filled if API provides explicit field in future or calculated from medias
              frequency: d.disciplina.frequencia || 0,
              absences: d.disciplina.qtd_faltas || 0,
              totalHours: d.disciplina.ch_total_aula || 0,
              // Calculation: 25% of total hours is the limit
              limit: Math.floor((d.disciplina.ch_total_aula || 0) * 0.25)
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

          const activeP = SecureStorage.loadItem(matricula, 'active_period');
          if (activeP) {
              setCurrentPeriod(activeP);
              setViewingPeriod(activeP);
              
              // Load grades/schedule for the active period by default
              // Note: We are now storing "diarios_raw" and processing them
              // Or storing the processed result. Let's look for processed.
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
    if (!token || !navigator.onLine) return;
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
            // Using the user-requested endpoint
            const data = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-periodos-letivos/');
            if (data && data.results) {
                const mappedPeriods: SuapPeriod[] = data.results.map((p: SuapMeusPeriodosLetivos) => ({
                    id: p.ano_letivo * 10 + p.periodo_letivo, 
                    semestre: `${p.ano_letivo}.${p.periodo_letivo}`
                }));

                // Sort descending (newest first)
                mappedPeriods.sort((a, b) => b.semestre.localeCompare(a.semestre));
                
                periodList = mappedPeriods;
                setPeriods(mappedPeriods);
                SecureStorage.saveItem(currentMatricula, 'periods', mappedPeriods);

                // Set Active Period (latest one)
                if (mappedPeriods.length > 0) {
                    activePeriod = mappedPeriods[0];
                    setCurrentPeriod(activePeriod);
                    SecureStorage.saveItem(currentMatricula, 'active_period', activePeriod);
                    
                    if (!viewingPeriod) setViewingPeriod(activePeriod);
                }
            } else {
                 // Fallback to standard if needed, but primary is above
                 // Keeping fallback empty for now to strictly follow "use the endpoint"
            }
        } else {
             setPeriods(periodList);
             setCurrentPeriod(activePeriod);
             if (!viewingPeriod) setViewingPeriod(activePeriod);
        }

        // --- FETCH DIARIES (For Grades & Schedule) ---
        if (activePeriod) {
            const cacheKeyGrades = `grades_${activePeriod.semestre}`;
            const cacheKeySchedule = `schedule_${activePeriod.semestre}`;

            if (shouldFetch(cacheKeyGrades) || shouldFetch(cacheKeySchedule) || forceRefresh) {
                await fetchAcademicDetails(activePeriod.semestre, currentMatricula);
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

  const fetchAcademicDetails = async (semestre: string, matricula: string) => {
      console.log(`[App] Fetching DIARIES for ${semestre}`);

      // We ONLY use the diaries endpoint now for both grades and schedule
      // GET /api/ensino/diarios/{semestre}/
      const diariesResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/diarios/${semestre}/`);
      
      let diariesList: SuapDiario[] = [];
      if (Array.isArray(diariesResponse)) diariesList = diariesResponse;
      else if (diariesResponse?.results) diariesList = diariesResponse.results;

      if (diariesList.length > 0) {
          // 1. Process Grades from Diaries
          const processedGradesData = processGradesFromDiarios(diariesList);
          SecureStorage.saveItem(matricula, `grades_${semestre}`, processedGradesData);
          setProcessedGrades(prev => {
              // Only update if viewing this semester
              if (viewingPeriod?.semestre === semestre) return processedGradesData;
              return prev;
          });

          // 2. Process Schedule from Diaries
          const processedScheduleData = processScheduleFromDiarios(diariesList);
          SecureStorage.saveItem(matricula, `schedule_${semestre}`, processedScheduleData);
          setProcessedSchedule(prev => {
              if (viewingPeriod?.semestre === semestre) return processedScheduleData;
              return prev;
          });
      }
  };

  const handlePeriodChange = async (semestre: string) => {
      const targetPeriod = periods.find(p => p.semestre === semestre);
      if (!targetPeriod) return;

      setViewingPeriod(targetPeriod);
      const matricula = localStorage.getItem('suap_username');
      if (!matricula) return;

      // 1. Try Load from Cache
      const cachedGrades = SecureStorage.loadItem(matricula, `grades_${semestre}`);
      const cachedSchedule = SecureStorage.loadItem(matricula, `schedule_${semestre}`);

      if (cachedGrades) setProcessedGrades(cachedGrades);
      else setProcessedGrades([]); // Clear while loading

      if (cachedSchedule) setProcessedSchedule(cachedSchedule);
      else setProcessedSchedule([]);

      // 2. Fetch fresh if needed (or if cache missing)
      if (!cachedGrades || !cachedSchedule) {
           setIsSyncing(true);
           try {
               await fetchAcademicDetails(semestre, matricula);
               // Re-load to ensure state sync
               const freshGrades = SecureStorage.loadItem(matricula, `grades_${semestre}`);
               const freshSchedule = SecureStorage.loadItem(matricula, `schedule_${semestre}`);
               if(freshGrades) setProcessedGrades(freshGrades);
               if(freshSchedule) setProcessedSchedule(freshSchedule);
           } finally {
               setIsSyncing(false);
           }
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
      // In a real app we might want to keep some settings, but for this 'hard logout' clear all is safer to remove suap data
      // Re-initialize defaults
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
            />

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