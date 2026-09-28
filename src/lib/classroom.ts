// Google Classroom via Google Identity Services (fluxo de token no navegador, sem client secret).

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '493737247808-0rv9jbldtskqdg78l122foess6h1t7ll.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
].join(' ');
const KEY = 'supaco:google';

type Stored = { token: string; exp: number; linked: true };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (e: { type: string }) => void;
          }): { requestAccessToken(o?: { prompt?: string }): void };
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

const load = (): Stored | null => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
};

export const classroom = {
  get linked() { return !!load()?.linked; },
  get tokenValid() { const s = load(); return !!s && s.exp > Date.now() + 60_000; },
  token() { return this.tokenValid ? load()!.token : null; },
  unlink() {
    const s = load();
    if (s?.token) window.google?.accounts.oauth2.revoke(s.token);
    localStorage.removeItem(KEY);
  },
};

let gisLoading: Promise<void> | null = null;
const loadGis = () => (gisLoading ??= new Promise<void>((resolve, reject) => {
  if (window.google?.accounts) return resolve();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => { gisLoading = null; reject(new Error('Não foi possível carregar o login do Google.')); };
  document.head.appendChild(s);
}));

/** Abre o popup do Google. Precisa ser chamado a partir de um clique. */
export async function connectClassroom(silent = false): Promise<void> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (!r.access_token) return reject(new Error(r.error || 'Acesso ao Classroom não autorizado.'));
        localStorage.setItem(KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000, linked: true }));
        resolve();
      },
      error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'Janela do Google fechada.' : 'Falha ao conectar com o Google.')),
    });
    client.requestAccessToken({ prompt: silent ? '' : 'consent' });
  });
}

export type Task = {
  id: string;
  title: string;
  course: string;
  link: string;
  due: string | null; // ISO
  late: boolean;
};

type Course = { id: string; name: string };
type Work = {
  id: string; title: string; alternateLink: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
};
type Submission = { courseWorkId: string; state: string; late?: boolean };

export class ClassroomAuthError extends Error {}

async function gget<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://classroom.googleapis.com/v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) throw new ClassroomAuthError('Reconecte o Google Classroom.');
  if (!res.ok) throw new Error(`Classroom respondeu ${res.status}`);
  return res.json();
}

const dueOf = (w: Work) => {
  if (!w.dueDate) return null;
  const { year, month, day } = w.dueDate;
  // Classroom informa prazo em UTC
  return new Date(Date.UTC(year, month - 1, day, w.dueTime?.hours ?? 23, w.dueTime?.minutes ?? 59)).toISOString();
};

/** Tarefas ainda não entregues, com prazo futuro ou atrasadas há até 14 dias. */
export async function fetchPendingTasks(): Promise<Task[]> {
  const token = classroom.token();
  if (!token) throw new ClassroomAuthError('Reconecte o Google Classroom.');
  const { courses = [] } = await gget<{ courses?: Course[] }>('courses?courseStates=ACTIVE&studentId=me&pageSize=50', token);

  const perCourse = await Promise.all(courses.map(async (c) => {
    const [work, subs] = await Promise.all([
      gget<{ courseWork?: Work[] }>(`courses/${c.id}/courseWork?orderBy=dueDate%20desc&pageSize=40`, token).catch(() => ({ courseWork: [] })),
      gget<{ studentSubmissions?: Submission[] }>(`courses/${c.id}/courseWork/-/studentSubmissions?pageSize=100`, token).catch(() => ({ studentSubmissions: [] })),
    ]);
    const done = new Set((subs.studentSubmissions ?? [])
      .filter((s) => s.state === 'TURNED_IN' || s.state === 'RETURNED')
      .map((s) => s.courseWorkId));
    return (work.courseWork ?? [])
      .filter((w) => !done.has(w.id))
      .map((w): Task => {
        const due = dueOf(w);
        return { id: w.id, title: w.title, course: c.name, link: w.alternateLink, due, late: !!due && new Date(due) < new Date() };
      });
  }));

  const cutoff = Date.now() - 14 * 86_400_000;
  return perCourse.flat()
    .filter((t) => t.due && new Date(t.due).getTime() > cutoff)
    .sort((a, b) => a.due!.localeCompare(b.due!));
}
