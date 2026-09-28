import { useState } from 'react';
import { ChevronRight, ExternalLink, LogOut, Mail, Moon, Sun } from 'lucide-react';
import { useAluno, useEu, useMensagens, useRequisitos } from '../lib/data';
import { photoUrl, SUAP_URL } from '../lib/suap';
import { classroom, connectClassroom } from '../lib/classroom';
import { session } from '../lib/api';
import { clearCache, refreshAll } from '../lib/store';
import { useTheme } from '../lib/hooks';
import { Card, cx, Eyebrow, Skeleton } from '../components/ui';
import { Link } from '../components/Shell';

const REQ_LABELS: Record<string, string> = {
  regulares_obrigatorios: 'Disciplinas obrigatórias',
  regulares_optativos: 'Optativas',
  eletivos: 'Eletivas',
  seminarios: 'Seminários',
  pratica_profissional: 'Prática profissional',
  pratica_profissional_estagio: 'Estágio',
  atividades_pratica_profissional: 'Atividades de prática profissional',
  extensao_componentes: 'Extensão (componentes)',
  extensao_outras_atividades: 'Extensão (outras atividades)',
  extensao_outros_componentes: 'Extensão (outros componentes)',
  atividades_aprofundamento: 'Atividades de aprofundamento',
  atividades_complementares: 'Atividades complementares',
  tcc: 'TCC',
  pratica_componente: 'Prática como componente',
  visita_tecnica: 'Visita técnica',
};

export function Me() {
  const { data: eu } = useEu();
  const { data: aluno } = useAluno();
  const { data: msgs } = useMensagens();
  const unread = msgs?.filter((m) => !m.registro_leitura).length ?? 0;
  const { dark, toggle } = useTheme();

  const logout = () => {
    classroom.unlink();
    clearCache();
    session.clear();
  };

  return (
    <div className="rise">
      <header className="mt-2 mb-8 flex items-center gap-4">
        {eu?.foto ? (
          <img src={photoUrl(eu.foto)} alt="" className="size-20 rounded-2xl object-cover ring-1 ring-line" />
        ) : eu ? (
          <div className="flex size-20 items-center justify-center rounded-2xl bg-brand-soft font-display text-3xl font-semibold text-brand">{eu.nome_usual[0]}</div>
        ) : <Skeleton className="size-20" />}
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight font-semibold tracking-tight md:text-3xl">{eu?.nome_usual ?? ' '}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{eu?.identificacao}</p>
          {eu?.campus && <p className="text-sm text-muted">Campus {eu.campus}</p>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <Eyebrow>Curso</Eyebrow>
            <Card className="p-5">
              {aluno ? (
                <>
                  <p className="font-medium leading-snug">{aluno.curso}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-3">
                    <Fact label="IRA" value={aluno.ira || '—'} mono />
                    <Fact label="Período" value={aluno.qtd_periodos ? `${aluno.periodo_referencia}º de ${aluno.qtd_periodos}` : `${aluno.periodo_referencia}º`} mono />
                    <Fact label="Ingresso" value={aluno.ingresso} mono />
                  </dl>
                  <p className="mt-4 text-sm text-muted">Situação: <span className="font-medium text-ink">{aluno.situacao}</span></p>
                </>
              ) : <Skeleton className="h-28" />}
            </Card>
          </div>
          <Completion />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <Eyebrow>Atalhos</Eyebrow>
            <Card className="divide-y divide-line overflow-hidden">
              <Link to="/mensagens" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <Mail size={18} className="text-muted" />
                <span className="flex-1 font-medium">Mensagens do SUAP</span>
                {unread > 0 && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">{unread} nova{unread > 1 ? 's' : ''}</span>}
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <a href={SUAP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <ExternalLink size={18} className="text-muted" />
                <span className="flex-1 font-medium">Abrir o SUAP</span>
              </a>
            </Card>
          </div>

          <div>
            <Eyebrow>Preferências</Eyebrow>
            <Card className="divide-y divide-line overflow-hidden">
              <button onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2">
                {dark ? <Moon size={18} className="text-muted" /> : <Sun size={18} className="text-muted" />}
                <span className="flex-1 font-medium">Tema</span>
                <span className="text-sm text-muted">{dark ? 'Escuro' : 'Claro'}</span>
              </button>
              <ClassroomRow />
            </Card>
          </div>

          <button onClick={logout} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3.5 font-medium text-bad transition-colors hover:bg-bad-soft">
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cx('mt-0.5 font-semibold', mono && 'font-mono')}>{value}</dd>
    </div>
  );
}

function Completion() {
  const { data } = useRequisitos();
  if (!data) return null;
  const pct = Math.round(Number(data.percentual_cumprida) || 0);
  const pending = Object.entries(data)
    .filter(([k, v]) => REQ_LABELS[k] && typeof v === 'object' && v && (v as { ch_pendente: number }).ch_pendente > 0)
    .map(([k, v]) => ({ label: REQ_LABELS[k], ...(v as { ch_esperada: number; ch_cumprida: number; ch_pendente: number }) }));

  return (
    <div>
      <Eyebrow>Conclusão do curso</Eyebrow>
      <Card className="p-5">
        <div className="flex items-end justify-between">
          <p className="font-mono text-4xl font-semibold tabular">{pct}%</p>
          <p className="text-sm text-muted">{data.totais.ch_cumprida} de {data.totais.ch_esperada} h</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        {pending.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {pending.map((p) => (
              <li key={p.label} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{p.label}</span>
                <span className="font-mono text-xs text-muted">faltam {p.ch_pendente} h</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ClassroomRow() {
  const [linked, setLinked] = useState(classroom.linked);
  const [busy, setBusy] = useState(false);
  const act = async () => {
    if (linked) {
      classroom.unlink();
      setLinked(false);
      refreshAll();
      return;
    }
    setBusy(true);
    try {
      await connectClassroom();
      setLinked(true);
      refreshAll();
    } catch { /* usuário fechou o popup */ } finally { setBusy(false); }
  };
  return (
    <button onClick={act} disabled={busy} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2">
      <span className={cx('size-2.5 rounded-full', linked ? 'bg-brand' : 'bg-line')} />
      <span className="flex-1 font-medium">Google Classroom</span>
      <span className={cx('text-sm', linked ? 'text-bad' : 'text-brand')}>{busy ? 'Conectando…' : linked ? 'Desconectar' : 'Conectar'}</span>
    </button>
  );
}
