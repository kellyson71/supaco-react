// Calculadoras públicas: páginas que funcionam sem login e explicam as regras de nota e de falta do IFRN.
import type { ReactNode } from 'react';
import { useLoggedIn } from '../lib/hooks';
import { PAGES } from '../lib/seo';
import { AbsenceCalculator, GradeCalculator } from '../components/Calculators';
import { FaqList, PublicFooter, PublicHeader, Wrap } from '../components/Public';
import { Button, Icon } from '../components/ui';
import { Link } from '../components/Link';

function ToolPage({ path, eyebrow, title, lede, tool, children, pitch, other }: {
  path: string; eyebrow: string; title: string; lede: string; tool: ReactNode; children: ReactNode;
  /** O que o app faz a mais para quem entra com o SUAP. */
  pitch: { title: string; text: string };
  other: { to: string; title: string; text: string; icon: string };
}) {
  const loggedIn = useLoggedIn();
  return (
    <div className="min-h-dvh bg-surface">
      <PublicHeader current={path} />
      <main>
        <Wrap>
          <div className="max-w-3xl pt-6 lg:pt-10">
            <p className="text-sm font-semibold tracking-wide text-primary">{eyebrow}</p>
            <h1 className="mt-2 text-[36px] leading-[44px] font-semibold tracking-tight lg:text-[52px] lg:leading-[60px]">{title}</h1>
            <p className="mt-4 text-lg text-on-surface-variant">{lede}</p>
          </div>

          <div className="mt-8 rounded-3xl bg-surface-container-low p-4 sm:p-6 lg:p-8">{tool}</div>

          <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-primary-container p-6 text-on-primary-container sm:flex-row sm:items-center sm:gap-8 lg:p-8">
            <div className="flex-1">
              <p className="text-[22px] leading-7 font-semibold tracking-tight">{pitch.title}</p>
              <p className="mt-2">{pitch.text}</p>
            </div>
            <Button to="/" size="lg" icon={loggedIn ? 'arrow_forward' : 'login'} className="shrink-0">{loggedIn ? 'Abrir o Supaco' : 'Entrar com o SUAP'}</Button>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-16">
            <article className="flex max-w-3xl flex-col gap-12">{children}</article>
            <aside className="lg:pt-1">
              <Link to={other.to} className="state block rounded-2xl bg-surface-container p-5">
                <Icon name={other.icon} size={28} fill className="text-primary" />
                <p className="mt-3 text-lg font-medium">{other.title}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{other.text}</p>
                <p className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">Abrir<Icon name="arrow_forward" size={18} /></p>
              </Link>
            </aside>
          </div>
        </Wrap>
      </main>
      <PublicFooter />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[28px] leading-9 font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 text-[17px] leading-7 text-on-surface-variant [&_b]:font-medium [&_b]:text-on-surface">{children}</div>
    </section>
  );
}

const Formula = ({ children }: { children: ReactNode }) =>
  <p className="rounded-xl bg-surface-container px-5 py-4 text-lg font-medium text-on-surface tabular">{children}</p>;

export function GradeTool() {
  const page = PAGES['/calculadora'];
  return (
    <ToolPage path={page.path} eyebrow="Calculadora do IF · sem login" title="Calculadora de notas do IFRN"
      lede="Coloque as notas que você já tem e veja quanto precisa tirar nas etapas que faltam para passar direto. Se não der, a calculadora mostra a nota necessária na prova final."
      tool={<GradeCalculator />}
      pitch={{ title: 'Cansou de digitar nota?', text: 'O Supaco puxa seu boletim do SUAP e faz essa conta sozinho, em todas as matérias, toda vez que sai nota nova.' }}
      other={{ to: '/faltas', icon: 'event_busy', title: 'Calculadora de faltas', text: 'Quantas aulas ainda dá para faltar sem reprovar por frequência.' }}>
      <Block title="Como a média do IFRN é calculada">
        <p>No IFRN as notas vão de <b>0 a 100</b> e a média da disciplina (MD) é ponderada: as últimas etapas pesam mais que as primeiras.</p>
        <p>Disciplina semestral, com 2 etapas:</p>
        <Formula>MD = (2 × N1 + 3 × N2) ÷ 5</Formula>
        <p>Disciplina anual, com 4 etapas:</p>
        <Formula>MD = (2 × N1 + 2 × N2 + 3 × N3 + 3 × N4) ÷ 10</Formula>
        <p>Por isso uma nota baixa no começo ainda dá para recuperar: quem tira 50 na N1 de uma disciplina semestral precisa de 67 na N2, não de 70.</p>
      </Block>

      <Block title="Quanto precisa para passar">
        <ul className="flex flex-col gap-3">
          <li className="flex gap-3"><Icon name="check_circle" fill className="mt-0.5 shrink-0 text-success" /><span><b>Média 60 ou mais:</b> aprovado direto, desde que tenha pelo menos 75% de frequência.</span></li>
          <li className="flex gap-3"><Icon name="warning" fill className="mt-0.5 shrink-0 text-warning" /><span><b>Média de 20 a 59:</b> vai para a prova final.</span></li>
          <li className="flex gap-3"><Icon name="cancel" fill className="mt-0.5 shrink-0 text-error" /><span><b>Média abaixo de 20:</b> reprovado, sem direito à prova final.</span></li>
        </ul>
      </Block>

      <Block title="Como funciona a prova final">
        <p>A nota da avaliação final (NAF) entra na conta de mais de um jeito, e vale o resultado <b>melhor para você</b>:</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>a média simples entre a sua média e a prova final: <b>(MD + NAF) ÷ 2</b>;</li>
          <li>a média ponderada de sempre, trocando a nota de <b>uma das etapas</b> pela NAF.</li>
        </ul>
        <p>Se a média final chegar a 60, você é aprovado. A calculadora testa todas as combinações e mostra a menor nota que resolve.</p>
      </Block>

      <section>
        <h2 className="mb-4 text-[28px] leading-9 font-semibold tracking-tight">Dúvidas comuns</h2>
        <FaqList items={page.faq} />
      </section>
    </ToolPage>
  );
}

const LIMITS = [40, 60, 80, 120, 160];

export function AbsenceTool() {
  const page = PAGES['/faltas'];
  return (
    <ToolPage path={page.path} eyebrow="Calculadora do IF · sem login" title="Quantas faltas posso ter no IFRN?"
      lede="Informe a carga horária da disciplina e as faltas que você já tem. A calculadora mostra o limite de 25%, quantas faltas ainda sobram e quantos dias inteiros isso dá."
      tool={<AbsenceCalculator />}
      pitch={{ title: 'Posso faltar hoje?', text: 'O Supaco lê suas faltas no SUAP e responde na hora: simula faltar o dia inteiro e mostra quanto sobraria em cada matéria.' }}
      other={{ to: '/calculadora', icon: 'target', title: 'Calculadora de notas', text: 'Quanto você precisa tirar para passar, com os pesos das etapas e a prova final.' }}>
      <Block title="A regra dos 25%">
        <p>Para ser aprovado no IFRN não basta a nota: é preciso ter <b>pelo menos 75% de frequência</b>. Ou seja, dá para faltar até <b>25% da carga horária</b> da disciplina. Passou disso, é reprovação por falta, mesmo com média boa.</p>
        <Formula>Limite de faltas = carga horária × 0,25</Formula>
        <p>A conta é feita em <b>aulas</b>, não em dias: num dia com duas aulas seguidas da mesma matéria, faltar custa duas faltas.</p>
      </Block>

      <Block title="Limite de faltas por carga horária">
        <div className="overflow-hidden rounded-2xl bg-surface-container">
          <table className="w-full text-left text-base tabular">
            <thead>
              <tr className="text-sm text-on-surface-variant">
                <th scope="col" className="px-5 py-3 font-medium">Carga horária</th>
                <th scope="col" className="px-5 py-3 font-medium">Máximo de faltas</th>
                <th scope="col" className="px-5 py-3 font-medium">Presença mínima</th>
              </tr>
            </thead>
            <tbody className="text-on-surface">
              {LIMITS.map((w) => (
                <tr key={w} className="border-t border-outline-variant/50">
                  <th scope="row" className="px-5 py-3 font-medium">{w} aulas</th>
                  <td className="px-5 py-3">{Math.floor(w * 0.25)} faltas</td>
                  <td className="px-5 py-3">{w - Math.floor(w * 0.25)} aulas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>A carga horária de cada disciplina aparece no boletim do SUAP, junto com as faltas já lançadas.</p>
      </Block>

      <section>
        <h2 className="mb-4 text-[28px] leading-9 font-semibold tracking-tight">Dúvidas comuns</h2>
        <FaqList items={page.faq} />
      </section>
    </ToolPage>
  );
}
