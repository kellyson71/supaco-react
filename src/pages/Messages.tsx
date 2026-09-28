import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useMensagens } from '../lib/data';
import { api, type Mensagem } from '../lib/suap';
import { mutate } from '../lib/store';
import { back } from '../lib/router';
import { relativeDay } from '../lib/dates';
import { TONE_ORDER, TONES } from '../lib/tones';
import { Card, cx, EMPHASIZED, Empty, ErrorNote, Icon, IconButton, Item, Skeleton, Stagger, TopTitle } from '../components/ui';

/** Conteúdo vem em HTML do SUAP: converte para texto puro (sem executar nada). */
const toText = (html: string) => {
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
};

const initials = (name = '') => name.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function Messages() {
  const { data, error, loading, refresh } = useMensagens();
  const [open, setOpen] = useState<number | null>(null);
  const unread = data?.filter((x) => !x.registro_leitura).length ?? 0;

  const toggle = (msg: Mensagem) => {
    setOpen(open === msg.id ? null : msg.id);
    if (!msg.registro_leitura) {
      mutate<Mensagem[]>('mensagens', (list = []) => list.map((x) => (x.id === msg.id ? { ...x, registro_leitura: true } : x)));
      api.marcarLida(msg.id).catch(() => {});
    }
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/voce')} />
        <span className="text-sm font-medium text-on-surface-variant">Você</span>
      </div>
      <TopTitle title="Mensagens" sub={unread ? `${unread} não ${unread === 1 ? 'lida' : 'lidas'}` : 'Caixa de entrada do SUAP'} />
      {error && !data && <ErrorNote error={error} onRetry={refresh} />}
      {loading && <Skeleton className="h-72" />}
      {data && data.length === 0 && <Card className="rounded-2xl"><Empty icon="inbox" title="Caixa vazia" /></Card>}
      {data && data.length > 0 && (
        <Stagger className="mx-auto flex max-w-3xl flex-col gap-1 overflow-hidden rounded-2xl">
          {data.map((msg, i) => {
            const expanded = open === msg.id;
            const t = TONES[TONE_ORDER[i % TONE_ORDER.length]];
            return (
              <Item key={msg.id}>
                <article className={cx('rounded-sm', expanded ? 'bg-surface-container-high' : 'bg-surface-container')}>
                  <button onClick={() => toggle(msg)} aria-expanded={expanded} className="state flex w-full items-center gap-4 px-4 py-3 text-left">
                    <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', t.container, t.onContainer)}>{initials(msg.remetente?.nome) || '?'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={cx('truncate text-sm', msg.registro_leitura ? 'text-on-surface-variant' : 'font-semibold')}>{msg.remetente?.nome}</p>
                        <span className="shrink-0 text-xs text-on-surface-variant">{relativeDay(new Date(msg.data_envio))}</span>
                      </div>
                      <p className={cx(!expanded && 'truncate', !msg.registro_leitura && 'font-semibold')}>{msg.assunto}</p>
                    </div>
                    {!msg.registro_leitura && <span className="size-2.5 shrink-0 rounded-full bg-primary" />}
                    <m.span animate={{ rotate: expanded ? 180 : 0 }} className="shrink-0 text-on-surface-variant"><Icon name="expand_more" /></m.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }} className="overflow-hidden">
                        <div className="px-4 pb-5 pl-[72px] text-[15px] leading-relaxed whitespace-pre-line">{toText(msg.conteudo || '') || 'Mensagem sem conteúdo.'}</div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </article>
              </Item>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
