import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { onSessionChange, session } from './lib/api';
import { PeriodProvider } from './lib/data';
import { persistStorage } from './lib/pwa';
import { navigate, usePath } from './lib/router';
import { Shell } from './components/Shell';
import { Skeleton } from './components/ui';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Today } from './pages/Today';

// Telas secundárias carregam sob demanda para a primeira abertura ser leve
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Subjects = lazy(() => import('./pages/Subjects').then((m) => ({ default: m.Subjects })));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail').then((m) => ({ default: m.SubjectDetail })));
const Schedule = lazy(() => import('./pages/Schedule').then((m) => ({ default: m.Schedule })));
const Agenda = lazy(() => import('./pages/Agenda').then((m) => ({ default: m.Agenda })));
const Me = lazy(() => import('./pages/Me').then((m) => ({ default: m.Me })));
const Messages = lazy(() => import('./pages/Messages').then((m) => ({ default: m.Messages })));
const Diagnostics = lazy(() => import('./pages/Diagnostics').then((m) => ({ default: m.Diagnostics })));
const Campus = lazy(() => import('./pages/Campus').then((m) => ({ default: m.Campus })));
const Staff = lazy(() => import('./pages/Staff').then((m) => ({ default: m.Staff })));
const StaffDetail = lazy(() => import('./pages/StaffDetail').then((m) => ({ default: m.StaffDetail })));
const Retrospective = lazy(() => import('./pages/Retrospective').then((m) => ({ default: m.Retrospective })));

const useLoggedIn = () => useSyncExternalStore(onSessionChange, () => session.isLoggedIn);

// Rotas antigas que podem estar salvas em favoritos / atalhos
const LEGACY: Record<string, string> = { '/flash': '/', '/callback': '/agenda' };

export default function App() {
  const loggedIn = useLoggedIn();
  const path = usePath();

  useEffect(() => {
    if (LEGACY[path]) navigate(LEGACY[path], true);
  }, [path]);

  // Com alguém logado, pede para o navegador não descartar o login e o cache do app
  useEffect(() => {
    if (loggedIn) persistStorage();
  }, [loggedIn]);

  if (!loggedIn) return <><Suspense fallback={null}><Login /></Suspense><UpdatePrompt /></>;

  const detail = path.match(/^\/disciplinas\/([^/]+)/);
  const staff = path.match(/^\/servidores\/([^/]+)/);
  const page =
    detail ? <SubjectDetail code={decodeURIComponent(detail[1])} /> :
    staff ? <StaffDetail matricula={decodeURIComponent(staff[1])} /> :
    path === '/servidores' ? <Staff /> :
    path === '/disciplinas' ? <Subjects /> :
    path === '/horario' ? <Schedule /> :
    path === '/agenda' ? <Agenda /> :
    path === '/voce' ? <Me /> :
    path === '/mensagens' ? <Messages /> :
    path === '/diagnostico' ? <Diagnostics /> :
    path === '/campus' ? <Campus /> :
    path === '/retrospectiva' ? <Retrospective /> :
    <Today />;

  return (
    <PeriodProvider>
      <Shell><Suspense fallback={<Skeleton className="mt-4 h-96" />}>{page}</Suspense></Shell>
      <UpdatePrompt />
    </PeriodProvider>
  );
}
