/** Marca do Google Sala de Aula (quadro com a turma), para identificar de onde vem uma tarefa. */
export function ClassroomGlyph({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} role="img" aria-label="Google Sala de Aula">
      <rect x="1" y="3" width="22" height="18" rx="2.5" fill="#F6BB18" />
      <rect x="3" y="5" width="18" height="14" rx="1" fill="#1E8E3E" />
      <circle cx="7" cy="11.4" r="1.3" fill="#57BB8A" />
      <circle cx="17" cy="11.4" r="1.3" fill="#57BB8A" />
      <path d="M4.6 16.2v-.6c0-1.3 1-2 2.4-2 .5 0 .9.1 1.3.3-.5.6-.8 1.3-.8 2.1v.2zM19.4 16.2v-.6c0-1.3-1-2-2.4-2-.5 0-.9.1-1.3.3.5.6.8 1.3.8 2.1v.2z" fill="#57BB8A" />
      <circle cx="12" cy="10.3" r="1.9" fill="#fff" />
      <path d="M8.2 16.2v-.4c0-1.9 1.7-2.9 3.8-2.9s3.8 1 3.8 2.9v.4z" fill="#fff" />
    </svg>
  );
}
