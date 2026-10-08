// Calculadoras públicas: páginas que funcionam sem login e explicam as regras de nota e de falta do IFRN.
import type { ReactNode } from 'react';
import { useLoggedIn } from '../lib/hooks';
import { PAGES } from '../lib/seo';
import { AbsenceCalculator, GradeCalculator } from '../components/Calculators';
import { PublicFooter, PublicHeader, SuapLink, Wrap } from '../components/Public';
import { Button, Icon } from '../components/ui';
import { Link } from '../components/Link';

function ToolPage({ path, title, lede, tool, suap, children, pitch, other }: {
  path: string; title: string; lede: string; tool: ReactNode;
  /** Onde, no SUAP, estão os números que a calculadora pede. */
  suap: string;
  children: ReactNode;
  /** O que o app faz a mais para quem entra com o SUAP. */
  pitch: string;
  other: { to: string; label: string };
}) {
  const loggedIn = useLoggedIn();
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader current={path} />
      <main>
        <Wrap>
          <div className="pt-8 lg:pt-14">
            <h1 className="text-[36px] leading-[44px] font-semibold tracking-tight lg:text-[52px] lg:leading-[60px]">{title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">{lede}</p>
          </div>

          <div className="mt-10 rounded-3xl bg-surface-container-low p-4 sm:p-6 lg:p-8">{tool}</div>
          <p className="mt-4 px-1 text-sm text-on-surface-variant">{suap} <SuapLink /></p>

          <article className="mt-20 flex max-w-2xl flex-col gap-14 lg:mt-28">{children}</article>

          <div className="mt-20 flex flex-col gap-6 rounded-3xl bg-primary-container p-8 text-on-primary-container sm:flex-row sm:items-center sm:gap-10 lg:mt-28 lg:p-12">
            <p className="flex-1 text-[22px] leading-8 font-medium tracking-tight">{pitch}</p>
            <Button to="/" size="lg" icon={loggedIn ? 'arrow_forward' : 'login'} className="shrink-0">{loggedIn ? 'Abrir o Supaco' : 'Entrar com o SUAP'}</Button>
          </div>
          <Link to={other.to} className="mt-6 inline-flex items-center gap-1 rounded-md px-1 font-medium text-primary underline-offset-4 hover:underline">
            {other.label}<Icon name="arrow_forward" size={18} />
          </Link>
        </Wrap>
      </main>
      <PublicFooter />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[26px] leading-8 font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-[17px] leading-7 text-on-surface-variant [&_b]:font-medium [&_b]:text-on-surface">{children}</div>
    </section>
  );
}

const Formula = ({ label, children }: { label: string; children: ReactNode }) => (
  <p className="flex flex-col gap-1 rounded-xl bg-surface-container px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4">
    <span className="w-20 shrink-0 text-sm">{label}</span>
    <span className="text-lg font-medium text-on-surface tabular">{children}</span>
  </p>
);

export function GradeTool() {
  const page = PAGES['/calculadora'];
  return (
    <ToolPage path={page.path} title="Calculadora de notas do IFRN"
      lede="Coloque as notas que você já tem e veja quanto falta para passar. Calculadora do IF, sem login."
      tool={<GradeCalculator />}
      suap="Não lembra das suas notas? Elas estão no boletim."
      pitch="Entrando com o SUAP, o Supaco faz essa conta sozinho em todas as suas matérias."
      other={{ to: '/faltas', label: 'Calculadora de faltas' }}>
      <Block title="Como a média do IFRN é calculada?">
        <p>As notas vão de <b>0 a 100</b> e as últimas etapas pesam mais.</p>
        <Formula label="2 etapas">MD = (2 × N1 + 3 × N2) ÷ 5</Formula>
        <Formula label="4 etapas">MD = (2 × N1 + 2 × N2 + 3 × N3 + 3 × N4) ÷ 10</Formula>
      </Block>

      <Block title="Qual é a média para passar?">
        <ul className="flex flex-col gap-3">
          <li className="flex gap-3"><Icon name="check_circle" fill className="mt-0.5 shrink-0 text-success" /><span><b>60 ou mais:</b> aprovado, com pelo menos 75% de frequência.</span></li>
          <li className="flex gap-3"><Icon name="warning" fill className="mt-0.5 shrink-0 text-warning" /><span><b>De 20 a 59:</b> prova final.</span></li>
          <li className="flex gap-3"><Icon name="cancel" fill className="mt-0.5 shrink-0 text-error" /><span><b>Abaixo de 20:</b> reprovado, sem prova final.</span></li>
        </ul>
      </Block>

      <Block title="Como funciona a prova final?">
        <p>
          Vale o melhor resultado para você: a média simples com a prova final, <b>(MD + NAF) ÷ 2</b>, ou a média ponderada trocando a nota de <b>uma etapa</b> pela da final.
          Com 60 ou mais, você é aprovado.
        </p>
      </Block>
    </ToolPage>
  );
}

const LIMITS = [40, 60, 80, 120, 160];

export function AbsenceTool() {
  const page = PAGES['/faltas'];
  return (
    <ToolPage path={page.path} title="Calculadora de faltas do IFRN"
      lede="Veja quantas aulas você ainda pode faltar sem reprovar por frequência. Calculadora do IF, sem login."
      tool={<AbsenceCalculator />}
      suap="Não sabe a carga horária ou as faltas? Elas estão no boletim."
      pitch="Entrando com o SUAP, o Supaco responde se dá para faltar hoje, matéria por matéria."
      other={{ to: '/calculadora', label: 'Calculadora de notas' }}>
      <Block title="Quantas faltas posso ter no IFRN?">
        <p>Até <b>25% da carga horária</b> da disciplina: a frequência mínima é 75%. Quem passa do limite reprova por falta, mesmo com média boa.</p>
        <p>A conta é em <b>aulas</b>, não em dias: faltar num dia com duas aulas da matéria custa duas faltas.</p>
      </Block>

      <Block title="Qual é o limite para cada carga horária?">
        <div className="overflow-hidden rounded-2xl bg-surface-container">
          <table className="w-full text-left text-base tabular">
            <thead>
              <tr className="text-sm text-on-surface-variant">
                <th scope="col" className="px-5 py-3 font-medium">Carga horária</th>
                <th scope="col" className="px-5 py-3 font-medium">Máximo de faltas</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {LIMITS.map((w) => (
                <tr key={w} className="border-t border-outline-variant/50">
                  <th scope="row" className="px-5 py-3 font-medium">{w} aulas</th>
                  <td className="px-5 py-3">{Math.floor(w * 0.25)} faltas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="O limite vale por disciplina?">
        <p>Aqui a conta é por disciplina, como no boletim do SUAP. Em alguns cursos a frequência também é cobrada sobre o total do período: confira a Organização Didática do seu curso.</p>
      </Block>
    </ToolPage>
  );
}
