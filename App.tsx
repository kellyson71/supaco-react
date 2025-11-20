
import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { ContentView } from './components/ContentViews';
import { ViewState, ThemeVariant, SuapProfile, SuapMeusDadosAluno, SuapPeriod, SuapBoletim, SuapDiarioResponse, ProcessedClass, GradeInfo, SuapCompletionData, Holiday } from './types';
import { AnimatePresence } from 'framer-motion';

const DEFAULT_WALLPAPER = "https://images2.alphacoders.com/134/thumb-1920-1345658.png";

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>('dynamic'); 
  const [currentWallpaper, setCurrentWallpaper] = useState(DEFAULT_WALLPAPER);
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<SuapProfile | null>(null);
  const [academicData, setAcademicData] = useState<SuapMeusDadosAluno | null>(null);
  
  // SUAP Data State
  const [currentPeriod, setCurrentPeriod] = useState<SuapPeriod | null>(null);
  const [boletimData, setBoletimData] = useState<SuapBoletim[]>([]);
  const [processedSchedule, setProcessedSchedule] = useState<ProcessedClass[]>([]);
  const [processedGrades, setProcessedGrades] = useState<GradeInfo[]>([]);
  const [completionData, setCompletionData] = useState<SuapCompletionData | null>(null);
  
  // Public Data
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // --- API FETCHING ---

  const fetchWithAuth = async (url: string) => {
    const token = localStorage.getItem('suap_access_token');
    if (!token) return null;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (response.status === 401) {
        localStorage.removeItem('suap_access_token');
        localStorage.removeItem('suap_refresh_token');
        setIsLoggedIn(false);
        return null;
    }

    return response.ok ? await response.json() : null;
  };

  const fetchHolidays = async () => {
      const year = new Date().getFullYear();
      try {
          const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
          if (response.ok) {
              const data = await response.json();
              setHolidays(data);
          }
      } catch (error) {
          console.error("Failed to fetch holidays", error);
      }
  };

  const fetchUserData = async () => {
    try {
        // 1. User Profile
        const profile = await fetchWithAuth('https://suap.ifrn.edu.br/api/v2/minhas-informacoes/meus-dados/');
        if (profile) setUserData(profile);

        // 2. Detailed Academic Data (IRA, Matrix, Entry etc)
        const academic = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/meus-dados-aluno/');
        if (academic) setAcademicData(academic);

        // 3. Completion Requirements
        const completion = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/requisitos-conclusao/');
        if (completion) setCompletionData(completion);

        // 4. Periods (New Endpoint)
        const periods: SuapPeriod[] = await fetchWithAuth('https://suap.ifrn.edu.br/api/ensino/periodos/');
        if (periods && periods.length > 0) {
            // Sort descending by string (e.g. "2025.1" > "2024.2")
            const sortedPeriods = periods.sort((a, b) => b.semestre.localeCompare(a.semestre));
            const activePeriod = sortedPeriods[0]; // Get most recent
            setCurrentPeriod(activePeriod);
            
            // 5. Fetch Active Data using active semester slug
            if (activePeriod) {
                await fetchAcademicData(activePeriod.semestre);
            }
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  const fetchAcademicData = async (semestre: string) => {
      // Split semester for Boletim (which still might use year/period path if old endpoint, 
      // but prompt says: GET /api/v2/minhas-informacoes/boletim/{ano_letivo}/{periodo_letivo}/ 
      // Let's assume we can parse "2025.1" -> 2025, 1
      const [ano, periodo] = semestre.split('.');
      
      // Boletim
      const boletim = await fetchWithAuth(`https://suap.ifrn.edu.br/api/v2/minhas-informacoes/boletim/${ano}/${periodo}/`);
      if (boletim) {
          setBoletimData(boletim);
          processGrades(boletim);
      }

      // Diarios (New Schedule Endpoint)
      const diariosResponse: SuapDiarioResponse = await fetchWithAuth(`https://suap.ifrn.edu.br/api/ensino/diarios/${semestre}/`);
      
      // The response is an object { results: [], ... } or sometimes array directly depending on API version
      // Based on user prompt example: { "results": [ ... ] }
      // But user also showed Schema as Array `[...]`. Let's handle both.
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
  };

  const processSchedule = (diarios: any[]) => {
      const parsedClasses: ProcessedClass[] = [];
      
      // Mapping for sorting
      const dayOrder: Record<string, number> = { 
          'Segunda': 2, 'Terça': 3, 'Quarta': 4, 
          'Quinta': 5, 'Sexta': 6, 'Sábado': 7, 'Domingo': 1 
      };

      diarios.forEach(diario => {
          if (!diario.horarios || diario.horarios.length === 0) return;

          // Group overlapping times? Or just list them all.
          // API returns objects like: { dia: "Quarta", horario: "16:30 - 17:15" }
          
          diario.horarios.forEach((h: any) => {
              // Parse "16:30 - 17:15"
              const times = h.horario.split(' - ');
              const startTime = times[0] || "00:00";
              const endTime = times[1] || "00:00";
              
              // Get Subject Name
              const fullName = diario.disciplina?.descricao || "Disciplina";
              const shortName = diario.disciplina?.sigla || "---";
              
              // Get Room
              const fullRoom = diario.local?.sala || "Sem local definido";
              // Try to extract short room name (e.g. "Sala 06")
              let shortRoom = "Local ?";
              if (fullRoom.includes(" - ")) {
                 const parts = fullRoom.split(" - ");
                 // Usually the second part has "Sala de Aula X" or "Lab X"
                 shortRoom = parts[1] || parts[0]; 
              } else {
                 shortRoom = fullRoom;
              }
              
              // Limit short room length
              if (shortRoom.length > 15) shortRoom = shortRoom.substring(0, 15) + '...';

              // Get Professors
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

      // Sort by Day then Time
      setProcessedSchedule(parsedClasses.sort((a, b) => {
          if (a.dayInt !== b.dayInt) return a.dayInt - b.dayInt;
          return a.startTime.localeCompare(b.startTime);
      }));
  };

  // Check for existing session on mount
  useEffect(() => {
    fetchHolidays(); // Fetch always on load
    const token = localStorage.getItem('suap_access_token');
    if (token) {
      setIsLoggedIn(true);
      fetchUserData();
    }
  }, []);

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
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
      />

      {/* Overlays */}
      <AnimatePresence>
        {currentView !== ViewState.DASHBOARD && (
          <ContentView 
            view={currentView} 
            onClose={handleCloseOverlay} 
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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;