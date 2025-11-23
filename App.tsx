
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ContentView } from './components/ContentViews';
import { LandingPage } from './components/LandingPage';
import { MobileNavBar } from './components/MobileNavBar';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapBoletim, SuapDiarioResponse, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { WifiOff } from 'lucide-react';

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";

// Cache Keys (Settings only - Data is now in SecureStorage)
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    WELCOME_SEEN: 'suap_welcome_seen'
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
  
  // UI State
  const [rightSidebarTab, setRightSidebarTab] = useState<'overview' | 'tasks' | 'holidays'>('overview');
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'settings' | 'wallpaper'>('profile');

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Data State (Will be populated by cache first, then API)
  const [userData, setUserData] = useState<SuapProfile | null>(null);
  const [academicData, setAcademicData] = useState<SuapMeusDadosAluno | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<SuapPeriod | null>(null);
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
                  // Ensure landing is skipped if returning from OAuth
                  setShowLanding(false);
                  localStorage.setItem(CACHE_KEYS.WELCOME_SEEN, 'true');
              }, 100);
          }
      }
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showLanding) return; // Disable shortcuts on landing page

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

        if (e.altKey && !e.ctrlKey && !e.metaKey) {
             switch(e.key) {
                case '1': e.preventDefault(); setRightSidebarTab('overview'); break;
                case '2': e.preventDefault(); setRightSidebarTab('tasks'); break;
                case '3': e.preventDefault(); setRightSidebarTab('holidays'); break;
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLanding]);

  // --- PROCESSING LOGIC (Defined first to be available) ---

  const processGrades = (boletim: SuapBoletim[]) => {
      return boletim.map(b => ({
          subject: b.disciplina.replace(/\(.*\)/, '').trim(),
          code: b.codigo_diario,
          status: b.situacao,
          n1: b.nota_etapa_1?.nota ?? '-',
          n2: b.nota_etapa_2?.nota ?? '-',
          n3: b.nota_etapa_3?.nota ?? '-',
          n4: b.nota_etapa_4?.nota ?? '-',
          finalGrade: b.nota_avaliacao_final?.nota ?? '-',
          average: b.media_disciplina ?? b.media_final_disciplina ?? '-',
          frequency: b.percentual_carga_horaria_frequentada,
          absences: b.numero_faltas,
          totalHours: b.carga_horaria,
          limit: Math.floor(b.carga_horaria * 0.25)
      }));
  };

  const processSchedule = (diarios: any[]): ProcessedClass[] => {
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

          const period = SecureStorage.loadItem(matricula, 'current_period');
          if (period) setCurrentPeriod(period);

          const grades = SecureStorage.loadItem(matricula, 'grades');
          if (grades) setProcessedGrades(grades);

          const schedule = SecureStorage.loadItem(matricula, 'schedule');
          if (schedule) setProcessedSchedule(schedule);

          // Holidays are global, not per user, but we can just load from generic storage
          const cachedHolidays = localStorage.getItem('suap_cache_holidays');
          if (cachedHolidays) setHolidays(JSON.parse(cachedHolidays));

      } catch (e) {
          console.error("[App] Error loading secure cache:", e);
      }
  };

  // --- API FETCHING & REFRESH ---

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
      } catch (e) {
          console.error("Refresh token failed", e);
      }
      return false;
  };

  const fetchWithAuth = async (url: string) => {
    let token = localStorage.getItem('suap_access_token');
    if (!token) return null;
    
    // Immediate offline check to prevent request latency
    if (!navigator.onLine) {
        console.log("Offline mode: Skipping fetch for", url);
        return null; 
    }

    try {
        let response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            console.log("Access Token Expired. Attempting Refresh...");
            const refreshed = await refreshSuapToken();
            
            if (refreshed) {
                token = localStorage.getItem('suap_access_token');
                response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
            } else {
                handleLogout();
                return null;
            }
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn(`Fetch failed for ${url} (likely offline)`, error);
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
      } catch (error) {
          console.warn("Failed to update holidays (offline)", error);
      }
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
    } catch (e) {
        console.error("Failed to fetch classroom data", e);
    }
  };

  // --- BACKGROUND SYNC ENGINE ---
  const fetchAllUserDataBackground = async (currentMatricula: string) => {
    console.log("[App] Starting background data sync...");
    try {
        // 1. User Profile
        const profile = await fetchWithAuth('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/');
        if (profile) {
            setUserData(profile);
            SecureStorage.saveItem(currentMatricula, 'profile', profile);
        }

        // 2. Academic Data
        const academic = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-dados-aluno/');
        if (academic) {
            setAcademicData(academic);
            SecureStorage.saveItem(currentMatricula, 'academic', academic);
        }

        // 3. Completion
        const completion = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/requisitos-conclusao/');
        if (completion) {
            setCompletionData(completion);
            SecureStorage.saveItem(currentMatricula, 'completion', completion);
        }

        // 4. Periods
        const periods: SuapPeriod[] = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/periodos/');
        if (periods && periods.length > 0) {
            // We don't need to encrypt periods list as it's generic, but we can save current period
            const sortedPeriods = periods.sort((a, b) => b.semestre.localeCompare(a.semestre));
            const activePeriod = sortedPeriods[0];
            
            setCurrentPeriod(activePeriod);
            SecureStorage.saveItem(currentMatricula, 'current_period', activePeriod);
            
            // 5. Grades & Schedule (Requires Period)
            if (activePeriod) {
                await fetchAcademicDetails(activePeriod.semestre, currentMatricula);
            }
        }
        
        fetchClassroomData();
        console.log("[App] Background sync complete.");

    } catch (error) {
        console.error("[App] Error in background sync:", error);
    }
  };

  const fetchAcademicDetails = async (semestre: string, matricula: string) => {
      const [ano, periodo] = semestre.split('.');
      
      // Boletim
      const boletim = await fetchWithAuth(`https://suap.ifrn.edu.br/api/v2/minhas-informacoes/boletim/${ano}/${periodo}/`);
      if (boletim) {
          const processed = processGrades(boletim);
          SecureStorage.saveItem(matricula, 'grades', processed);
          setProcessedGrades(processed);
      }

      // Diarios
      const diariosResponse: SuapDiarioResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/diarios/${semestre}/`);
      let diariosList = [];
      if (Array.isArray(diariosResponse)) {
          diariosList = diariosResponse;
      } else if (diariosResponse && Array.isArray(diariosResponse.results)) {
          diariosList = diariosResponse.results;
      }

      if (diariosList.length > 0) {
          const processed = processSchedule(diariosList);
          SecureStorage.saveItem(matricula, 'schedule', processed);
          setProcessedSchedule(processed);
      }
  };

  // --- INITIALIZATION ---
  
  useEffect(() => {
    fetchHolidays(); 

    const token = localStorage.getItem('suap_access_token');
    const matricula = localStorage.getItem('suap_username');

    if (token && matricula) {
      setIsLoggedIn(true);
      // 1. Load Encrypted Cache immediately
      loadUserCache(matricula);
      // 2. Trigger background refresh if online
      if (navigator.onLine) {
        fetchAllUserDataBackground(matricula);
      }
    }
  }, []);

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
          // Initial background fetch after login
          fetchAllUserDataBackground(matricula);
      }
  };

  const handleLogout = () => {
      // Don't clear cache aggressively on logout so offline works for last user if needed,
      // but typical behavior is to clear. Here we keep token removal but can leave data until new login overwrites.
      
      localStorage.removeItem('suap_access_token');
      localStorage.removeItem('suap_refresh_token');
      localStorage.removeItem('suap_username');
      localStorage.removeItem('google_classroom_token');

      setUserData(null);
      setAcademicData(null);
      setProcessedSchedule([]);
      setProcessedGrades([]);
      setCompletionData(null);
      setCurrentPeriod(null);
      setClassroomWork([]);
      
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
      
      {/* Offline Indicator - Discreet */}
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

      {/* Dashboard is always rendered to allow the "curtain" effect of the Landing Page */}
      <div className={showLanding ? 'fixed inset-0' : ''}>
        
        {/* Special Filter Overlay for Sepia Mode */}
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
                // Pass next class explicitly computed in DashboardLayout. Or pass it here if needed. 
                // Currently logic is in DashboardLayout, so fine.
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
                />
                )}
            </AnimatePresence>
            
            {/* New Persistent Mobile Navigation */}
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

      {/* Landing Page as an Overlay */}
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
