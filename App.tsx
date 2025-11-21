
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ContentView } from './components/ContentViews';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapBoletim, SuapDiarioResponse, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse } from './types';
import { AnimatePresence } from 'framer-motion';

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";

// Cache Keys
const CACHE_KEYS = {
    PROFILE: 'suap_cache_profile',
    ACADEMIC: 'suap_cache_academic',
    COMPLETION: 'suap_cache_completion',
    PERIODS: 'suap_cache_periods',
    CURRENT_PERIOD: 'suap_cache_current_period',
    GRADES: 'suap_cache_grades',
    SCHEDULE: 'suap_cache_schedule',
    HOLIDAYS: 'suap_cache_holidays',
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode'
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

  // --- PERSISTENCE HELPERS ---

  // Save settings when they change
  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.THEME_MODE, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.THEME_VARIANT, themeVariant);
  }, [themeVariant]);

  useEffect(() => {
      localStorage.setItem(CACHE_KEYS.WALLPAPER, currentWallpaper);
  }, [currentWallpaper]);

  // --- OAUTH CALLBACK HANDLER ---
  useEffect(() => {
      const hash = window.location.hash;
      // Look for access_token in the URL hash (Google Implicit Flow)
      if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1)); // remove #
          const accessToken = params.get('access_token');
          
          if (accessToken) {
              console.log("Google Access Token detected via URL Hash");
              
              // Save token to localStorage
              localStorage.setItem('google_classroom_token', accessToken);
              
              // Clear the hash from URL to prevent issues and clean up
              window.history.replaceState(null, '', window.location.pathname);
              
              // Automatically open the Settings > Integrations > Classroom panel
              // We use a small timeout to ensure the app is fully mounted/ready if needed
              setTimeout(() => {
                  setCurrentView(ViewState.PROFILE);
                  setProfileInitialTab('settings');
                  setAutoExpandClassroom(true);
              }, 100);
          }
      }
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return; // Prevent repeating keydown events

        // Ignore if user is typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        // ESC to close modals
        if (e.key === 'Escape') {
            handleCloseOverlay();
            return;
        }

        // CTRL + Number for Main Navigation
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
            switch(e.key) {
                case '1': 
                    e.preventDefault();
                    setCurrentView(ViewState.DASHBOARD); 
                    break;
                case '2': 
                    e.preventDefault();
                    setCurrentView(ViewState.GRADES); 
                    break;
                case '3': 
                    e.preventDefault();
                    setCurrentView(ViewState.ABSENCES); 
                    break;
                case '4': 
                    e.preventDefault();
                    setCurrentView(ViewState.SCHEDULE); 
                    break;
                case '5': 
                    e.preventDefault();
                    setCurrentView(ViewState.CLASSROOM); 
                    break;
                case '6': 
                    e.preventDefault();
                    setCurrentView(ViewState.CONCLUSION); 
                    break;
                case 'i':
                case 'I':
                    e.preventDefault();
                    setCurrentView(ViewState.PROFILE);
                    setProfileInitialTab('settings');
                    break;
            }
        }

        // ALT + Number for Right Sidebar Tabs
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
             switch(e.key) {
                case '1':
                    e.preventDefault();
                    setRightSidebarTab('overview');
                    break;
                case '2':
                    e.preventDefault();
                    setRightSidebarTab('tasks');
                    break;
                case '3':
                    e.preventDefault();
                    setRightSidebarTab('holidays');
                    break;
             }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load cached data into state
  const loadCache = () => {
      try {
          const cachedProfile = localStorage.getItem(CACHE_KEYS.PROFILE);
          if (cachedProfile) setUserData(JSON.parse(cachedProfile));

          const cachedAcademic = localStorage.getItem(CACHE_KEYS.ACADEMIC);
          if (cachedAcademic) setAcademicData(JSON.parse(cachedAcademic));

          const cachedCompletion = localStorage.getItem(CACHE_KEYS.COMPLETION);
          if (cachedCompletion) setCompletionData(JSON.parse(cachedCompletion));

          const cachedPeriod = localStorage.getItem(CACHE_KEYS.CURRENT_PERIOD);
          if (cachedPeriod) setCurrentPeriod(JSON.parse(cachedPeriod));

          const cachedGrades = localStorage.getItem(CACHE_KEYS.GRADES);
          if (cachedGrades) setProcessedGrades(JSON.parse(cachedGrades));

          const cachedSchedule = localStorage.getItem(CACHE_KEYS.SCHEDULE);
          if (cachedSchedule) setProcessedSchedule(JSON.parse(cachedSchedule));
          
          const cachedHolidays = localStorage.getItem(CACHE_KEYS.HOLIDAYS);
          if (cachedHolidays) setHolidays(JSON.parse(cachedHolidays));

      } catch (e) {
          console.error("Error loading cache:", e);
      }
  };

  // --- API FETCHING & REFRESH ---

  const refreshSuapToken = async () => {
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
                // Retry with new token
                token = localStorage.getItem('suap_access_token');
                response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
            } else {
                // Refresh failed, logout
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
      // Load from cache first (handled in mount), then update
      const year = new Date().getFullYear();
      try {
          const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
          if (response.ok) {
              const data = await response.json();
              setHolidays(data);
              localStorage.setItem(CACHE_KEYS.HOLIDAYS, JSON.stringify(data));
          }
      } catch (error) {
          console.warn("Failed to update holidays (offline)", error);
      }
  };

  const fetchClassroomData = async () => {
    const token = localStorage.getItem('google_classroom_token');
    if (!token) return;

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

  const fetchUserData = async () => {
    try {
        // 1. User Profile
        const profile = await fetchWithAuth('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/');
        if (profile) {
            setUserData(profile);
            localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profile));
        }

        // 2. Detailed Academic Data (IRA, Matrix, Entry etc)
        const academic = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-dados-aluno/');
        if (academic) {
            setAcademicData(academic);
            localStorage.setItem(CACHE_KEYS.ACADEMIC, JSON.stringify(academic));
        }

        // 3. Completion Requirements
        const completion = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/requisitos-conclusao/');
        if (completion) {
            setCompletionData(completion);
            localStorage.setItem(CACHE_KEYS.COMPLETION, JSON.stringify(completion));
        }

        // 4. Periods (New Endpoint)
        const periods: SuapPeriod[] = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/periodos/');
        if (periods && periods.length > 0) {
            localStorage.setItem(CACHE_KEYS.PERIODS, JSON.stringify(periods));

            // Sort descending by string (e.g. "2025.1" > "2024.2")
            const sortedPeriods = periods.sort((a, b) => b.semestre.localeCompare(a.semestre));
            const activePeriod = sortedPeriods[0]; // Get most recent
            
            setCurrentPeriod(activePeriod);
            localStorage.setItem(CACHE_KEYS.CURRENT_PERIOD, JSON.stringify(activePeriod));
            
            // 5. Fetch Active Data using active semester slug
            if (activePeriod) {
                await fetchAcademicData(activePeriod.semestre);
            }
        }
        
        // 6. Fetch Classroom
        fetchClassroomData();

    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  const fetchAcademicData = async (semestre: string) => {
      const [ano, periodo] = semestre.split('.');
      
      // Boletim
      const boletim = await fetchWithAuth(`https://suap.ifrn.edu.br/api/v2/minhas-informacoes/boletim/${ano}/${periodo}/`);
      if (boletim) {
          processGrades(boletim);
      }

      // Diarios (New Schedule Endpoint)
      const diariosResponse: SuapDiarioResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/diarios/${semestre}/`);
      
      let diariosList = [];
      if (Array.isArray(diariosResponse)) {
          diariosList = diariosResponse;
      } else if (diariosResponse && Array.isArray(diariosResponse.results)) {
          diariosList = diariosResponse.results;
      }

      if (diariosList.length > 0) {
          processSchedule(diariosList);
      }
  };

  // --- PROCESSING LOGIC ---

  const processGrades = (boletim: SuapBoletim[]) => {
      const processed: GradeInfo[] = boletim.map(b => ({
          subject: b.disciplina.replace(/\(.*\)/, '').trim(), // Clean name
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
          limit: Math.floor(b.carga_horaria * 0.25) // 25% Rule
      }));
      
      setProcessedGrades(processed);
      localStorage.setItem(CACHE_KEYS.GRADES, JSON.stringify(processed));
  };

  const processSchedule = (diarios: any[]) => {
      const parsedClasses: ProcessedClass[] = [];
      
      const dayOrder: Record<string, number> = { 
          'Segunda': 2, 'Terça': 3, 'Quarta': 4, 
          'Quinta': 5, 'Sexta': 6, 'Sábado': 7, 'Domingo': 1 
      };

      diarios.forEach(diario => {
          if (!diario.horarios || diario.horarios.length === 0) return;
          
          diario.horarios.forEach((h: any) => {
              const times = h.horario.split(' - ');
              const startTime = times[0] || "00:00";
              const endTime = times[1] || "00:00";
              
              const fullName = diario.disciplina?.descricao || "Disciplina";
              const shortName = diario.disciplina?.sigla || "---";
              
              const fullRoom = diario.local?.sala || "Sem local definido";
              let shortRoom = "Local ?";
              if (fullRoom.includes(" - ")) {
                 const parts = fullRoom.split(" - ");
                 shortRoom = parts[1] || parts[0]; 
              } else {
                 shortRoom = fullRoom;
              }
              
              if (shortRoom.length > 15) shortRoom = shortRoom.substring(0, 15) + '...';

              const professors = diario.professores?.map((p: any) => p.nome) || [];

              parsedClasses.push({
                  day: h.dia,
                  dayInt: dayOrder[h.dia] || 8,
                  startTime,
                  endTime,
                  timeLabel: h.horario,
                  name: fullName.replace(/\(.*\)/, '').trim(),
                  shortName: shortName,
                  room: shortRoom,
                  fullRoom: fullRoom,
                  professors: professors,
                  type: 'Aula'
              });
          });
      });

      const sortedSchedule = parsedClasses.sort((a, b) => {
          if (a.dayInt !== b.dayInt) return a.dayInt - b.dayInt;
          return a.startTime.localeCompare(b.startTime);
      });

      setProcessedSchedule(sortedSchedule);
      localStorage.setItem(CACHE_KEYS.SCHEDULE, JSON.stringify(sortedSchedule));
  };

  // --- INITIALIZATION ---
  
  useEffect(() => {
    // 1. Immediately load whatever we have in cache to show UI
    loadCache();
    fetchHolidays(); 

    // 2. Check authentication and fetch fresh data in background
    const token = localStorage.getItem('suap_access_token');
    if (token) {
      setIsLoggedIn(true);
      fetchUserData();
    }
  }, []);

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
    // Reset profile tab to default if opening via click
    if (view === ViewState.PROFILE) setProfileInitialTab('profile');
  };

  const handleCloseOverlay = () => {
    setCurrentView(ViewState.DASHBOARD);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = () => {
      setIsLoggedIn(true);
      fetchUserData();
  };

  const handleLogout = () => {
      // Clear Authentication
      localStorage.removeItem('suap_access_token');
      localStorage.removeItem('suap_refresh_token');
      localStorage.removeItem('suap_username');
      localStorage.removeItem('google_classroom_token'); // Also clear integration
      
      // Clear User Data Cache (But keep settings like wallpaper/api key)
      localStorage.removeItem(CACHE_KEYS.PROFILE);
      localStorage.removeItem(CACHE_KEYS.ACADEMIC);
      localStorage.removeItem(CACHE_KEYS.COMPLETION);
      localStorage.removeItem(CACHE_KEYS.GRADES);
      localStorage.removeItem(CACHE_KEYS.SCHEDULE);
      localStorage.removeItem(CACHE_KEYS.CURRENT_PERIOD);
      localStorage.removeItem(CACHE_KEYS.PERIODS);

      // Reset State
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

  // Calculate Active Palette based on Variant & Wallpaper
  const palette = useMemo((): Palette => {
      switch (themeVariant) {
          case 'monochrome': 
              return { primary: 'zinc', secondary: 'zinc' }; // All Gray
          case 'saturated': 
              return { primary: 'fuchsia', secondary: 'cyan' }; // High Vibrancy
          case 'dynamic': 
              // Fallback to default if wallpaper not found in map
              return WALLPAPER_THEMES[currentWallpaper] || { primary: 'emerald', secondary: 'rose' };
          default: 
              return { primary: 'emerald', secondary: 'rose' }; // Classic Default
      }
  }, [themeVariant, currentWallpaper]);

  return (
    <div className={`font-sans antialiased transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Base Layout */}
      <DashboardLayout 
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
      />

      {/* Overlays */}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
