import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'motion/react';
import { session } from '../lib/api';
import { useCurrentSubjects, useTurmas } from '../lib/data';
import { subjectTone, titleCase, type Pessoa } from '../lib/suap';
import { TONES } from '../lib/tones';
import { Button, cx, EMPHASIZED, Icon } from './ui';

export type Role = 'teacher' | 'student';

/**
 * Cartão com os detalhes de uma pessoa da turma. A foto entra pelo `layoutId`
 * (a mesma da miniatura), no padrão de transformação de contêiner do Material 3.
 */
export function PersonSheet({ p, role, photo, onClose }: { p: Pessoa; role: Role; photo: ReactNode; onClose: () => void }) {
  const { data: subjects } = useCurrentSubjects();
  const { data: turmas } = useTurmas(subjects?.map((s) => s.code));
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isMe = p.matricula === session.user;

  const shared = (subjects ?? []).filter((s) => {
    const t = turmas?.[s.code];
    return (role === 'teacher' ? t?.professores : t?.colegas)?.some((x) => x.matricula === p.matricula);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard?.writeText(p.matricula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={titleCase(p.nome)}>
      <m.div className="absolute inset-0 bg-black/50" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <m.div
        initial={{ opacity: 0, y: 48, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EMPHASIZED }}
        className="relative w-full overflow-hidden rounded-t-xl bg-surface-container-high pb-[max(1.5rem,env(safe-area-inset-bottom))] text-on-surface sm:max-w-sm sm:rounded-xl sm:pb-6">
        <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-outline-variant sm:hidden" aria-hidden />
        <div className={cx('relative flex h-28 items-end justify-center', role === 'teacher' ? 'bg-secondary-container' : 'bg-primary-container')}>
          <div className="absolute top-2 right-2">
            <button ref={closeRef} onClick={onClose} aria-label="Fechar" className="state flex size-10 items-center justify-center rounded-full">
              <Icon name="close" />
            </button>
          </div>
          <div className="translate-y-1/2">{photo}</div>
        </div>

        <m.div className="px-6 pt-20 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.3, ease: EMPHASIZED }}>
          <p className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">{isMe ? 'Você' : role === 'teacher' ? 'Docente' : 'Colega de turma'}</p>
          <h2 className="mt-1 text-2xl leading-8 font-semibold tracking-tight">{titleCase(p.nome)}</h2>
          <button onClick={copy} className="mx-auto mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-on-surface-variant tabular hover:bg-surface-container-highest">
            <Icon name={copied ? 'check' : 'content_copy'} size={16} />{copied ? 'Matrícula copiada' : `Matrícula ${p.matricula}`}
          </button>

          {shared.length > 0 && (
            <div className="mt-5 text-left">
              <p className="mb-2 text-sm font-medium text-on-surface-variant">
                {isMe ? 'Suas matérias' : role === 'teacher' ? `Dá aula para você em ${shared.length === 1 ? '1 matéria' : `${shared.length} matérias`}` : `Divide sala com você em ${shared.length === 1 ? '1 matéria' : `${shared.length} matérias`}`}
              </p>
              <ul className="flex flex-col gap-1.5">
                {shared.map((s, i) => (
                  <m.li key={s.code} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.05, duration: 0.3, ease: EMPHASIZED }}
                    className="flex items-center gap-3 rounded-xl bg-surface-container-highest px-3.5 py-2.5 text-sm">
                    <span className={cx('size-2.5 shrink-0 rounded-full', TONES[subjectTone(s)].color)} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  </m.li>
                ))}
              </ul>
            </div>
          )}

          {p.email && (
            <Button icon="mail" href={`mailto:${p.email}`} className="mt-5 w-full">Enviar e-mail</Button>
          )}
        </m.div>
      </m.div>
    </div>,
    document.body,
  );
}
