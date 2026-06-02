

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  QUICK = 'QUICK',
  GRADES = 'GRADES',
  ABSENCES = 'ABSENCES',
  SCHEDULE = 'SCHEDULE',
  CLASSROOM = 'CLASSROOM',
  PROFILE = 'PROFILE',
  CONCLUSION = 'CONCLUSION',
  ADMIN = 'ADMIN',
  AI_STUDIO = 'AI_STUDIO'
}

export type ThemeVariant = 'default' | 'monochrome' | 'saturated' | 'dynamic' | 'sepia';

export interface PerformanceSettings {
  reduceMotion: boolean;
  disableBlur: boolean;
  disableGlow: boolean;
}

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
    id: string;
    icon: any; // Lucide Icon component
    title: string;
    description: string;
    rarity: AchievementRarity;
    condition: (grades: GradeInfo[], profile: SuapProfile | null) => boolean;
    secret?: boolean; // If true, description is hidden until unlocked
}

export interface Student {
  name: string;
  avatar: string;
  grade: string;
}

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface UserFeedback {
    type: 'suggestion' | 'feature';
    message: string;
    contact_email?: string;
}

export interface FeedbackItem {
    id: string;
    user_id: string;
    type: 'suggestion' | 'feature';
    message: string;
    contact_email: string;
    created_at: string;
}

export interface SupacoNotification {
    id: string;
    title: string;
    message: string;
    timestamp: string; // ISO Date
    read: boolean;
    type: 'system' | 'suap' | 'risk' | 'academic' | 'achievement';
    link?: string;
}

// SUAP API Response Types
export interface SuapMessage {
    id: number;
    assunto: string;
    remetente: string;
    data_envio: string;
    url: string;
    lida: boolean;
    texto?: string; // Sometimes provided
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  email?: string;
  name?: string;
  picture?: string;
}

// --- AI HISTORY INTERFACES ---

export type AIHistoryType = 'flashcards' | 'quiz' | 'summary' | 'classroom_solver' | 'chat';

export interface AIHistoryItem {
    id: string; // UUID from supabase
    user_id: string;
    type: AIHistoryType;
    title: string;
    content: any; // Flexible payload (Flashcards[], Quiz[], ChatMessages[], etc)
    created_at: string; // ISO String
}

// --- SUAP API INTERFACES ---

// Updated to match GET /api/ensino/periodos/
export interface SuapPeriod {
  id: number; // calculated or from api
  semestre: string; // "2024.1"
}

// New Interface for GET /api/ensino/meus-periodos-letivos/
export interface SuapMeusPeriodosLetivos {
  ano_letivo: number;
  periodo_letivo: number;
}

export interface SuapProfile {
  nome_usual: string;
  nome_completo?: string;
  foto: string;
  url_foto_150x200?: string;
  email_academico: string;
  email_secundario?: string;
  campus: string;
  matricula?: string; 
  tipo_vinculo?: string;
  cpf?: string;
  data_nascimento?: string;
  sexo?: string;
  rg?: string;
  vinculo?: {
      curso: string;
      matricula: string;
      nome: string;
      turno: string;
      situacao?: string;
  };
}

export interface SuapMeusDadosAluno {
  ingresso: string;
  email_academico: string;
  email_escolar: string;
  cpf: string;
  periodo_referencia: number;
  ira: string;
  curso: string;
  matriz: string;
  qtd_periodos: number;
  situacao: string;
  data_migracao: string | null;
  impressao_digital: boolean;
  emitiu_diploma: boolean;
  educasenso: string | null;
}

export interface SuapBoletim {
  codigo_diario: string;
  disciplina: string;
  carga_horaria: number;
  carga_horaria_cumprida: number;
  numero_faltas: number;
  situacao: string;
  nota_etapa_1: { nota: number | null; faltas: number | null };
  nota_etapa_2: { nota: number | null; faltas: number | null };
  nota_etapa_3?: { nota: number | null; faltas: number | null };
  nota_etapa_4?: { nota: number | null; faltas: number | null };
  media_disciplina: number | null;
  nota_avaliacao_final?: { nota: number | null; faltas: number | null };
  media_final_disciplina?: string;
  percentual_carga_horaria_frequentada: number;
}

// New Interfaces for GET /api/ensino/diarios/{semestre}/
export interface SuapDiarioProfessor {
  id: number;
  nome: string;
  matricula: string;
  email: string;
}

export interface SuapDiarioHorario {
  dia: string;      // "Segunda", "Terça"...
  horario: string;  // "13:00 - 13:45"
}

export interface SuapDiarioLocal {
  id: number;
  sala: string;
}

export interface SuapDiarioDisciplina {
  id: number;
  descricao: string;
  sigla: string;
  situacao?: { rotulo: string; status: string };
  ch_total_aula: number;
  ch_total_relogio?: number;
  ch_cumprida_aula: number;
  qtd_faltas: number;
  qtd_avaliacoes?: number;
  frequencia: number;
  // Generic arrays based on endpoint schema
  notas?: any[]; 
  medias?: any[];
}

export interface SuapDiario {
  id: number;
  disciplina: SuapDiarioDisciplina;
  professores: SuapDiarioProfessor[];
  horarios: SuapDiarioHorario[];
  local: SuapDiarioLocal;
  laboratorio?: SuapDiarioLocal;
  ambiente_virtual: string;
}

export interface SuapDiarioResponse {
    results: SuapDiario[];
    count: number;
}

export interface CompletionCategory {
    ch_esperada: number;
    ch_cumprida: number;
    ch_pendente: number;
}

export interface SuapCompletionData {
    percentual_cumprida: number;
    regulares_obrigatorios: CompletionCategory;
    regulares_optativos: CompletionCategory;
    eletivos: CompletionCategory;
    seminarios: CompletionCategory;
    pratica_profissional: CompletionCategory;
    pratica_profissional_estagio: CompletionCategory;
    extensao_componentes: CompletionCategory;
    extensao_outras_atividades: CompletionCategory;
    extensao_outros_componentes: CompletionCategory;
    atividades_aprofundamento: CompletionCategory;
    atividades_complementares: CompletionCategory;
    tcc: CompletionCategory;
    pratica_componente: CompletionCategory;
    visita_tecnica: CompletionCategory;
    totais: CompletionCategory;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: string;
}


// --- UI PROCESSED INTERFACES ---

export interface GradeInfo {
    subject: string;
    code: string;
    status: string;
    n1: string | number | null;
    n2: string | number | null;
    n3: string | number | null;
    n4: string | number | null;
    finalGrade: string | number | null;
    average: string | number | null;
    frequency: number;
    absences: number;
    limit: number;
    totalHours: number;
}

export interface ProcessedClass {
    day: string; // "Segunda", "Terça"...
    dayInt: number; // 2 (Mon) - 7 (Sat)
    startTime: string; // "13:00"
    endTime: string; // "14:30"
    timeLabel: string; // "13:00 - 14:30"
    name: string;
    room: string;
    shortName: string;
    professors: string[]; // For details
    fullRoom: string;     // For details
    type?: string;
}

export interface AbsenceRisk {
    subject: string;
    absences: number;
    limit: number;
    remaining: number;
    percentage: number;
    isRisk: boolean;
}

// Google Classroom Interfaces
export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  alternateLink: string;
  courseState?: string;
}

export interface ClassroomDate {
  year: number;
  month: number;
  day: number;
}

export interface ClassroomTime {
  hours: number;
  minutes: number;
}

export interface ClassroomWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state: string;
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTime;
  maxPoints?: number;
  workType: string;
  // Augmented fields for UI
  courseName?: string;
  jsDate?: Date;
}
