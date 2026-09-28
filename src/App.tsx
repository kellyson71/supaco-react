import { useEffect, useSyncExternalStore } from 'react';
import { onSessionChange, session } from './lib/api';
import { PeriodProvider } from './lib/data';
import { navigate, usePath } from './lib/router';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Subjects } from './pages/Subjects';
import { SubjectDetail } from './pages/SubjectDetail';
import { Schedule } from './pages/Schedule';
import { Agenda } from './pages/Agenda';
import { Me } from './pages/Me';
import { Messages } from './pages/Messages';

const useLoggedIn = () => useSyncExternalStore(onSessionChange, () => session.isLoggedIn);

// Rotas antigas que podem estar salvas em favoritos / atalhos
const LEGACY: Record<string, string> = { '/flash': '/', '/callback': '/agenda' };

export default function App() {
  const loggedIn = useLoggedIn();
  const path = usePath();

  useEffect(() => {
    if (LEGACY[path]) navigate(LEGACY[path], true);
  }, [path]);

  if (!loggedIn) return <Login />;

  const detail = path.match(/^\/disciplinas\/([^/]+)/);
  const page =
    detail ? <SubjectDetail code={decodeURIComponent(detail[1])} /> :
    path === '/disciplinas' ? <Subjects /> :
    path === '/horario' ? <Schedule /> :
    path === '/agenda' ? <Agenda /> :
    path === '/voce' ? <Me /> :
    path === '/mensagens' ? <Messages /> :
    <Today />;

  return (
    <PeriodProvider>
      <Shell wide={path === '/' || path === '/horario' || path === '/voce'}>{page}</Shell>
    </PeriodProvider>
  );
}
