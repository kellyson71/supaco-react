import { useCallback, useId, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { session } from '../lib/api';
import { useTurma } from '../lib/data';
import { initials, shortName, titleCase, type Material, type Pessoa } from '../lib/suap';
import { TONES, toneFor } from '../lib/tones';
import { parseDay } from '../lib/dates';
import { fotoGrande as big } from '../lib/staff';
import { PersonSheet } from './PersonSheet';
import { Link } from './Link';
import { Button, Card, cx, EMPHASIZED, Icon, SectionHeader, SHAPES, Skeleton, Tap, type ShapeName } from './ui';

const STACK = 6;
/** Mola da foto compartilhada entre a miniatura e o cartão (container transform do M3). */
const SHARED = { type: 'spring', stiffness: 380, damping: 34 } as const;
const STACK_MOBILE = 3;

const More = ({ n, className }: { n: number; className?: string }) => (
  <span className={cx('flex size-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-on-primary ring-[3px] ring-[var(--md-surface-container-low)] tabular', className)}>
    +{n}
  </span>
);

/** Foto grande para o cartão da pessoa (sem animação compartilhada), usada também pela busca. */
export const personPhoto = (p: Pessoa) =>
  <span className="rounded-full ring-4 ring-[var(--md-surface-container-high)]"><Face p={{ ...p, foto: big(p.foto) }} size={120} eager /></span>;

/** Professores, colegas e materiais da turma; some sem alarde se o SUAP não responder. */
export function Turma({ code }: { code: string }) {
  const { data, loading } = useTurma(code);
  const [sel, setSel] = useState<Pessoa | null>(null);
  const close = useCallback(() => setSel(null), []);

  if (loading) return <Skeleton className="h-48 rounded-2xl" />;
  if (!data || (!data.professores.length && !data.colegas.length)) return null;

  return (
    <Card variant="filled" className="rounded-2xl p-5">
      <SectionHeader title="Turma" icon="groups" action={data.colegas.length > 0 && <span className="text-sm text-on-surface-variant tabular">{data.colegas.length} alunos</span>} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {data.professores.length > 0 && (
          <div className="flex flex-col gap-3">
            {data.professores.map((p) => <Teacher key={p.matricula} p={p} />)}
          </div>
        )}
        {data.colegas.length > 0 && <Classmates list={data.colegas} openId={sel?.matricula} onOpen={setSel} />}
      </div>
      {data.materiais.length > 0 && <Materials list={data.materiais} />}
      <AnimatePresence>
        {sel && (
          <PersonSheet key={sel.matricula} p={sel} onClose={close}
            photo={<m.div layoutId={`photo-${sel.matricula}`} transition={SHARED} className="rounded-full ring-4 ring-[var(--md-surface-container-high)]"><Face p={{ ...sel, foto: big(sel.foto) }} size={120} eager /></m.div>} />
        )}
      </AnimatePresence>
    </Card>
  );
}

/** Cartão do docente: o cartão inteiro leva à página dele; no hover a foto gira e surge o "Ver detalhes". */
function Teacher({ p }: { p: Pessoa }) {
  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-xl bg-secondary-container p-4 text-on-secondary-container transition-[box-shadow,transform] duration-300 ease-emphasized hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgb(0_0_0/0.18)]">
      <Link to={`/servidores/${p.matricula}`} label={`Ver detalhes de ${titleCase(p.nome)}`} className="absolute inset-0 rounded-xl outline-offset-[-3px]"><span /></Link>
      <span className="pointer-events-none shrink-0 transition-transform duration-500 ease-emphasized group-hover:scale-105 group-hover:rotate-6">
        <ShapedPhoto src={big(p.foto)} name={p.nome} shape="flower" size={76} />
      </span>
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide uppercase opacity-75">Docente</p>
        <p className="mt-0.5 text-lg leading-6 font-medium">{titleCase(p.nome)}</p>
        {p.email && (
          <span className="pointer-events-auto relative inline-flex">
            <Button variant="text" size="sm" icon="mail" href={`mailto:${p.email}`} className="-ml-3 !text-current">Enviar e-mail</Button>
          </span>
        )}
      </div>
      <SeeDetails className="self-start" />
    </div>
  );
}

/**
 * Chamada "Ver detalhes" para cartões clicáveis (o pai precisa de `group`): no hover o texto desliza para dentro;
 * no toque, onde não há hover, fica só a seta.
 */
export function SeeDetails({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx('pointer-events-none flex h-8 shrink-0 items-center overflow-hidden rounded-full bg-black/10 pr-2 pl-2 text-xs font-medium transition-[padding,background-color] duration-300 ease-emphasized group-hover:bg-primary group-hover:pl-3 group-hover:text-on-primary group-focus-within:bg-primary group-focus-within:pl-3 group-focus-within:text-on-primary dark:bg-white/10', className)}>
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-300 ease-emphasized group-hover:mr-1 group-hover:max-w-24 group-hover:opacity-100 group-focus-within:mr-1 group-focus-within:max-w-24 group-focus-within:opacity-100">Ver detalhes</span>
      <Icon name="arrow_forward" size={16} className="transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5" />
    </span>
  );
}

function Classmates({ list, openId, onOpen }: { list: Pessoa[]; openId?: string; onOpen: (p: Pessoa) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const me = session.user;
  const others = list.filter((p) => p.matricula !== me);
  const inClass = others.length !== list.length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (!term) return list;
    return list.filter((p) => p.nome.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(term));
  }, [list, q]);

  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-4 text-left">
        <div className="flex shrink-0 -space-x-3" aria-hidden>
          {others.slice(0, STACK).map((p, i) => (
            <m.span key={p.matricula} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.3, ease: EMPHASIZED }}
              className={cx(i >= STACK_MOBILE && 'max-sm:hidden')}>
              <Face p={p} size={40} eager className="ring-[3px] ring-[var(--md-surface-container-low)]" />
            </m.span>
          ))}
          {others.length > STACK_MOBILE && <More n={others.length - STACK_MOBILE} className="sm:hidden" />}
          {others.length > STACK && <More n={others.length - STACK} className="max-sm:hidden" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{inClass ? `Você e mais ${others.length} ${others.length === 1 ? 'colega' : 'colegas'}` : `${list.length} alunos`}</p>
          <p className="text-sm text-on-surface-variant">{open ? 'Toque para recolher' : 'Ver a turma inteira'}</p>
        </div>
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: EMPHASIZED }} className="text-on-surface-variant">
          <Icon name="expand_more" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div key="grid" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EMPHASIZED }} className="overflow-hidden">
            {list.length > 12 && (
              <label className="mt-4 flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
                <Icon name="search" size={20} className="text-on-surface-variant" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colega" aria-label="Buscar colega"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant" />
                {q && <button onClick={() => setQ('')} aria-label="Limpar busca" className="text-on-surface-variant"><Icon name="close" size={18} /></button>}
              </label>
            )}
            <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2 gap-y-4">
              {filtered.map((p) => {
                const isMe = p.matricula === me;
                return (
                  <li key={p.matricula}>
                    <button onClick={() => onOpen(p)} className="group flex w-full flex-col items-center gap-1.5 text-center" title={titleCase(p.nome)} aria-label={`Ver detalhes de ${titleCase(p.nome)}`}>
                      <span className="rounded-full transition-transform group-active:scale-95" style={{ width: 56, height: 56 }}>
                        {openId !== p.matricula && (
                          <m.span layoutId={`photo-${p.matricula}`} transition={SHARED} className="block rounded-full">
                            <Face p={p} size={56} className={isMe ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-[var(--md-surface-container-low)]' : 'transition-shadow group-hover:ring-2 group-hover:ring-primary/60'} />
                          </m.span>
                        )}
                      </span>
                      <span className={cx('line-clamp-2 text-xs leading-4', isMe && 'font-semibold text-primary')}>{isMe ? 'Você' : shortName(p.nome)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filtered.length === 0 && <p className="py-6 text-center text-sm text-on-surface-variant">Ninguém com esse nome na turma.</p>}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FILE_ICONS: [RegExp, string][] = [
  [/\.pdf(\?|$)/i, 'picture_as_pdf'],
  [/\.(pptx?|odp|key)(\?|$)/i, 'slideshow'],
  [/\.(docx?|odt|txt|md)(\?|$)/i, 'description'],
  [/\.(xlsx?|ods|csv)(\?|$)/i, 'table_chart'],
  [/\.(zip|rar|7z|tar|gz)(\?|$)/i, 'folder_zip'],
  [/\.(png|jpe?g|gif|webp|svg)(\?|$)/i, 'image'],
  [/youtu\.?be/i, 'smart_display'],
];

function Materials({ list }: { list: Material[] }) {
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-2 px-1 text-sm font-medium"><Icon name="folder_open" size={20} className="text-primary" fill /> Materiais de aula</p>
      <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        {list.map((mat) => {
          const icon = FILE_ICONS.find(([re]) => re.test(mat.url))?.[1] ?? 'link';
          const d = parseDay(mat.data);
          return (
            <li key={mat.url}>
              <Tap href={mat.url} label={mat.descricao} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-container text-on-tertiary-container"><Icon name={icon} size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm">{mat.descricao || 'Material sem título'}</span>
                  {d && <span className="block text-xs text-on-surface-variant">{d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>}
                </span>
                <Icon name="open_in_new" size={18} className="text-on-surface-variant" />
              </Tap>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Foto redonda com carregamento preguiçoso; cai para as iniciais se a imagem falhar. */
export function Face({ p, size, className, eager }: { p: Pessoa; size: number; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(!p.foto);
  const t = TONES[toneFor(p.matricula)];
  if (failed) {
    return (
      <span className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold', t.container, t.onContainer, className)}
        style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {initials(p.nome)}
      </span>
    );
  }
  return (
    <img src={p.foto} alt="" width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}
      className={cx('shrink-0 rounded-full bg-surface-container-highest object-cover object-top', className)} style={{ width: size, height: size }} />
  );
}

/** Foto recortada numa forma expressiva do M3. */
export function ShapedPhoto({ src, name, shape, size, still }: { src: string; name: string; shape: ShapeName; size: number; still?: boolean }) {
  const id = useId();
  const [failed, setFailed] = useState(!src);
  return (
    <m.svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" aria-hidden
      initial={still ? false : { rotate: -20, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
      <defs><clipPath id={id}><path d={SHAPES[shape]} /></clipPath></defs>
      <path d={SHAPES[shape]} className="fill-[var(--md-tertiary-container)]" />
      {failed ? (
        <text x="50" y="50" dy="0.35em" textAnchor="middle" className="fill-[var(--md-on-tertiary-container)] text-[34px] font-semibold">{initials(name)}</text>
      ) : (
        <image href={src} width="100" height="100" preserveAspectRatio="xMidYMin slice" clipPath={`url(#${id})`} onError={() => setFailed(true)} />
      )}
    </m.svg>
  );
}
