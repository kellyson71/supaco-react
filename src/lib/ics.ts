// Exporta o horário semanal como arquivo .ics (Google Agenda, Apple Calendário, Outlook).
import type { Evento, Subject } from './suap';

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function buildIcs(subjects: Subject[], until: Date) {
  const now = new Date();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Supaco//Horario//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Aulas (Supaco)', 'X-WR-TIMEZONE:America/Fortaleza'];
  subjects.forEach((s) => s.slots.forEach((sl, i) => {
    // Primeira ocorrência a partir de hoje
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    first.setDate(first.getDate() + ((sl.day - first.getDay() + 7) % 7));
    const [sh, sm] = sl.start.split(':').map(Number);
    const [eh, em] = sl.end.split(':').map(Number);
    const start = new Date(first); start.setHours(sh, sm);
    const end = new Date(first); end.setHours(eh, em);
    lines.push(
      'BEGIN:VEVENT',
      `UID:supaco-${s.code}-${sl.day}-${i}@supaco`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;TZID=America/Fortaleza:${stamp(start)}`,
      `DTEND;TZID=America/Fortaleza:${stamp(end)}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${stamp(until)}`,
      `SUMMARY:${esc(s.name)}`,
      sl.room ? `LOCATION:${esc(sl.room)}` : '',
      'END:VEVENT',
    );
  }));
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

function save(ics: string, filename: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadIcs = (subjects: Subject[], until: Date) => save(buildIcs(subjects, until), 'horario-supaco.ics');

/** Um evento do campus como .ics (com horário, ou dia inteiro se não houver). */
export function downloadEventIcs(e: Evento) {
  const at = (day: string, hm: string | null) => {
    const [y, mo, d] = day.split('-').map(Number);
    const [h, mi] = (hm ?? '00:00').split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi);
  };
  const dateOnly = (day: string) => day.replace(/-/g, '');
  const nextDay = (day: string) => { const d = at(day, null); d.setDate(d.getDate() + 1); return stamp(d).slice(0, 8); };
  const timed = !!e.horaInicio;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Supaco//Eventos//PT-BR', 'BEGIN:VEVENT',
    `UID:supaco-evento-${e.id}@supaco`,
    `DTSTAMP:${stamp(new Date())}`,
    timed ? `DTSTART;TZID=America/Fortaleza:${stamp(at(e.inicio, e.horaInicio))}` : `DTSTART;VALUE=DATE:${dateOnly(e.inicio)}`,
    timed ? `DTEND;TZID=America/Fortaleza:${stamp(at(e.fim, e.horaFim ?? e.horaInicio))}` : `DTEND;VALUE=DATE:${nextDay(e.fim)}`,
    `SUMMARY:${esc(e.nome)}`,
    e.local ? `LOCATION:${esc(e.local)}` : '',
    `DESCRIPTION:${esc(`${e.resumo}\n\n${e.link}`)}`,
    `URL:${e.link}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  save(lines.filter(Boolean).join('\r\n'), `evento-${e.id}.ics`);
}
