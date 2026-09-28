import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAvaliacoes, useTasks } from '../lib/data';
import { classroom, connectClassroom } from '../lib/classroom';
import { buildDeadlines, type Deadline } from '../lib/agenda';
import { daysBetween } from '../lib/dates';
import { refreshAll } from '../lib/store';
import { Card, Empty, ErrorNote, Eyebrow, PageHeader, Skeleton } from '../components/ui';
import { DeadlineRow } from './Today';

export function Agenda() {
  const [, force] = useState(0);
  const linked = classroom.linked;
  const tokenOk = classroom.tokenValid;
  const suap = useAvaliacoes();
  const gc = useTasks(linked && tokenOk);
  const list = buildDeadlines(suap.data, gc.data);

  const now = new Date();
  const groups: [string, Deadline[]][] = [
    ['Atrasadas', list.filter((d) => d.date && daysBetween(now, d.date) < 0)],
    ['Próximos 7 dias', list.filter((d) => d.date && daysBetween(now, d.date) >= 0 && daysBetween(now, d.date) <= 7)],
    ['Depois', list.filter((d) => d.date && daysBetween(now, d.date) > 7)],
    ['Sem data', list.filter((d) => !d.date)],
  ];

  return (
    <div className="rise">
      <PageHeader title="Agenda" subtitle="Avaliações do SUAP e tarefas do Classroom que você ainda não entregou" />

      <ClassroomBanner linked={linked} tokenOk={tokenOk} authError={gc.error?.name === 'ClassroomAuthError' || /Reconecte/.test(gc.error?.message ?? '')} onChange={() => force((x) => x + 1)} />

      {suap.error && !suap.data && <div className="mb-4"><ErrorNote error={suap.error} onRetry={suap.refresh} /></div>}
      {suap.loading ? <Skeleton className="h-64" /> : list.length === 0 ? (
        <Card><Empty title="Nenhum prazo pela frente">Quando professores cadastrarem avaliações no SUAP, elas aparecem aqui.</Empty></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.filter(([, l]) => l.length).map(([title, l]) => (
            <div key={title}>
              <Eyebrow right={<span className="font-mono text-xs text-muted">{l.length}</span>}>{title}</Eyebrow>
              <Card><ul className="divide-y divide-line">{l.map((d) => <DeadlineRow key={d.id} d={d} />)}</ul></Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassroomBanner({ linked, tokenOk, authError, onChange }: { linked: boolean; tokenOk: boolean; authError: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (linked && tokenOk && !authError) return null;

  const connect = async () => {
    setBusy(true);
    setErr('');
    try {
      await connectClassroom(linked);
      onChange();
      refreshAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
      <GoogleMark />
      <div className="flex-1">
        <p className="font-medium">{linked ? 'Reconecte o Google Classroom' : 'Traga as tarefas do Google Classroom'}</p>
        <p className="mt-0.5 text-sm text-muted">
          {linked ? 'O acesso do Google expira a cada hora. Um clique renova.' : 'Só leitura: o Supaco vê suas turmas e tarefas pendentes, nada mais.'}
        </p>
        {err && <p className="mt-1 text-sm text-bad">{err}</p>}
      </div>
      <button onClick={connect} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60">
        {busy && <Loader2 size={15} className="animate-spin" />}
        {linked ? 'Reconectar' : 'Conectar'}
      </button>
    </Card>
  );
}

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="size-9 shrink-0" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
