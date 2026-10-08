import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { PeriodProvider } from './lib/data';
import { useLoggedIn } from './lib/hooks';
import { persistStorage } from './lib/pwa';
import { navigate, usePath } from './lib/router';
import { applyHead, publicPage } from './lib/seo';
import { Shell } from './components/Shell';
import { Skeleton } from './components/ui';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Today } from './pages/Today';

/**
 * Como o `lazy`, mas dá para carregar antes de renderizar: as páginas abertas já vêm prontas no HTML,
 * e com o código delas em mãos o React assume o lugar sem a tela piscar em branco.
 */
function preloadable(load: () => Promise<ComponentType>) {
  let Loaded: ComponentType | undefined;
  const Lazy = lazy(() => load().then((C) => ({ default: C })));
  const Page = () => (Loaded ? <Loaded /> : <Lazy />);
  Page.preload = () => load().then((C) => { Loaded = C; });
  return Page;
}

// Telas secundárias carregam sob demanda para a primeira abertura ser leve
const Login = preloadable(() => import('./pages/Login').then((m) => m.Login));
const GradeTool = preloadable(() => import('./pages/Tools').then((m) => m.GradeTool));
const AbsenceTool = preloadable(() => import('./pages/Tools').then((m) => m.AbsenceTool));
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

/** As calculadoras abrem para qualquer pessoa, com ou sem login. */
const TOOLS: Record<string, ReturnType<typeof preloadable>> = { '/calculadora': GradeTool, '/faltas': AbsenceTool };

/** Carrega o código da página aberta que o HTML já trouxe pronta para esta rota. */
export const preloadPublic = (path: string) => (TOOLS[publicPage(path)?.path ?? ''] ?? Login).preload();

// Rotas antigas que podem estar salvas em favoritos / atalhos
const LEGACY: Record<string, string> = { '/flash': '/', '/callback': '/agenda' };

export default function App() {
  const loggedIn = useLoggedIn();
  const path = usePath();
  const Tool = TOOLS[publicPage(path)?.path ?? ''];

  useEffect(() => {
    if (LEGACY[path]) navigate(LEGACY[path], true);
  }, [path]);

  // O título da aba acompanha a página aberta
  useEffect(() => applyHead(path), [path]);

  // Com alguém logado, pede para o navegador não descartar o login e o cache do app
  useEffect(() => {
    if (loggedIn) persistStorage();
  }, [loggedIn]);

  if (Tool) return <><Suspense fallback={null}><Tool /></Suspense><UpdatePrompt /></>;
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
