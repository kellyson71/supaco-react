// Rótulos legíveis para os dados de servidores: o SUAP e o Portal mandam tudo abreviado, em maiúsculas e sem acento.
import { titleCase, type Servidor } from './suap';

export const CATEGORIAS: Record<string, { label: string; plural: string; icon: string }> = {
  docente: { label: 'Docente', plural: 'Docentes', icon: 'school' },
  tecnico_administrativo: { label: 'Técnico-administrativo', plural: 'Técnicos', icon: 'badge' },
  estagiario: { label: 'Estagiário', plural: 'Estagiários', icon: 'person' },
};

export const categoriaLabel = (c: string) => CATEGORIAS[c]?.label ?? 'Servidor';

/** Palavras que o SIAPE grava abreviadas ou sem acento. */
const WORDS: Record<string, string> = {
  administracao: 'administração', tecnico: 'técnico', tec: 'técnico', aux: 'auxiliar', laboratorio: 'laboratório', area: 'área',
  informacao: 'informação', educacao: 'educação', pedagogico: 'pedagógico', bibliotecario: 'bibliotecário', medico: 'médico',
  psicologo: 'psicólogo', odontologo: 'odontólogo', nutricao: 'nutrição', seguranca: 'segurança', edificacoes: 'edificações',
  comunicacao: 'comunicação', producao: 'produção', eletronica: 'eletrônica', mecanica: 'mecânica', quimica: 'química',
  dedicacao: 'dedicação', juridico: 'jurídico', unico: 'único', funcao: 'função', publico: 'público', publicos: 'públicos',
  ens: 'ensino', basico: 'básico', tecn: 'técnico', tecnologico: 'tecnológico', coordenacao: 'coordenação', direcao: 'direção',
};

/** "AUX EM ADMINISTRACAO" → "Auxiliar em administração" */
export const pretty = (text: string) => {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean).map((w) => WORDS[w] ?? w);
  return words.map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
};

/** Cargo do SIAPE em uma forma curta. */
export function cargoLabel(cargo: string) {
  if (!cargo) return '';
  if (/SUBSTITUTO/i.test(cargo)) return 'Professor substituto';
  if (/VISITANTE/i.test(cargo)) return 'Professor visitante';
  if (/^PROF/i.test(cargo)) return 'Professor EBTT';
  return pretty(cargo);
}

/** O que a pessoa faz, em uma linha: a área do docente ou o cargo do técnico. */
export function ocupacao(s: Pick<Servidor, 'categoria' | 'cargo' | 'disciplina'>) {
  if (s.categoria === 'docente') return s.disciplina ? `Docente de ${s.disciplina}` : cargoLabel(s.cargo) || 'Docente';
  return cargoLabel(s.cargo) || categoriaLabel(s.categoria);
}

const FUNCOES: [RegExp, string][] = [
  [/^FUC|^FCC/i, 'Coordenação de curso'],
  [/^CD/i, 'Cargo de direção'],
  [/^FG/i, 'Função gratificada'],
];

/** "FUC0001 - CTAL/PF" → { tipo: "Coordenação de curso", setor: "CTAL/PF" } */
export function funcaoLabel(raw: string) {
  const [codigo, setor = ''] = raw.split(/\s+-\s*/);
  return { tipo: FUNCOES.find(([re]) => re.test(codigo))?.[1] ?? codigo, setor: setor.trim() };
}

/** "CAMPUS PAU DOS FERROS" → "Pau dos Ferros" */
export const campusNome = (nome: string) => titleCase(nome.replace(/^campus\s+(avançado\s+)?/i, ''));

/** Anos completos desde uma data "aaaa-mm-dd". */
export function anosDesde(iso: string | null | undefined, now = new Date()) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const years = now.getFullYear() - +m[1] - (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3]) ? 1 : 0);
  return Math.max(0, years);
}

/** Foto do SUAP no dobro do tamanho da miniatura. */
export const fotoGrande = (foto: string) => foto.replace('75x100', '150x200');
