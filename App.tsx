import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SecureStorage } from './services/SecureStorage';
import { supabase } from './services/supabaseClient';
import { WifiOff, RefreshCw, AlertTriangle, X, Sparkles } from 'lucide-react';

import { SplashScreen } from './components/SplashScreen';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapDiario, SuapBoletim, ProcessedClass, GradeInfo, SuapCompletionData, Holiday, ClassroomWork, ClassroomCourse, PerformanceSettings, SuapMeusPeriodosLetivos, TodoItem, GoogleTokens, SupacoNotification, SuapMessage } from './types';
import { googleCredentials } from './google_credentials';
import { geminiCredentials } from './gemini_credentials';
import { CallbackPage } from './components/CallbackPage';

// --- DYNAMIC IMPORTS (Code Splitting) ---
const DashboardLayout = React.lazy(() => import('./components/DashboardLayout').then(module => ({ default: module.DashboardLayout })));
const ContentView = React.lazy(() => import('./components/ContentViews').then(module => ({ default: module.ContentView })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const MobileNavBar = React.lazy(() => import('./components/MobileNavBar').then(module => ({ default: module.MobileNavBar })));
const TutorialOverlay = React.lazy(() => import('./components/TutorialOverlay').then(module => ({ default: module.TutorialOverlay })));
const PremiumModal = React.lazy(() => import('./components/PremiumModal').then(module => ({ default: module.PremiumModal })));
const AIChatWidget = React.lazy(() => import('./components/AIChatWidget').then(module => ({ default: module.AIChatWidget })));
const PomodoroWidget = React.lazy(() => import('./components/PomodoroWidget').then(module => ({ default: module.PomodoroWidget })));
const UpdateNewsModal = React.lazy(() => import('./components/modals/UpdateNewsModal').then(module => ({ default: module.UpdateNewsModal })));

const DEFAULT_WALLPAPER = "https://images.alphacoders.com/134/thumb-1920-1347517.png";
const DEFAULT_PROFILE_IMG = "https://i.pinimg.com/736x/9c/63/e1/9c63e1cf0546ecd4f83b7df067f440d2.jpg";

// --- INTERNAL CONFIG ---
const SUPACO_INTERNAL_KEY = geminiCredentials.apiKey;
const CURRENT_APP_VERSION = "2.7.0";

// --- GOOGLE OAUTH CONFIG ---
const GOOGLE_CLIENT_ID = googleCredentials.web.client_id;
const GOOGLE_CLIENT_SECRET = googleCredentials.web.client_secret;

// FIX: Always use /callback for consistency, regardless of environment.
const REDIRECT_URI = `${window.location.origin}/callback`;

// Cache Keys
const CACHE_KEYS = {
    WALLPAPER: 'suap_saved_wallpaper',
    THEME_VARIANT: 'suap_saved_theme_variant',
    THEME_MODE: 'suap_saved_theme_mode',
    PERFORMANCE: 'suap_performance_settings',
    WELCOME_SEEN: 'suap_welcome_seen',
    TUTORIAL_SEEN: 'suap_tutorial_completed_v1',
    IS_PREMIUM: 'suap_user_is_premium',
    LAST_VERSION_SEEN: 'suap_last_version_seen'
};

const DEFAULT_PERFORMANCE: PerformanceSettings = {
    reduceMotion: false,
    disableBlur: false,
    disableGlow: false
};

interface Palette {
    primary: string;   
    secondary: string; 
}

// Wallpaper to Palette Map
const WALLPAPER_THEMES: Record<string, Palette> = {
    "https://images.alphacoders.com/134/thumb-1920-1347517.png": { primary: "blue", secondary: "sky" },
    "https://images2.alphacoders.com/134/thumb-1920-1345658.png": { primary: "rose", secondary: "pink" },
    "https://images7.alphacoders.com/134/thumb-1920-1344447.png": { primary: "amber", secondary: "orange" },
    "https://images7.alphacoders.com/140/thumb-1920-1402439.jpg": { primary: "slate", secondary: "zinc" },
    "https://images6.alphacoders.com/129/thumb-1920-1297223.jpg": { primary: "orange", secondary: "red" },
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

const TUTORIAL_STEPS: any[] = [
    { targetId: 'tut-carousel', mobileTargetId: 'tut-carousel', title: 'Visão Geral', description: 'Aqui ficam seus cartões principais. Deslize para ver horários, feriados e tarefas pendentes de forma rápida.', position: 'right', icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div> },
    { targetId: 'tut-nav-desktop', mobileTargetId: 'tut-nav-mobile', title: 'Navegação', description: 'Acesse suas notas detalhadas, faltas e grade de horários e integração com o Google Classroom. Uma experiência acadêmica fluida e inteligente.', position: 'right', icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div> },
    { targetId: 'tut-widgets', mobileTargetId: 'tut-widgets', title: 'Ferramentas Inteligentes', description: 'Converse com a IA sobre suas notas ou use o Pomodoro para focar nos estudos.', position: 'top', icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div> },
    { targetId: 'tut-profile', mobileTargetId: 'tut-profile-mobile', title: 'Seu Perfil', description: 'Personalize o tema, troque o papel de parede e sincronize seus dados com a nuvem.', position: 'left', icon: <div className="p-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div> }
];

interface Toast {
    id: string;
    message: string;
    type: 'warning' | 'info';
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const App: React.FC = () => {
  const [isCallbackRoute, setIsCallbackRoute] = useState(() => window.location.pathname === '/callback');
  const [isAppReady, setIsAppReady] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
      return !localStorage.getItem(CACHE_KEYS.WELCOME_SEEN) && window.location.pathname !== '/callback';
  });

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem(CACHE_KEYS.THEME_MODE) === 'dark');
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => (localStorage.getItem(CACHE_KEYS.THEME_VARIANT) as ThemeVariant) || 'dynamic');
  const [currentWallpaper, setCurrentWallpaper] = useState(() => localStorage.getItem(CACHE_KEYS.WALLPAPER) || DEFAULT_WALLPAPER);
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>(() => {
      const saved = localStorage.getItem(CACHE_KEYS.PERFORMANCE);
      return saved ? JSON.parse(saved) : DEFAULT_PERFORMANCE;
  });

  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState(localStorage.getItem('suap_custom_photo') || '');
  const [useCustomPhoto, setUseCustomPhoto] = useState(localStorage.getItem('suap_use_custom_photo') === 'true');
  
  const [rightSidebarTab, setRightSidebarTab] = useState<'overview' | 'tasks' | 'holidays' | 'achievements' | 'notifications'>('overview');
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'settings' | 'wallpaper' | 'performance' | 'achievements'>('profile');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showUpdateNews, setShowUpdateNews] = useState(false);

  const [userData, setUserData] = useState<SuapProfile | null>(null);
  const [academicData, setAcademicData] = useState<SuapMeusDadosAluno | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<SuapPeriod | null>(null);
  const [periods, setPeriods] = useState<SuapPeriod[]>([]);
  const [viewingPeriod, setViewingPeriod] = useState<SuapPeriod | null>(null);

  const [processedSchedule, setProcessedSchedule] = useState<ProcessedClass[]>([]);
  const [processedGrades, setProcessedGrades] = useState<GradeInfo[]>([]);
  const [completionData, setCompletionData] = useState<SuapCompletionData | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [classroomWork, setClassroomWork] = useState<ClassroomWork[]>([]);
  const [classroomStatus, setClassroomStatus] = useState<'connected' | 'disconnected' | 'expired'>('disconnected');
  const [isClassroomLinked, setIsClassroomLinked] = useState(false);
  const [googleUser, setGoogleUser] = useState<{email: string, name: string, picture: string} | null>(null);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [notifications, setNotifications] = useState<SupacoNotification[]>([]);
  const [autoExpandClassroom, setAutoExpandClassroom] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // AI Chat Context Transfer State
  const [initialChatContext, setInitialChatContext] = useState<ChatMessage[] | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const initApp = async () => {
      try { await document.fonts.ready; } catch (e) { console.warn("Fonts loading timeout"); }

      fetchHolidays(); 
      const token = localStorage.getItem('suap_access_token');
      const matricula = localStorage.getItem('suap_username');

      if (token && matricula) {
        setIsLoggedIn(true);
        loadUserCache(matricula);
        if (navigator.onLine) {
          fetchAllUserDataBackground(matricula, false);
          checkSubscription(matricula);
        }
      }

      if (currentWallpaper) {
          const img = new Image();
          img.src = currentWallpaper;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsAppReady(true);
    };

    initApp();
  }, []);

  // Update News Modal Check
  useEffect(() => {
      if (isAppReady && !showLanding && !isCallbackRoute) {
          const lastSeen = localStorage.getItem(CACHE_KEYS.LAST_VERSION_SEEN);
          if (lastSeen !== CURRENT_APP_VERSION) {
              const t = setTimeout(() => setShowUpdateNews(true), 2000);
              return () => clearTimeout(t);
          }
      }
  }, [isAppReady, showLanding, isCallbackRoute]);

  const handleCloseUpdateNews = () => {
      setShowUpdateNews(false);
      localStorage.setItem(CACHE_KEYS.LAST_VERSION_SEEN, CURRENT_APP_VERSION);
  };

  const handleGoToClassroomFromNews = () => {
      handleCloseUpdateNews();
      setCurrentView(ViewState.CLASSROOM);
  };

  // Add Notification to History & Show Toast
  const handlePushNotification = (title: string, message: string, type: SupacoNotification['type'], persist: boolean = false) => {
      // Show ephemeral toast
      addToast(message, type === 'risk' ? 'warning' : 'info');

      if (persist) {
          const newNotif: SupacoNotification = {
              id: Date.now().toString(),
              title,
              message,
              timestamp: new Date().toISOString(),
              read: false,
              type
          };
          
          setNotifications(prev => {
              const updated = [newNotif, ...prev];
              // Persist immediately to local storage
              const mat = localStorage.getItem('suap_username');
              if (mat) {
                  SecureStorage.saveItem(mat, 'notifications', updated);
                  // Sync to cloud in background
                  if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                  syncTimeoutRef.current = setTimeout(() => SecureStorage.syncToCloud(mat), 2000);
              }
              return updated;
          });
      }
  };

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

  const markNotificationAsRead = (id: string) => {
      setNotifications(prev => {
          const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
          const mat = localStorage.getItem('suap_username');
          if (mat) {
              SecureStorage.saveItem(mat, 'notifications', updated);
              // Optimistic sync
              if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
              syncTimeoutRef.current = setTimeout(() => SecureStorage.syncToCloud(mat), 2000);
          }
          return updated;
      });
  };

  const markAllNotificationsAsRead = () => {
      setNotifications(prev => {
          const updated = prev.map(n => ({ ...n, read: true }));
          const mat = localStorage.getItem('suap_username');
          if (mat) {
              SecureStorage.saveItem(mat, 'notifications', updated);
              SecureStorage.syncToCloud(mat);
          }
          return updated;
      });
  };

  const checkSubscription = async (matricula: string) => {
      try {
          const isActive = await SecureStorage.checkSubscriptionStatus(matricula);
          setIsPremium(isActive);
      } catch (e) {
          console.error("Failed to check subscription:", e);
      }
  };

  useEffect(() => {
      if (processedGrades.length > 0) {
          processedGrades.forEach(grade => {
              if (grade.limit > 0) {
                  const percentage = grade.absences / grade.limit;
                  const remaining = grade.limit - grade.absences;
                  const alertId = `risk-${grade.code}-${grade.absences}`;
                  if (percentage >= 0.75 && remaining >= 0) {
                      const sessionKey = `notified_${alertId}`;
                      if (!sessionStorage.getItem(sessionKey)) {
                          const statusMsg = remaining === 0 
                              ? `Limite atingido em ${grade.subject}!` 
                              : `Cuidado! ${grade.subject} atingiu ${(percentage * 100).toFixed(0)}% do limite.`;
                          
                          handlePushNotification("Risco de Faltas", statusMsg, 'risk', true);
                          sessionStorage.setItem(sessionKey, 'true');
                      }
                  }
              }
          });
      }
  }, [processedGrades]);

  useEffect(() => { localStorage.setItem(CACHE_KEYS.THEME_MODE, isDarkMode ? 'dark' : 'light'); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem(CACHE_KEYS.THEME_VARIANT, themeVariant); }, [themeVariant]);
  useEffect(() => { localStorage.setItem(CACHE_KEYS.WALLPAPER, currentWallpaper); }, [currentWallpaper]);
  useEffect(() => { localStorage.setItem(CACHE_KEYS.PERFORMANCE, JSON.stringify(performanceSettings)); }, [performanceSettings]);

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

  useEffect(() => {
      if (isLoggedIn && !showLanding && !isCallbackRoute) {
          const matricula = localStorage.getItem('suap_username');
          if (matricula) {
             SecureStorage.syncFromCloud(matricula).then((result) => {
                if (result && result.hasData) {
                    console.log("[App] User has cloud data. Skipping tutorial.");
                    localStorage.setItem(CACHE_KEYS.TUTORIAL_SEEN, 'true');
                    setShowTutorial(false);
                    if(result.settings) applySettingsFromCache();
                } else {
                    const seen = localStorage.getItem(CACHE_KEYS.TUTORIAL_SEEN);
                    if (!seen) {
                        const t = setTimeout(() => setShowTutorial(true), 1500);
                        return () => clearTimeout(t);
                    }
                }
             });
          }
      }
  }, [isLoggedIn, showLanding, isCallbackRoute]);

  const handleFinishTutorial = () => {
      setShowTutorial(false);
      localStorage.setItem(CACHE_KEYS.TUTORIAL_SEEN, 'true');
  };

  const handleUpdateCustomPhoto = (url: string) => {
      setCustomPhotoUrl(url);
      if(url) {
          localStorage.setItem('suap_custom_photo', url);
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
      handlePushNotification("Bem-vindo ao Premium!", "Você agora é um usuário Pro. Aproveite todos os recursos desbloqueados.", 'system', true);
      if (userData?.matricula) checkSubscription(userData.matricula);
  };

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      if (isLoggedIn && userData?.matricula && !isOffline) {
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          setIsSyncing(true);
          syncTimeoutRef.current = setTimeout(async () => {
              await SecureStorage.syncToCloud(userData.matricula!);
              setIsSyncing(false);
          }, 3000); 
      }
  }, [currentView, currentWallpaper, customPhotoUrl, useCustomPhoto, themeVariant, isDarkMode, performanceSettings, isLoggedIn, userData?.matricula]);

  const activeUserPhoto = useMemo(() => {
      if (useCustomPhoto && customPhotoUrl) return customPhotoUrl;
      if (userData?.url_foto_150x200) return userData.url_foto_150x200.startsWith('http') ? userData.url_foto_150x200 : `https://suap.ifrn.edu.br${userData.url_foto_150x200}`;
      if (userData?.foto) return userData.foto.startsWith('http') ? userData.foto : `https://suap.ifrn.edu.br${userData.foto}`;
      return DEFAULT_PROFILE_IMG;
  }, [useCustomPhoto, customPhotoUrl, userData]);

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

  const exchangeSuapCodeForToken = async (code: string) => {
      const CLIENT_ID = 'mtwXt4wCesctJiKA6BbRQ7DMROTJeNosSpQUc7dm';
      const CLIENT_SECRET = 'zPYe7h1xr3Vv1yE38N8ziV56oAcmlJVMQIZP3BCFbuftEyu6whAbvoj7e8oKXU6jcbv9RVosL63fs4SBNnsESnPvozo2bodmvbp7dABOk566Dz88S3UMwKDTwwe6wL2G';
      const SUAP_REDIRECT_URI = window.location.hostname === 'localhost' ? 'http://localhost:5173/' : 'https://supaco.vercel.app/'; 

      try {
          const response = await fetch('https://suap.ifrn.edu.br/o/token/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
                  window.history.replaceState({}, document.title, window.location.pathname);
                  
                  const profileRes = await fetch('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/', {
                      headers: { 'Authorization': `Bearer ${data.access_token}` }
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
                          checkSubscription(profile.matricula);
                      }
                  }
              }
          }
      } catch (error) { console.error("OAuth Exchange Error", error); }
  };

  const initiateGoogleAuth = () => {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly email profile',
        access_type: 'offline', 
        prompt: 'consent', 
        state: 'google_auth'
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const exchangeGoogleCode = async (code: string) => {
    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
                // Fetch User Info
                let userInfo = {};
                try {
                    const userRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                        headers: { Authorization: `Bearer ${data.access_token}` }
                    });
                    if (userRes.ok) {
                        userInfo = await userRes.json();
                    }
                } catch(e) { console.error("Failed to fetch google user info", e); }

                const tokens: GoogleTokens = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token, 
                    expiry_date: Date.now() + (data.expires_in * 1000),
                    email: (userInfo as any).email,
                    name: (userInfo as any).name,
                    picture: (userInfo as any).picture
                };

                SecureStorage.saveItem(matricula, 'google_tokens', tokens);
                SecureStorage.syncToCloud(matricula);

                setGoogleUser({ 
                    email: tokens.email || '', 
                    name: tokens.name || '', 
                    picture: tokens.picture || '' 
                });

                setIsClassroomLinked(true);
                setClassroomStatus('connected');
                window.history.replaceState({}, document.title, '/');
                fetchClassroomData(matricula);
                addToast("Google Classroom conectado com sucesso!", "info");
                setIsCallbackRoute(false);
                setCurrentView(ViewState.CLASSROOM);
            }
        } else {
             setIsCallbackRoute(false); 
        }
    } catch (e) {
        setIsCallbackRoute(false); 
    }
  };

  const refreshGoogleToken = async (refreshToken: string, matricula: string): Promise<string | null> => {
      try {
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
                      refresh_token: data.refresh_token || currentTokens.refresh_token, 
                      expiry_date: Date.now() + (data.expires_in * 1000)
                  };
                  SecureStorage.saveItem(matricula, 'google_tokens', newTokens);
                  return data.access_token;
              }
          }
      } catch (e) { console.error("[Classroom] Refresh error", e); }
      return null;
  };

  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (code) {
          if (isCallbackRoute && state === 'google_auth') {
              exchangeGoogleCode(code);
          } else if (!isCallbackRoute) {
              exchangeSuapCodeForToken(code);
          }
      }
  }, [isCallbackRoute]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showLanding || isCallbackRoute) return; 
        if (e.repeat) return; 
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (e.key === 'Escape') { handleCloseOverlay(); return; }
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
  }, [showLanding, isCallbackRoute]);

  const processGradesFromBoletim = (boletim: SuapBoletim[]): GradeInfo[] => {
      return boletim.map(b => {
          const cleanSubject = b.disciplina.includes(' - ') ? b.disciplina.split(' - ').slice(1).join(' - ') : b.disciplina;
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
      const dayMap: Record<string, number> = { 'Segunda': 2, 'Terça': 3, 'Quarta': 4, 'Quinta': 5, 'Sexta': 6, 'Sábado': 7, 'Domingo': 1 };
      const classes: ProcessedClass[] = [];
      diarios.forEach(diario => {
          if (!diario.horarios) return;
          diario.horarios.forEach((h: any) => {
              if (!h.horario) return;
              const [start, end] = h.horario.split(' - ');
              const dayInt = dayMap[h.dia] || 0;
              classes.push({
                  day: h.dia, dayInt: dayInt, startTime: start ? start.trim() : '', endTime: end ? end.trim() : '', timeLabel: h.horario, name: diario.disciplina?.descricao || 'Disciplina',
                  shortName: diario.disciplina?.sigla || '', room: diario.local?.sala || 'N/A', fullRoom: diario.local?.sala || 'N/A', professors: diario.professores?.map((p:any) => p.nome) || [], type: 'Regular'
              });
          });
      });
      return classes.sort((a, b) => {
          if (a.dayInt !== b.dayInt) return a.dayInt - b.dayInt;
          return a.startTime.localeCompare(b.startTime);
      });
  };

  const loadUserCache = (matricula: string) => {
      try {
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
          const cachedNotifications = SecureStorage.loadItem(matricula, 'notifications');
          if (cachedNotifications) setNotifications(cachedNotifications);
          
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
          
          const classroom = SecureStorage.loadItem(matricula, 'classroom');
          if (classroom) {
              const hydrated = classroom.map((w: any) => ({ ...w, jsDate: w.jsDate ? new Date(w.jsDate) : undefined }));
              setClassroomWork(hydrated);
          }
          
          const gTokens = SecureStorage.loadItem(matricula, 'google_tokens') as GoogleTokens;
          if (gTokens && gTokens.access_token) {
              setIsClassroomLinked(true);
              setGoogleUser({ email: gTokens.email || '', name: gTokens.name || '', picture: gTokens.picture || '' });
              if (gTokens.expiry_date && gTokens.expiry_date < Date.now()) {
                  setClassroomStatus('expired');
              } else {
                  setClassroomStatus('connected');
              }
          } else {
              setIsClassroomLinked(false);
              setGoogleUser(null);
              setClassroomStatus('disconnected');
          }
          applySettingsFromCache();
      } catch (e) { console.error("[App] Error loading secure cache:", e); }
  };

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
        let response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });

        if (response.status === 401) {
            const refreshed = await refreshSuapToken();
            if (refreshed) {
                token = localStorage.getItem('suap_access_token');
                response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            } else {
                setIsLoggedIn(false);
                return null;
            }
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) { return null; }
  };

  const fetchHolidays = async () => {
      const lastFetch = localStorage.getItem('suap_cache_holidays_ts');
      const now = Date.now();
      if (lastFetch && (now - parseInt(lastFetch)) < 1000 * 60 * 60 * 24 * 7) return;

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

  const fetchClassroomData = async (currentMatricula: string, forceRefresh = false) => {
    if (!navigator.onLine) return;
    let tokens = SecureStorage.loadItem(currentMatricula, 'google_tokens') as GoogleTokens;
    if (!tokens || !tokens.access_token) {
        setIsClassroomLinked(false);
        setClassroomStatus('disconnected');
        return;
    }

    if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 60000) { 
        if (tokens.refresh_token) {
             const newAccessToken = await refreshGoogleToken(tokens.refresh_token, currentMatricula);
             if (newAccessToken) {
                 tokens.access_token = newAccessToken; 
                 setClassroomStatus('connected'); 
             } else {
                 setClassroomStatus('expired');
                 return; 
             }
        } else {
             setClassroomStatus('expired');
             return;
        }
    } else {
        setIsClassroomLinked(true);
        setClassroomStatus('connected');
    }
    
    if (!forceRefresh && SecureStorage.isCacheValid(currentMatricula, 'classroom', 30)) return;

    try {
        const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        
        if (coursesRes.status === 401) { setClassroomStatus('expired'); return; }
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
                jsDate: w.dueDate ? (w.dueTime 
                    ? new Date(Date.UTC(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day, w.dueTime.hours, w.dueTime.minutes))
                    : new Date(w.dueDate.year, w.dueDate.month - 1, w.dueDate.day, 23, 59, 59)
                ) : undefined
            }));
        });
        const allWork = (await Promise.all(workPromises)).flat();
        const futureWork = allWork.filter(w => w.jsDate && w.jsDate >= new Date()).sort((a, b) => a.jsDate!.getTime() - b.jsDate!.getTime());
        
        setClassroomWork(futureWork);
        SecureStorage.saveItem(currentMatricula, 'classroom', futureWork);

    } catch (e) { console.error("Failed to fetch classroom data", e); }
  };

  const fetchSuapNotifications = async (matricula: string) => {
      try {
          const response = await fetchWithAuth('https://suap.ifrn.edu.br/api/edu/mensagens/entrada/nao_lidas/?page=1');
          if (response && response.results) {
              const suapMsgs: SuapMessage[] = response.results;
              
              setNotifications(prev => {
                  const existingIds = new Set(prev.map(n => n.id));
                  const newNotifications: SupacoNotification[] = [];

                  suapMsgs.forEach(msg => {
                      const msgId = `suap-${msg.id}`;
                      if (!existingIds.has(msgId)) {
                          newNotifications.push({
                              id: msgId,
                              title: msg.assunto || 'Mensagem do SUAP',
                              message: msg.remetente ? `De: ${msg.remetente}` : 'Nova mensagem disponível no SUAP.',
                              timestamp: msg.data_envio || new Date().toISOString(),
                              read: false,
                              type: 'suap',
                              link: msg.url ? `https://suap.ifrn.edu.br${msg.url}` : undefined
                          });
                      }
                  });

                  if (newNotifications.length > 0) {
                      const updated = [...newNotifications, ...prev];
                      SecureStorage.saveItem(matricula, 'notifications', updated);
                      return updated;
                  }
                  return prev;
              });
          }
      } catch (e) {
          console.error("Failed to fetch SUAP notifications", e);
      }
  };

  const fetchAllUserDataBackground = async (currentMatricula: string, forceRefresh = false) => {
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

        const gTokens = SecureStorage.loadItem(currentMatricula, 'google_tokens') as GoogleTokens;
        if (gTokens?.access_token) {
            setIsClassroomLinked(true);
            setGoogleUser({ email: gTokens.email || '', name: gTokens.name || '', picture: gTokens.picture || '' });
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

        await fetchSuapNotifications(currentMatricula);

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
        await fetchClassroomData(currentMatricula, forceRefresh);
        if (forceRefresh) await SecureStorage.syncToCloud(currentMatricula);

    } catch (error) { console.error("[App] Error in background sync:", error); } 
    finally { setIsSyncing(false); }
  };

  const fetchAcademicDetails = async (semestre: string, matricula: string, forceUIUpdate = false) => {
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

      if (cachedGrades) setProcessedGrades(cachedGrades); else setProcessedGrades([]); 
      if (cachedSchedule) setProcessedSchedule(cachedSchedule); else setProcessedSchedule([]);

      if (!cachedGrades || !cachedSchedule || !SecureStorage.isCacheValid(matricula, `grades_${semestre}`, 60)) {
           setIsSyncing(true);
           try { await fetchAcademicDetails(semestre, matricula, true); } finally { setIsSyncing(false); }
      }
  };

  const handleAddTodo = (text: string) => {
      if (!text.trim()) return;
      const newTodo: TodoItem = { id: Date.now().toString(), text: text, completed: false };
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
      setUserData(null); setAcademicData(null); setProcessedSchedule([]); setProcessedGrades([]); setCompletionData(null); setCurrentPeriod(null); setClassroomWork([]); setPeriods([]); setViewingPeriod(null); setTodos([]); setIsClassroomLinked(false); setClassroomStatus('disconnected'); setIsLoggedIn(false); setCurrentView(ViewState.DASHBOARD); setIsPremium(false); setGoogleUser(null);
      setNotifications([]);
  };

  const handleFinishLanding = () => {
      setShowLanding(false);
      localStorage.setItem(CACHE_KEYS.WELCOME_SEEN, 'true');
  };

  // --- HANDLER FOR CHAT TRANSFER FROM CLASSROOM ---
  const handleOpenChatWithContext = (messages: ChatMessage[], pendingMessage?: string) => {
      setInitialChatContext(messages);
      if (pendingMessage) {
          setPendingChatPrompt(pendingMessage);
      }
      // Ensure we are not in an overlay to show the floating widget properly
      handleCloseOverlay();
  };

  const palette = useMemo((): Palette => {
      switch (themeVariant) {
          case 'monochrome': return { primary: 'neutral', secondary: 'stone' };
          case 'saturated': return { primary: 'fuchsia', secondary: 'cyan' };
          case 'sepia': return { primary: 'amber', secondary: 'stone' };
          case 'dynamic': return WALLPAPER_THEMES[currentWallpaper] || { primary: 'emerald', secondary: 'rose' };
          default: return { primary: 'emerald', secondary: 'rose' };
      }
  }, [themeVariant, currentWallpaper]);

  if (isCallbackRoute) return <CallbackPage isDarkMode={isDarkMode} primaryColor={palette.primary} />;
  if (!isAppReady) return <SplashScreen />;

  return (
    <div className={`font-sans antialiased transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <style>
        {`${performanceSettings.disableBlur ? `.backdrop-blur-xl, .backdrop-blur-md, .backdrop-blur-2xl, .backdrop-blur-lg, .backdrop-blur-sm, .backdrop-blur { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: ${isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'} !important; }` : ''} ${performanceSettings.reduceMotion ? `*, *::before, *::after { animation-duration: 0.01s !important; animation-iteration-count: 1 !important; transition-duration: 0.01s !important; scroll-behavior: auto !important; } .animate-pulse, .animate-spin, .animate-ping, .animate-bounce { animation: none !important; }` : ''} ${performanceSettings.disableGlow ? `.shadow-2xl, .shadow-xl, .shadow-lg, .shadow-md, .shadow-sm, .shadow { box-shadow: none !important; } .blur-3xl, .blur-2xl, .blur-xl { display: none !important; }` : ''}`}
      </style>

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
          {showUpdateNews && (
              <Suspense fallback={null}>
                  <UpdateNewsModal 
                      onClose={handleCloseUpdateNews}
                      onGoToClassroom={handleGoToClassroomFromNews}
                      isDark={isDarkMode}
                      primaryColor={palette.primary}
                  />
              </Suspense>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {isSyncing && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed top-4 right-4 z-[300] pointer-events-none">
                <div className={`p-2 rounded-full shadow-lg backdrop-blur-md ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-gray-800'}`}>
                    <RefreshCw size={14} className="animate-spin" />
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOffline && isLoggedIn && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-0 inset-x-0 z-[300] flex justify-center pointer-events-none">
                <div className={`mt-2 px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shadow-xl backdrop-blur-md ${isDarkMode ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    <WifiOff size={12} /><span>Modo Offline</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

       <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
          <AnimatePresence>
              {toasts.map(toast => (
                  <motion.div key={toast.id} initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border cursor-pointer max-w-[90vw] md:max-w-md ${toast.type === 'warning' ? (isDarkMode ? 'bg-orange-500/20 border-orange-500/30 text-white' : 'bg-orange-50 border-orange-200 text-gray-900') : (isDarkMode ? 'bg-blue-500/20 border-blue-500/30 text-white' : 'bg-blue-50 border-blue-200 text-gray-900')}`} onClick={() => removeToast(toast.id)}>
                      <div className={`p-1.5 rounded-full shrink-0 ${toast.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}><AlertTriangle size={14} fill="currentColor" /></div>
                      <span className="text-xs font-bold leading-tight">{toast.message}</span>
                      <X size={14} className="opacity-50 hover:opacity-100 ml-1" />
                  </motion.div>
              ))}
          </AnimatePresence>
      </div>

      <div className={showLanding ? 'fixed inset-0' : ''}>
        {themeVariant === 'sepia' && (
            <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.12] mix-blend-overlay" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}} />
        )}
        <div 
            style={{ 
                filter: themeVariant === 'sepia' ? 'sepia(80%) contrast(90%)' : 
                        themeVariant === 'monochrome' ? 'grayscale(100%) contrast(120%) brightness(100%)' : 'none', 
                transition: 'filter 0.5s ease',
                backgroundColor: themeVariant === 'monochrome' ? '#000000' : 'transparent' 
            }} 
            className={`h-full w-full absolute inset-0 z-0 ${themeVariant === 'monochrome' ? 'bg-black' : ''}`}
        />

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
                    notifications={notifications}
                    onMarkAsRead={markNotificationAsRead}
                    themeVariant={themeVariant}
                />
            </Suspense>

            <AnimatePresence>
                {showTutorial && (
                    <Suspense fallback={null}>
                        <TutorialOverlay steps={TUTORIAL_STEPS} onComplete={handleFinishTutorial} isDarkMode={isDarkMode} primaryColor={palette.primary} />
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
                        periods={periods}
                        viewingPeriod={viewingPeriod}
                        onPeriodChange={handlePeriodChange}
                        isPremium={isPremium}
                        onOpenPremiumModal={() => setShowPremiumModal(true)}
                        classroomWork={classroomWork}
                        isClassroomLinked={isClassroomLinked}
                        onLinkClassroom={initiateGoogleAuth}
                        classroomStatus={classroomStatus}
                        internalApiKey={SUPACO_INTERNAL_KEY}
                        onOpenChatWithContext={handleOpenChatWithContext}
                        onOpenSettings={handleOpenSettings}
                        onRefreshClassroom={() => { if(userData?.matricula) fetchClassroomData(userData.matricula, true); }}
                        googleUser={googleUser}
                    />
                </Suspense>
                )}
            </AnimatePresence>

            {isLoggedIn && (
                <div id="tut-widgets" className="fixed md:absolute bottom-24 md:bottom-10 left-0 md:left-[322px] right-0 z-[250] flex justify-center items-end pointer-events-none px-4 md:px-0 transition-opacity duration-1000 opacity-100">
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
                                initialContext={initialChatContext}
                                pendingMessage={pendingChatPrompt}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
            
            {(isLoggedIn || userData) && !showLanding && (
               <Suspense fallback={null}>
                   <MobileNavBar currentView={currentView} onChangeView={handleViewChange} isDarkMode={isDarkMode} primaryColor={palette.primary} />
               </Suspense>
            )}
        </div>
      </div>

      <AnimatePresence>
        {showLanding && (
            <Suspense fallback={null}>
                <LandingPage key="landing" onComplete={handleFinishLanding} onLogin={handleLogin} isDarkMode={isDarkMode} primaryColor={palette.primary} currentWallpaper={currentWallpaper} />
            </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;