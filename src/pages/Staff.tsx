import { back } from '../lib/router';
import { StaffDirectory } from '../components/StaffDirectory';
import { IconButton, TopTitle } from '../components/ui';

/** Diretório dos servidores do IFRN (docentes, técnicos e estagiários), a partir do SUAP. */
export function Staff() {
  return (
    <>
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/voce')} />
        <span className="text-sm font-medium text-on-surface-variant">Você</span>
      </div>
      <TopTitle title="Servidores" sub="Quem trabalha no IFRN" />
      <StaffDirectory />
    </>
  );
}
