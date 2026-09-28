import { useState } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import { useMensagens } from '../lib/data';
import { api, type Mensagem } from '../lib/suap';
import { mutate } from '../lib/store';
import { back } from '../lib/router';
import { relativeDay } from '../lib/dates';
import { Card, cx, Empty, ErrorNote, PageHeader, Skeleton } from '../components/ui';

/** Conteúdo vem em HTML do SUAP: converte para texto puro (sem executar nada). */
const toText = (html: string) => {
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
};

export function Messages() {
  const { data, error, loading, refresh } = useMensagens();
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (m: Mensagem) => {
    setOpen(open === m.id ? null : m.id);
    if (!m.registro_leitura) {
      mutate<Mensagem[]>('mensagens', (list = []) => list.map((x) => (x.id === m.id ? { ...x, registro_leitura: true } : x)));
      api.marcarLida(m.id).catch(() => {});
    }
  };

  return (
    <div className="rise">
      <button onClick={() => back('/voce')} className="-ml-2 mb-4 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft size={16} /> Você
      </button>
      <PageHeader title="Mensagens" subtitle="Caixa de entrada do SUAP" />
      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <Skeleton className="h-72" />}
      {data && data.length === 0 && <Card><Empty icon={<Inbox size={28} />} title="Nenhuma mensagem" /></Card>}
      {data && data.length > 0 && (
        <Card className="divide-y divide-line overflow-hidden">
          {data.map((m) => {
            const expanded = open === m.id;
            return (
              <article key={m.id}>
                <button onClick={() => toggle(m)} aria-expanded={expanded} className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-2">
                  <span className={cx('mt-2 size-2 shrink-0 rounded-full', m.registro_leitura ? 'bg-transparent' : 'bg-brand')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cx('truncate text-sm', m.registro_leitura ? 'text-muted' : 'font-semibold')}>{m.remetente?.nome}</p>
                      <span className="shrink-0 text-xs text-muted">{relativeDay(new Date(m.data_envio))}</span>
                    </div>
                    <p className={cx('mt-0.5', expanded ? '' : 'truncate', !m.registro_leitura && 'font-medium')}>{m.assunto}</p>
                  </div>
                </button>
                {expanded && (
                  <div className="px-4 pb-5 pl-9 text-[15px] leading-relaxed whitespace-pre-line text-ink/90">
                    {toText(m.conteudo || '') || 'Mensagem sem conteúdo.'}
                  </div>
                )}
              </article>
            );
          })}
        </Card>
      )}
    </div>
  );
}
