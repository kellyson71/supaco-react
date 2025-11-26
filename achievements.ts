
import { 
    Brain, 
    ShieldCheck, 
    CheckCircle, 
    AlertTriangle, 
    Target, 
    Moon, 
    Sun, 
    Backpack, 
    HeartCrack, 
    Calculator, 
    BookOpen, 
    Zap, 
    Palmtree, 
    GraduationCap, 
    Crown 
} from 'lucide-react';
import { Achievement, AchievementRarity } from './types';

// Helper for Color based on Rarity
export const getRarityColor = (rarity: AchievementRarity): string => {
    switch (rarity) {
        case 'common': return 'blue';
        case 'rare': return 'cyan';
        case 'epic': return 'purple';
        case 'legendary': return 'yellow';
        default: return 'gray';
    }
};

export const getRarityLabel = (rarity: AchievementRarity): string => {
    switch (rarity) {
        case 'common': return 'Comum';
        case 'rare': return 'Raro';
        case 'epic': return 'Épico';
        case 'legendary': return 'Lendário';
        default: return 'Comum';
    }
};

export const ACHIEVEMENTS_LIST: Achievement[] = [
    // --- CLÁSSICAS ---
    {
        id: 'nerd',
        icon: Brain,
        title: 'Nerd Supremo',
        description: 'Média geral calculada acima de 90.',
        rarity: 'legendary',
        condition: (grades) => {
             const valid = grades.filter(g => typeof g.average === 'number' || (typeof g.average === 'string' && g.average !== '-' && !isNaN(Number(g.average))));
             if (valid.length === 0) return false;
             const avg = valid.reduce((acc, g) => acc + Number(g.average), 0) / valid.length;
             return avg >= 90;
        }
    },
    {
        id: 'survivor',
        icon: ShieldCheck,
        title: 'Sobrevivente',
        description: 'Passou arrastado com média exata 60 em alguma matéria.',
        rarity: 'common',
        condition: (grades) => grades.some(g => Number(g.average) === 60)
    },
    {
        id: 'perfect_attendance',
        icon: CheckCircle,
        title: 'Imortal',
        description: '100% de frequência em todas as matérias.',
        rarity: 'epic',
        condition: (grades) => grades.length > 0 && grades.every(g => g.frequency === 100)
    },
    {
        id: 'danger_zone',
        icon: AlertTriangle,
        title: 'No Limite',
        description: 'Atingiu exatamente o limite de faltas permitidas.',
        rarity: 'rare',
        condition: (grades) => grades.some(g => g.absences === g.limit && g.limit > 0)
    },
    {
        id: 'final_boss',
        icon: Target,
        title: 'Inimigo do Fim',
        description: 'Foi para a prova final e conseguiu passar.',
        rarity: 'epic',
        condition: (grades) => grades.some(g => g.finalGrade && g.finalGrade !== '-' && Number(g.finalGrade) >= 60)
    },

    // --- NOVAS ---
    {
        id: 'night_owl',
        icon: Moon,
        title: 'Corujão',
        description: 'Acessou o Supaco de madrugada (entre 00h e 05h).',
        rarity: 'rare',
        condition: () => {
            const hour = new Date().getHours();
            return hour >= 0 && hour < 5;
        }
    },
    {
        id: 'early_bird',
        icon: Sun,
        title: 'Madrugador',
        description: 'Acessou o Supaco cedinho (entre 05h e 07h).',
        rarity: 'common',
        condition: () => {
            const hour = new Date().getHours();
            return hour >= 5 && hour < 7;
        }
    },
    {
        id: 'heavy_load',
        icon: Backpack,
        title: 'Mochila Cheia',
        description: 'Matriculado em mais de 10 disciplinas simultaneamente.',
        rarity: 'rare',
        condition: (grades) => grades.length > 10
    },
    {
        id: 'clutch',
        icon: HeartCrack,
        title: 'Quase Reprovado',
        description: 'Passou raspando com nota final entre 60 e 60.9.',
        rarity: 'epic',
        condition: (grades) => grades.some(g => {
            const avg = Number(g.average);
            return avg >= 60 && avg < 61;
        })
    },
    {
        id: 'math_genius',
        icon: Calculator,
        title: 'Calculadora Humana',
        description: 'Tirou acima de 85 em Matemática, Física ou Cálculo.',
        rarity: 'rare',
        condition: (grades) => grades.some(g => {
            const name = g.subject.toLowerCase();
            const score = Number(g.average);
            return (name.includes('matem') || name.includes('física') || name.includes('calculo')) && score >= 85;
        })
    },
    {
        id: 'humanities',
        icon: BookOpen,
        title: 'Filósofo',
        description: 'Tirou acima de 85 em História, Geografia, Sociologia ou Filosofia.',
        rarity: 'rare',
        condition: (grades) => grades.some(g => {
            const name = g.subject.toLowerCase();
            const score = Number(g.average);
            return (name.includes('hist') || name.includes('geog') || name.includes('socio') || name.includes('filos')) && score >= 85;
        })
    },
    {
        id: 'focused_one',
        icon: Zap,
        title: '100% Focado',
        description: 'Zero faltas em pelo menos uma disciplina.',
        rarity: 'common',
        condition: (grades) => grades.some(g => g.absences === 0)
    },
    {
        id: 'vacation_mode',
        icon: Palmtree,
        title: 'Férias?',
        description: 'Acessou o app durante o fim de semana.',
        rarity: 'common',
        condition: () => {
            const day = new Date().getDay();
            return day === 0 || day === 6; // Domingo ou Sábado
        }
    },
    {
        id: 'veteran',
        icon: GraduationCap,
        title: 'Veterano',
        description: 'Matrícula antiga (identificada pelo ano inicial).',
        rarity: 'legendary',
        condition: (_, profile) => {
            if (!profile?.matricula) return false;
            const year = parseInt(profile.matricula.substring(0, 4));
            const currentYear = new Date().getFullYear();
            return (currentYear - year) >= 3;
        }
    },
    {
        id: 'collector',
        icon: Crown,
        title: 'Colecionador',
        description: 'Desbloqueou esta conquista por ter sorte.',
        rarity: 'legendary',
        secret: true,
        condition: () => Math.random() > 0.95 // 5% de chance a cada render/check (Easter Egg)
    }
];
