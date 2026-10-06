import { useState } from 'react';
import { m } from 'motion/react';
import { useAvaliacoes, useCampus, useEu, useTasks } from '../lib/data';
import { classroom, connectClassroom } from '../lib/classroom';
import { buildDeadlines, type Deadline } from '../lib/agenda';
import { daysBetween } from '../lib/dates';
import { refreshAll } from '../lib/store';
import { Button, Card, Chip, EMPHASIZED, Empty, ErrorNote, Item, SectionHeader, Skeleton, Stagger, TopTitle } from '../components/ui';
import { ClassroomGlyph } from '../components/Brand';
import { DeadlineRow } from './Today';

export function Agenda() {
  const [, force] = useState(0);
  const linked = classroom.linked;
  const tokenOk = classroom.tokenValid;
  const suap = useAvaliacoes();
  const gc = useTasks(linked && tokenOk);
  const { data: eu } = useEu();
  const { data: campus } = useCampus(eu?.campus);
  const all = buildDeadlines(suap.data, gc.data, campus?.eventos);
  const [source, setSource] = useState<Deadline['source'] | 'tudo'>('tudo');
  const count = (src: Deadline['source']) => all.filter((d) => d.source === src).length;
  const list = source === 'tudo' ? all : all.filter((d) => d.source === source);

  const now = new Date();
  const groups: [string, string, Deadline[]][] = [
    ['Atrasadas', 'running_with_errors', list.filter((d) => d.date && daysBetween(now, d.date) < 0)],
    ['Esta semana', 'bolt', list.filter((d) => d.date && daysBetween(now, d.date) >= 0 && daysBetween(now, d.date) <= 7)],
    ['Mais pra frente', 'upcoming', list.filter((d) => d.date && daysBetween(now, d.date) > 7)],
    ['Sem data', 'event_busy', list.filter((d) => !d.date)],
  ];

  return (
    <>
      <TopTitle title="Agenda" sub={all.length ? `${all.length} ${all.length === 1 ? 'prazo' : 'prazos'} pela frente` : 'Provas do SUAP, tarefas do Classroom e eventos do campus'} />

      <ClassroomBanner linked={linked} tokenOk={tokenOk} authError={/Reconecte/.test(gc.error?.message ?? '')} onChange={() => force((x) => x + 1)} />

      {suap.error && !suap.data && <div className="mb-4"><ErrorNote error={suap.error} onRetry={suap.refresh} /></div>}

      {/* De onde vem cada prazo: dá para ver só as provas, só o Classroom ou só o campus */}
      {all.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip label={`Tudo (${all.length})`} selected={source === 'tudo'} onClick={() => setSource('tudo')} />
          {count('suap') > 0 && <Chip label={`Provas e trabalhos (${count('suap')})`} icon="fact_check" selected={source === 'suap'} onClick={() => setSource('suap')} />}
          {count('classroom') > 0 && <Chip label={`Sala de Aula (${count('classroom')})`} icon="assignment" selected={source === 'classroom'} onClick={() => setSource('classroom')} />}
          {count('campus') > 0 && <Chip label={`Campus (${count('campus')})`} icon="apartment" selected={source === 'campus'} onClick={() => setSource('campus')} />}
        </div>
      )}

      {suap.loading ? <Skeleton className="h-64" /> : list.length === 0 ? (
        <Card className="rounded-2xl"><Empty icon="event_available" title="Nenhum prazo pela frente">Quando professores cadastrarem avaliações no SUAP, elas aparecem aqui.</Empty></Card>
      ) : (
        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {groups.filter(([, , l]) => l.length).map(([title, icon, l]) => (
            <Item key={title}>
              <SectionHeader title={`${title} · ${l.length}`} icon={icon} />
              <div className="flex flex-col gap-1 overflow-hidden rounded-2xl">{l.map((d) => <DeadlineRow key={d.id} d={d} />)}</div>
            </Item>
          ))}
        </Stagger>
      )}
    </>
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
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EMPHASIZED }}
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-container p-3 sm:p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest"><ClassroomGlyph size={28} /></span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="leading-5 font-medium">{linked ? 'Reconecte o Google Sala de Aula' : 'Google Sala de Aula'}</p>
        <p className="mt-0.5 text-sm text-on-surface-variant">
          {linked ? 'O acesso do Google expira a cada hora. Um toque renova.' : 'Veja aqui o que falta entregar. O Supaco só lê, não altera nada.'}
        </p>
        {err && <p className="mt-1 text-sm font-medium text-error">{err}</p>}
      </div>
      <Button size="sm" icon={busy ? 'progress_activity' : linked ? 'refresh' : 'add_link'} onClick={connect} disabled={busy}>{linked ? 'Reconectar' : 'Conectar'}</Button>
    </m.div>
  );
}
