import { m } from 'motion/react';
import { toggleDark, useThemeState } from '../lib/theme';
import { EMPHASIZED, IconButton } from './ui';

/** Botão de tema com o ícone girando entre sol e lua. */
export function ThemeButton({ variant = 'standard' }: { variant?: 'standard' | 'tonal' }) {
  const { dark } = useThemeState();
  return (
    <m.span key={dark ? 'd' : 'l'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.35, ease: EMPHASIZED }} className="inline-flex">
      <IconButton icon={dark ? 'dark_mode' : 'light_mode'} fill label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'} onClick={toggleDark} variant={variant} />
    </m.span>
  );
}
