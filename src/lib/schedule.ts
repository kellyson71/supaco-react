// Parser do código de horário do SUAP ("3V1234 / 5M12") e utilidades de agenda.

export type Slot = { day: number; start: string; end: string; lessons: number; room: string };

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Grade padrão de aulas de 45 min do IFRN, por turno
const BLOCKS: Record<string, [string, string][]> = {
  M: [['07:00', '07:45'], ['07:45', '08:30'], ['08:50', '09:35'], ['09:35', '10:20'], ['10:30', '11:15'], ['11:15', '12:00']],
  V: [['13:00', '13:45'], ['13:45', '14:30'], ['14:50', '15:35'], ['15:35', '16:20'], ['16:30', '17:15'], ['17:15', '18:00']],
  N: [['19:00', '19:45'], ['19:45', '20:30'], ['20:45', '21:30'], ['21:30', '22:15']],
};

/** Dia no código do SUAP: 2 = segunda … 7 = sábado. Retorna dia no padrão JS (0 = domingo). */
export function parseHorarios(code: string | undefined | null, room: string): Slot[] {
  if (!code) return [];
  const out: Slot[] = [];
  for (const m of code.matchAll(/([2-7])([MVN])(\d+)/g)) {
    const blocks = BLOCKS[m[2]];
    const nums = [...new Set([...m[3]].map(Number))].filter((n) => n >= 1 && n <= blocks.length).sort();
    if (!nums.length) continue;
    // Blocos não contíguos (ex.: 1 e 5) viram intervalos separados
    let run = [nums[0]];
    const flush = () => out.push({
      day: Number(m[1]) - 1,
      start: blocks[run[0] - 1][0],
      end: blocks[run[run.length - 1] - 1][1],
      lessons: run.length,
      room,
    });
    for (const n of nums.slice(1)) {
      if (n === run[run.length - 1] + 1) run.push(n);
      else { flush(); run = [n]; }
    }
    flush();
  }
  return out;
}

/** "Chave 117 - Sala de Aula 16 (Piso 02) - Bloco 10 - Salas de Aula (PF)" → "Sala 16 · Bloco 10" */
export function shortRoom(local: string): string {
  if (!local) return '';
  const sala = local.match(/Sala(?: de Aula)?\s*(\d+\w*)/i)?.[1];
  const bloco = local.match(/Bloco\s*(\d+\w*)/i)?.[1];
  const lab = local.match(/(Laborat[óo]rio[^-(]*)/i)?.[1]?.trim();
  if (sala && bloco) return `Sala ${sala} · Bloco ${bloco}`;
  if (sala) return `Sala ${sala}`;
  if (lab) return lab.length > 32 ? `${lab.slice(0, 31)}…` : lab;
  const first = local.split(' - ')[0].trim();
  return first.length > 32 ? `${first.slice(0, 31)}…` : first;
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export type ClassItem = Slot & { subject: string; code: string };

/** Junta aulas consecutivas da mesma disciplina (intervalo de até 20 min) num bloco só. */
export function mergeDay(items: ClassItem[]): ClassItem[] {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start));
  const out: ClassItem[] = [];
  for (const c of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.code === c.code && toMin(c.start) - toMin(prev.end) <= 20) {
      out[out.length - 1] = { ...prev, end: c.end, lessons: prev.lessons + c.lessons };
    } else out.push({ ...c });
  }
  return out;
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function classesOn(subjects: { code: string; name: string; slots: Slot[] }[], day: number): ClassItem[] {
  return mergeDay(subjects.flatMap((s) => s.slots.filter((sl) => sl.day === day).map((sl) => ({ ...sl, subject: s.name, code: s.code }))));
}
