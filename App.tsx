import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { supabase } from './services/supabaseClient';
import { WifiOff, RefreshCw, AlertTriangle, X } from 'lucide-react';

import { SplashScreen } from './components/SplashScreen';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapDiario, SuapBoletim, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse, PerformanceSettings, SuapMeusPeriodosLetivos, TodoItem, GoogleTokens } from './types';
import { googleCredentials } from './google_credentials';

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
const GOOGLE_CLIENT_ID = googleCredentials.web.client_id;
const GOOGLE_CLIENT_SECRET = googleCredentials.web.client_secret;

// FIX: Always use /callback for consistency, regardless of environment.
// Ensure your Google Cloud Console has "http://localhost:PORT/callback" added to Authorized Redirect URIs.
const REDIRECT_URI = `${window.location.origin}/callback`;

// Cache Keys (Settings only - Data is now in SecureStorage)
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    PERFORMANCE: 'suap_performance_settings',
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
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>
    },
    {
        targetId: 'tut-widgets',
        mobileTargetId: 'tut-widgets',
        title: 'Ferramentas Inteligentes',
        description: 'Converse com a IA sobre suas notas ou use o Pomodoro para focar nos estudos.',
        position: 'top',
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
    },
    {
        targetId: 'tut-profile',
        mobileTargetId: 'tut-profile-mobile',
        title: 'Seu Perfil',
        description: 'Personalize o tema, troque o papel de parede e sincronize seus dados com a nuvem.',
        position: 'left',
        icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
    }
];

// --- TOAST INTERFACE ---
interface Toast {
    id: string;
    message: string;
    type: 'warning' | 'info';
}

const App: React.FC = () => {
  // --- APPLICATION READY STATE ---
  const [isAppReady, setIsAppReady] = useState(false);

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

  // Premium State
  const [isPremium, setIsPremium] = useState(false); // Initial state false, will check DB
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Profile Photo State
  const [customPhotoUrl, setCustomPhotoUrl] = useState(localStorage.getItem('suap_custom_photo') || '');
  const [useCustomPhoto, setUseCustomPhoto] = useState(localStorage.getItem('suap_use_custom_photo') === 'true');
  
  // UI State
  const [rightSidebarTab, setRightSidebarTab] = useState<'overview' | 'tasks' | 'holidays' | 'achievements'>('overview');
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'settings' | 'wallpaper' | 'performance' | 'achievements'>('profile');

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
  
  // Classroom State
  const [classroomStatus, setClassroomStatus] = useState<'connected' | 'disconnected' | 'expired'>('disconnected');
  const [isClassroomLinked, setIsClassroomLinked] = useState(false); // Legacy boolean, kept for compatibility

  // Todo List State
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // Auto Expand Classroom Setting Logic
  const [autoExpandClassroom, setAutoExpandClassroom] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Notifications State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- INITIAL LOAD SEQUENCE ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Wait for Fonts
      try {
        await document.fonts.ready;
      } catch (e) {
        console.warn("Fonts loading timeout");
      }

      // 2. Initial Data Load from Cache (Sync)
      fetchHolidays(); 
      const token = localStorage.getItem('suap_access_token');
      const matricula = localStorage.getItem('suap_username');

      if (token && matricula) {
        setIsLoggedIn(true);
        loadUserCache(matricula);
        // Start async background fetch
        if (navigator.onLine) {
          fetchAllUserDataBackground(matricula, false);
          checkSubscription(matricula);
        }
      }

      // 3. Preload Wallpaper Image to avoid white flash
      if (currentWallpaper) {
          const img = new Image();
          img.src = currentWallpaper;
          // We don't await the image fully loading, just kickoff
      }

      // 4. Force a minimum splash screen duration for aesthetics
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsAppReady(true);
    };

    initApp();
  }, []);

  const addToast = (message: string, type: 'warning' | 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- CHECK SUBSCRIPTION STATUS ---
  const checkSubscription = async (matricula: string) => {
      try {
          const isActive = await SecureStorage.checkSubscriptionStatus(matricula);
          setIsPremium(isActive);
      } catch (e) {
          console.error("Failed to check subscription:", e);
      }
  };

  // --- ATTENDANCE RISK CHECKER ---
  useEffect(() => {
      if (processedGrades.length > 0) {
          processedGrades.forEach(grade => {
              if (grade.limit > 0) {
                  const percentage = grade.absences / grade.limit;
                  const remaining = grade.limit - grade.absences;
                  // Unique ID for this specific alert to avoid spamming every render
                  const alertId = `risk-${grade.code}-${grade.absences}`;
                  
                  // Trigger if > 75% used AND not already notified for this exact absence count
                  if (percentage >= 0.75 && remaining >= 0) {
                      const sessionKey = `notified_${alertId}`;
                      if (!sessionStorage.getItem(sessionKey)) {
                          const statusMsg = remaining === 0 
                              ? `Limite atingido em ${grade.subject}!` 
                              : `Cuidado! ${grade.subject} atingiu ${(percentage * 100).toFixed(0)}% do limite.`;
                          
                          addToast(statusMsg, 'warning');
                          sessionStorage.setItem(sessionKey, 'true');
                      }
                  }
              }
          });
      }
  }, [processedGrades]);


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

  // --- APPLY SETTINGS HELPER (New) ---
  const applySettingsFromCache = () => {
      console.log("[App] Applying visual settings from cache...");
      const mode = localStorage.getItem(CACHE_KEYS.THEME_MODE);
      if (mode) setIsDarkMode(mode === 'dark');

      const variant = localStorage.getItem(CACHE_KEYS.THEME_VARIANT);
      if (variant) setThemeVariant(variant as ThemeVariant);

      const wall = localStorage.getItem(CACHE_KEYS.WALLPAPER);
      if (wall) setCurrentWallpaper(wall);

      const perf = localStorage.getItem(CACHE_KEYS.PERFORMANCE);
      if (perf) setPerformanceSettings(JSON.parse(perf));

      const photo = localStorage.getItem('suap_custom_photo');
      if (photo) setCustomPhotoUrl(photo);

      const usePhoto = localStorage.getItem('suap_use_custom_photo');
      if (usePhoto) setUseCustomPhoto(usePhoto === 'true');
  };

  // Check Tutorial Status whenever Login or Landing changes
  useEffect(() => {
      if (isLoggedIn && !showLanding) {
          const matricula = localStorage.getItem('suap_username');
          // If we have a user, check cloud for existing data to SKIP tutorial
          if (matricula) {
             // We do this check first
             SecureStorage.syncFromCloud(matricula).then((result) => {
                if (result && result.hasData) {
                    console.log("[App] User has cloud data. Skipping tutorial.");
                    localStorage.setItem(CACHE_KEYS.TUTORIAL_SEEN, 'true');
                    setShowTutorial(false);
                    // Also apply settings if found
                    if(result.settings) applySettingsFromCache();
                } else {
                    // Normal flow for new/local users
                    const seen = localStorage.getItem(CACHE_KEYS.TUTORIAL_SEEN);
                    if (!seen) {
                        const t = setTimeout(() => setShowTutorial(true), 1500);
                        return () => clearTimeout(t);
                    }
                }
             });
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

  const handleSubscribe = () => {
      setIsPremium(true);
      addToast("Bem-vindo ao Supaco Premium!", "info");
      // Trigger re-check
      if (userData?.matricula) checkSubscription(userData.matricula);
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
  }, [currentView, currentWallpaper, customPhotoUrl, useCustomPhoto, themeVariant, isDarkMode, performanceSettings, isLoggedIn, userData?.matricula]);


  // Calculate Active User Photo
  const activeUserPhoto = useMemo(() => {
      // 1. Custom Photo (Highest Priority)
      if (useCustomPhoto && customPhotoUrl) return customPhotoUrl;
      
      // 2. SUAP High Res
      if (userData?.url_foto_150x200) {
          return userData.url_foto_150x200.startsWith('http') ? userData.url_foto_150x200 : `https://suap.ifrn.edu.br${userData.url_foto_150x200}`;
      }
      
      // 3. SUAP Default
      if (userData?.foto) {
          return userData.foto.startsWith('http') ? userData.foto : `https://suap.ifrn.edu.br${userData.foto}`;
      }
      
      // 4. Fallback
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

  // --- SUAP OAUTH TOKEN EXCHANGE ---
  const exchangeSuapCodeForToken = async (code: string) => {
      const CLIENT_ID = 'mtwXt4wCesctJiKA6BbRQ7DMROTJeNosSpQUc7dm';
      const CLIENT_SECRET = 'zPYe7h1xr3Vv1yE38N8ziV56oAcmlJVMQIZP3BCFbuftEyu6whAbvoj7e8oKXU6jcbv9RVosL63fs4SBNnsESnPvozo2bodmvbp7dABOk566Dz88S3UMwKDTwwe6wL2G';
      const SUAP_REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:5173/' : 'https://supaco.vercel.app/'; 

      try {
          const response = await fetch('https://suap.ifrn.edu.br/o/token/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                  grant_type: 'authorization_code',
                  code: code,
                  client_id: CLIENT_ID,
                  client_secret: CLIENT_SECRET,
                  redirect_uri: SUAP_REDIRECT_URI
              })
          });

          if (response.ok) {
              const data = await response.json();
              if (data.access_token) {
                  localStorage.setItem('suap_access_token', data.access_token);
                  if (data.refresh_token) localStorage.setItem('suap_refresh_token', data.refresh_token);
                  
                  // Clean URL
                  window.history.replaceState({}, document.title, window.location.pathname);
                  
                  // Fetch Profile to get username (matricula) since OAuth doesn't return it directly in token response usually
                  const profileRes = await fetch('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/', {
                      headers: {
                          'Authorization': `Bearer ${data.access_token}`
                      }
                  });
                  
                  if (profileRes.ok) {
                      const profile = await profileRes.json();
                      if (profile.matricula) {
                          localStorage.setItem('suap_username', profile.matricula);
                          setUserData(profile);
                          setIsLoggedIn(true);
                          setShowLanding(false);
                          localStorage.setItem(CACHE_KEYS.WELCOME_SEEN, 'true');
                          fetchAllUserDataBackground(profile.matricula, true);
                          // Check Premium Status
                          checkSubscription(profile.matricula);
                      }
                  }
              }
          } else {
              console.error("Failed to exchange token", await response.text());
          }
      } catch (error) {
          console.error("OAuth Exchange Error", error);
      }
  };

  // --- GOOGLE CLASSROOM OAUTH (Code Flow) ---
  const initiateGoogleAuth = () => {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly',
        access_type: 'offline', // Required for refresh_token
        prompt: 'consent', // Force consent to ensure refresh_token is returned
        state: 'google_auth'
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const exchangeGoogleCode = async (code: string) => {
    try {
        console.log("Exchanging Google Code with redirect_uri:", REDIRECT_URI);
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        if (response.ok) {
            const data = await response.json();
            const matricula = localStorage.getItem('suap_username');
            
            if (data.access_token && matricula) {
                const tokens: GoogleTokens = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token, // Only returned if access_type=offline and prompt=consent
                    expiry_date: Date.now() + (data.expires_in * 1000)
                };

                SecureStorage.saveItem(matricula, 'google_tokens', tokens);
                
                // Also trigger sync to save refresh token to Supabase for other devices
                SecureStorage.syncToCloud(matricula);

                setIsClassroomLinked(true);
                setClassroomStatus('connected');
                
                // Clean URL completely (remove /callback part if present)
                window.history.replaceState({}, document.title, '/');
                
                // Fetch data immediately
                fetchClassroomData(matricula);

                // UI Feedback
                addToast("Google Classroom conectado com sucesso!", "info");
                setTimeout(() => {
                    setCurrentView(ViewState.CLASSROOM);
                }, 500);
            }
        } else {
             const errText = await response.text();
             console.error("Google Token Exchange Failed", errText);
             addToast("Falha ao conectar Classroom. Tente novamente.", "warning");
        }
    } catch (e) {
        console.error("Google Token Exchange Error", e);
        addToast("Erro de conexão com Google.", "warning");
    }
  };

  const refreshGoogleToken = async (refreshToken: string, matricula: string): Promise<string | null> => {
      try {
          console.log("[Classroom] Refreshing access token...");
          const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                  client_id: GOOGLE_CLIENT_ID,
                  client_secret: GOOGLE_CLIENT_SECRET,
                  refresh_token: refreshToken,
                  grant_type: 'refresh_token'
              })
          });

          if (response.ok) {
              const data = await response.json();
              if (data.access_token) {
                  const currentTokens = SecureStorage.loadItem(matricula, 'google_tokens') as GoogleTokens;
                  const newTokens: GoogleTokens = {
                      ...currentTokens,
                      access_token: data.access_token,
                      // Important: Google might return a new refresh token (rarely) or just access token.
                      // If it returns a new refresh_token, we should update it.
                      refresh_token: data.refresh_token || currentTokens.refresh_token, 
                      expiry_date: Date.now() + (data.expires_in * 1000)
                  };
                  SecureStorage.saveItem(matricula, 'google_tokens', newTokens);
                  // Sync updated access token (optional, mainly for local usage)
                  return data.access_token;
              }
          } else {
              console.error("[Classroom] Refresh failed. Token might be revoked.");
          }
      } catch (e) {
          console.error("[Classroom] Refresh error", e);
      }
      return null;
  };


  // --- OAUTH CALLBACK HANDLER ---
  useEffect(() => {
      // Check current path to see if we are in a callback
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      // Distinguish between SUAP and Google based on state
      if (code) {
          if (state === 'google_auth') {
              // It's Google
              exchangeGoogleCode(code);
          } else {
              // Assume SUAP if no state or different state
              // (SUAP in LandingPage usually handles this, but if user refreshed on callback url)
              exchangeSuapCodeForToken(code);
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
  const processGradesFromBoletim = (boletim: SuapBoletim[]): GradeInfo[] => {
      return boletim.map(b => {
          const cleanSubject = b.disciplina.includes(' - ') 
              ? b.disciplina.split(' - ').slice(1).join(' - ') 
              : b.disciplina;

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
          
          // Load Classroom from Cache (Hydrate Dates)
          const classroom = SecureStorage.loadItem(matricula, 'classroom');
          if (classroom) {
              const hydrated = classroom.map((w: any) => ({
                  ...w,
                  jsDate: w.jsDate ? new Date(w.jsDate) : undefined
              }));
              setClassroomWork(hydrated);
          }
          
          // Check Token Status
          const gTokens = SecureStorage.loadItem(matricula, 'google_tokens') as GoogleTokens;
          if (gTokens && gTokens.access_token) {
              setIsClassroomLinked(true);
              if (gTokens.expiry_date && gTokens.expiry_date < Date.now()) {
                  setClassroomStatus('expired');
              } else {
                  setClassroomStatus('connected');
              }
          } else {
              setIsClassroomLinked(false);
              setClassroomStatus('disconnected');
          }

          // Apply visual settings that might be stored
          applySettingsFromCache();

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
                // Do NOT wipe data, just mark session as invalid to allow offline mode
                setIsLoggedIn(false);
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
      // Very basic caching for holidays (weekly)
      const lastFetch = localStorage.getItem('suap_cache_holidays_ts');
      const now = Date.now();
      if (lastFetch && (now - parseInt(lastFetch)) < 1000 * 60 * 60 * 24 * 7) {
          // Valid cache, do nothing as loaded in loadUserCache/Initial
          return;
      }

      const year = new Date().getFullYear();
      try {
          const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
          if (response.ok) {
              const data = await response.json();
              setHolidays(data);
              localStorage.setItem('suap_cache_holidays', JSON.stringify(data));
              localStorage.setItem('suap_cache_holidays_ts', now.toString());
          }
      } catch (error) { console.warn("Failed to update holidays (offline)", error); }
  };

  const fetchClassroomData = async (currentMatricula: string) => {
    if (!navigator.onLine) return;

    let tokens = SecureStorage.loadItem(currentMatricula, 'google_tokens') as GoogleTokens;
    if (!tokens || !tokens.access_token) {
        setIsClassroomLinked(false);
        setClassroomStatus('disconnected');
        return;
    }

    // Check Expiry and Refresh if needed
    if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 60000) { // Buffer 1 min
        if (tokens.refresh_token) {
             const newAccessToken = await refreshGoogleToken(tokens.refresh_token, currentMatricula);
             if (newAccessToken) {
                 tokens.access_token = newAccessToken; // Update local ref
                 setClassroomStatus('connected'); // Reconnected successfully
             } else {
                 setClassroomStatus('expired');
                 return; // Stop if refresh failed
             }
        } else {
             // No refresh token available, must reconnect
             setClassroomStatus('expired');
             return;
        }
    } else {
        setIsClassroomLinked(true);
        setClassroomStatus('connected');
    }
    
    // Check Cache (30 min TTL) - Only do this AFTER token check so we don't fetch if disconnected
    if (SecureStorage.isCacheValid(currentMatricula, 'classroom', 30)) {
        return;
    }

    try {
        const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        
        if (coursesRes.status === 401) {
            // Token rejected even after check (revoked?)
             setClassroomStatus('expired');
             return;
        }

        if (!coursesRes.ok) return;

        const coursesData = await coursesRes.json();
        const courses: ClassroomCourse[] = coursesData.courses || [];
        const workPromises = courses.map(async (course) => {
            const workRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate desc`, {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
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
        SecureStorage.saveItem(currentMatricula, 'classroom', futureWork);

    } catch (e) { 
        console.error("Failed to fetch classroom data", e); 
    }
  };

  // --- BACKGROUND SYNC ENGINE ---
  const fetchAllUserDataBackground = async (currentMatricula: string, forceRefresh = false) => {
    console.log(`[App] Syncing data for ${currentMatricula} (Force: ${forceRefresh})`);
    
    const shouldFetch = (key: string, ttlMinutes: number = 60) => {
        if (forceRefresh) return true;
        return !SecureStorage.isCacheValid(currentMatricula, key, ttlMinutes); 
    };

    try {
        setIsSyncing(true);

        const cloudResult = await SecureStorage.syncFromCloud(currentMatricula);
        if (cloudResult && cloudResult.hasData && cloudResult.settings) {
            applySettingsFromCache(); 
        }

        // Check classroom status from cloud data
        const gTokens = SecureStorage.loadItem(currentMatricula, 'google_tokens') as GoogleTokens;
        if (gTokens?.access_token) {
            setIsClassroomLinked(true);
            if (gTokens.expiry_date && gTokens.expiry_date < Date.now() && !gTokens.refresh_token) {
                 setClassroomStatus('expired');
            } else {
                 setClassroomStatus('connected');
            }
        }

        if (shouldFetch('profile', 1440)) {
            const profile = await fetchWithAuth('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/');
            if (profile) {
                setUserData(profile);
                SecureStorage.saveItem(currentMatricula, 'profile', profile);
            }
        }

        if (shouldFetch('academic', 1440)) {
            const academic = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-dados-aluno/');
            if (academic) {
                setAcademicData(academic);
                SecureStorage.saveItem(currentMatricula, 'academic', academic);
            }
        }

        if (shouldFetch('completion', 1440)) {
            const completion = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/requisitos-conclusao/');
            if (completion) {
                setCompletionData(completion);
                SecureStorage.saveItem(currentMatricula, 'completion', completion);
            }
        }

        let periodList = SecureStorage.loadItem(currentMatricula, 'periods');
        let activePeriod = SecureStorage.loadItem(currentMatricula, 'active_period');

        if (!periodList || shouldFetch('periods', 1440)) {
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

        if (activePeriod) {
            const cacheKeyGrades = `grades_${activePeriod.semestre}`;
            const cacheKeySchedule = `schedule_${activePeriod.semestre}`;

            if (shouldFetch(cacheKeyGrades, 60) || shouldFetch(cacheKeySchedule, 60) || forceRefresh) {
                await fetchAcademicDetails(activePeriod.semestre, currentMatricula, true);
            }
        }
        
        await fetchClassroomData(currentMatricula);

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

      if (!cachedGrades || !cachedSchedule || !SecureStorage.isCacheValid(matricula, `grades_${semestre}`, 60)) {
           setIsSyncing(true);
           try {
               await fetchAcademicDetails(semestre, matricula, true); 
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

  const handleManualRefresh = () => {
    const matricula = localStorage.getItem('suap_username');
    if (matricula && navigator.onLine) {
        fetchAllUserDataBackground(matricula, true);
        checkSubscription(matricula);
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
          checkSubscription(matricula);
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
      setClassroomStatus('disconnected');
      
      setIsLoggedIn(false);
      setCurrentView(ViewState.DASHBOARD);
      setIsPremium(false);
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

  if (!isAppReady) {
    return <SplashScreen />;
  }

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

      {/* --- PREMIUM MODAL --- */}
      <AnimatePresence>
          {showPremiumModal && (
              <Suspense fallback={null}>
                <PremiumModal 
                    onClose={() => setShowPremiumModal(false)}
                    onSubscribe={handleSubscribe}
                    isDarkMode={isDarkMode}
                    accentColor={palette.primary}
                    userData={userData}
                />
              </Suspense>
          )}
      </AnimatePresence>

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

       {/* --- NOTIFICATION TOASTS --- */}
       <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
          <AnimatePresence>
              {toasts.map(toast => (
                  <motion.div
                      key={toast.id}
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border cursor-pointer max-w-[90vw] md:max-w-md
                          ${toast.type === 'warning' 
                              ? (isDarkMode ? 'bg-orange-500/20 border-orange-500/30 text-white' : 'bg-orange-50 border-orange-200 text-gray-900') 
                              : (isDarkMode ? 'bg-blue-500/20 border-blue-500/30 text-white' : 'bg-blue-50 border-blue-200 text-gray-900')}
                      `}
                      onClick={() => removeToast(toast.id)}
                  >
                      <div className={`p-1.5 rounded-full shrink-0 ${toast.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                          <AlertTriangle size={14} fill="currentColor" />
                      </div>
                      <span className="text-xs font-bold leading-tight">{toast.message}</span>
                      <X size={14} className="opacity-50 hover:opacity-100 ml-1" />
                  </motion.div>
              ))}
          </AnimatePresence>
      </div>

      <div className={showLanding ? 'fixed inset-0' : ''}>
        
        {themeVariant === 'sepia' && (
            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.12] mix-blend-overlay" 
                 style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}} 
            />
        )}
        
        <div style={{ filter: themeVariant === 'sepia' ? 'sepia(80%) contrast(90%)' : 'none', transition: 'filter 0.5s ease' }} className="h-full w-full absolute inset-0 z-0" />

        <div className="relative z-10 h-full">
            <Suspense fallback={null}>
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
                    academicData={academicData}
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
                    onLinkClassroom={initiateGoogleAuth}
                    todos={todos}
                    onAddTodo={handleAddTodo}
                    onToggleTodo={handleToggleTodo}
                    onRemoveTodo={handleRemoveTodo}
                    classroomStatus={classroomStatus}
                />
            </Suspense>

            <AnimatePresence>
                {/* TUTORIAL OVERLAY */}
                {showTutorial && (
                    <Suspense fallback={null}>
                        <TutorialOverlay 
                            steps={TUTORIAL_STEPS}
                            onComplete={handleFinishTutorial}
                            isDarkMode={isDarkMode}
                            primaryColor={palette.primary}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {currentView !== ViewState.DASHBOARD && (
                <Suspense fallback={null}>
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
                        // Premium Props
                        isPremium={isPremium}
                        onOpenPremiumModal={() => setShowPremiumModal(true)}
                        // Classroom Props
                        classroomWork={classroomWork}
                        isClassroomLinked={isClassroomLinked}
                        onLinkClassroom={initiateGoogleAuth}
                        classroomStatus={classroomStatus}
                    />
                </Suspense>
                )}
            </AnimatePresence>

            {isLoggedIn && (
                <div 
                    id="tut-widgets"
                    className="fixed md:absolute bottom-24 md:bottom-10 left-0 md:left-[322px] right-0 z-[250] flex justify-center items-end pointer-events-none px-4 md:px-0 transition-opacity duration-1000 opacity-100"
                >
                    <div className="pointer-events-auto flex items-end gap-4 w-full max-w-md md:w-auto justify-center md:justify-start">
                        <Suspense fallback={null}>
                            <PomodoroWidget isDarkMode={isDarkMode} primaryColor={palette.primary} />
                        </Suspense>
                        <Suspense fallback={null}>
                            <AIChatWidget 
                                isDarkMode={isDarkMode} 
                                accentColor={palette.primary} 
                                userData={userData}
                                grades={processedGrades}
                                schedule={processedSchedule}
                                holidays={holidays}
                                onRequestSettings={handleOpenSettings}
                                isPremium={isPremium}
                                internalApiKey={SUPACO_INTERNAL_KEY}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
            
            {(isLoggedIn || userData) && !showLanding && (
               <Suspense fallback={null}>
                   <MobileNavBar 
                     currentView={currentView}
                     onChangeView={handleViewChange}
                     isDarkMode={isDarkMode}
                     primaryColor={palette.primary}
                   />
               </Suspense>
            )}
        </div>
      </div>

      <AnimatePresence>
        {showLanding && (
            <Suspense fallback={null}>
                <LandingPage 
                    key="landing"
                    onComplete={handleFinishLanding}
                    onLogin={handleLogin} 
                    isDarkMode={isDarkMode} 
                    primaryColor={palette.primary}
                    currentWallpaper={currentWallpaper}
                />
            </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;