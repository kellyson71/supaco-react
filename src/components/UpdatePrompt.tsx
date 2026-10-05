import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { applyUpdate, useUpdateReady } from '../lib/pwa';
import { EMPHASIZED, Icon, IconButton } from './ui';

/** Snackbar que aparece quando uma versão nova já foi baixada e só falta recarregar. */
export function UpdatePrompt() {
  const ready = useUpdateReady();
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  const update = () => {
    setApplying(true);
    applyUpdate();
  };

  return (
    <AnimatePresence>
      {ready && !dismissed && (
        <m.div role="status" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.35, ease: EMPHASIZED }}
          className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-lg bg-inverse-surface py-2 pr-2 pl-4 text-inverse-on-surface shadow-[0_6px_20px_rgb(0_0_0/0.3)] md:bottom-6">
          <Icon name="auto_awesome" size={20} fill className="shrink-0 text-inverse-primary" />
          <p className="min-w-0 flex-1 text-sm">Tem versão nova do Supaco.</p>
          <button onClick={update} disabled={applying} className="state h-10 shrink-0 rounded-full px-3 text-sm font-medium text-inverse-primary">
            {applying ? 'Atualizando…' : 'Atualizar'}
          </button>
          <IconButton icon="close" label="Agora não" onClick={() => setDismissed(true)} className="!text-inverse-on-surface" />
        </m.div>
      )}
    </AnimatePresence>
  );
}
