# Supaco

Cliente web do SUAP (IFRN) focado no que o aluno precisa ver rápido: aula de agora, notas, faltas que ainda restam e próximos prazos.

## Telas

- **Hoje** — aula atual/próxima, aulas do dia, disciplinas em risco, próximos prazos e resumo do período.
- **Disciplinas** — notas por etapa, média, quanto falta para passar e faltas livres (marcas de chamada). O detalhe traz simulador de notas, nota necessária na prova final e quantos dias ainda dá para faltar.
- **Horário** — semana em grade (desktop) ou por dia (mobile).
- **Agenda** — avaliações do SUAP + tarefas pendentes do Google Classroom.
- **Servidores** — quem trabalha no IFRN, com página de detalhes de cada professor ou técnico.
- **Você** — curso, IRA, conclusão do curso, mensagens do SUAP, tema e conexão com o Classroom.

Abertas, sem login:

- **Página inicial** (`/` para quem não entrou) — apresenta o app, deixa testar a conta de nota e tem o login no topo.
- **Calculadora de notas** (`/calculadora`) e **calculadora de faltas** (`/faltas`) — as mesmas contas do app com números digitados à mão, mais a explicação das regras do IFRN.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Opcional em `.env.local`:

```
VITE_GOOGLE_CLIENT_ID=<client id OAuth do Google>
PORTAL_TRANSPARENCIA_KEY=<chave da API do Portal da Transparência>
```

O Classroom usa o fluxo de token do Google Identity Services (sem client secret). A origem do app (ex.: `https://supaco.vercel.app` e `http://localhost:5173`) precisa estar em **Authorized JavaScript origins** no Google Cloud Console.

## Como os dados funcionam

- Login direto na API do SUAP (`/api/token/pair`); os tokens ficam no aparelho.
- **Manter conectado** (ligado por padrão no login): a senha fica cifrada no IndexedDB do aparelho (`src/lib/vault.ts`, AES-GCM com chave não exportável). Quando o refresh token do SUAP vence, `src/lib/api.ts` entra de novo sozinho; a sessão só cai se a senha for trocada no SUAP ou a pessoa sair da conta. Desligado, nada da senha é guardado.
- Cada consulta é salva localmente e exibida na hora; a atualização acontece em segundo plano (ao abrir, ao voltar para a aba e no botão "Atualizar").
- Regras do IFRN em `src/lib/grades.ts`: média 60, pesos 2/3 (2 etapas) e 2/2/3/3 (4 etapas), prova final e limite de 25% de faltas.
- **Servidores** (`/servidores`): diretório de docentes, técnicos e estagiários a partir de `rh/servidores` do SUAP (o token de aluno tem acesso), com busca e filtro por campus e categoria. Cada pessoa tem uma página (`/servidores/<matrícula>`) com setor, função, matérias que dá para você, projetos que coordena e os dados públicos do Portal da Transparência: tempo de casa, folha mais recente detalhada, evolução da remuneração em 12 meses e o histórico de viagens a serviço.
- **Dados do Portal da Transparência são arquivos, não chamadas.** O app nunca consulta o Portal: lê os arquivos de `public/dados`, gerados por scripts. `npm run portal` baixa o cadastro (cargo, função, datas de ingresso) e a folha mês a mês (12 meses) de todos os servidores do IFRN, mais o orçamento do órgão; `npm run viagens` baixa o histórico de viagens a serviço. Os dois continuam de onde pararam, aceitam Ctrl+C e têm limite de chamadas por execução (`--lote`), então o download inicial (umas 40 mil chamadas, algumas horas) pode ser feito em várias rodadas. Com tudo em dia, uma execução só confere se saiu folha nova.
- A chave gratuita sai em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email e vai em `PORTAL_TRANSPARENCIA_KEY` (ambiente ou `.env.local`). Ela **não** precisa estar no Vercel: só os scripts a usam.
- **Cuidado com o limite da chave:** o Portal aceita 400 requisições por minuto e, em vez de responder 429, **bloqueia a chave** de quem passa disso (o desbloqueio é por e-mail). Os scripts fazem perto de 85 por minuto e param na primeira recusa.
- Atualização: `.github/workflows/dados.yml` roda toda semana (e sob demanda), baixa o que falta e faz commit dos arquivos; precisa do segredo `PORTAL_TRANSPARENCIA_KEY` no GitHub. Enquanto os arquivos não existirem, os blocos de remuneração, viagens e orçamento não aparecem. Os arquivos guardam as pessoas pelo hash do nome, não pelo nome.
- Horários vêm de `minhas-turmas-virtuais` (código `3V1234`), convertidos em `src/lib/schedule.ts`.
- **Métricas de uso** (`src/lib/metrics.ts`): o Vercel Web Analytics conta visitantes e acessos por tela, sem cookies e só no site publicado. Páginas de detalhe entram como `/servidores/[id]` e `/disciplinas/[id]`, sem a matrícula nem o código. Precisa estar ligado em **Analytics** no painel do projeto no Vercel; desligado, o app só deixa de contar.

## Para ser encontrado (busca, prévias de link e assistentes)

- **Páginas abertas já vêm prontas no HTML.** O plugin `prerender` do `vite.config.ts` monta, no build, a página inicial e as duas calculadoras com os mesmos componentes do app (`src/prerender.tsx`) e grava `dist/index.html`, `dist/calculadora/index.html` e `dist/faltas/index.html`. Quem não roda JavaScript (prévias de link, vários robôs de busca e de IA) lê o conteúdo inteiro; para as pessoas, a página aparece antes de o app carregar. O `main.tsx` espera o código da página e o React assume o lugar sem piscar. Com alguém logado, a inicial pronta fica escondida e o app entra direto.
- **Título, descrição e dados estruturados** de cada página ficam em `src/lib/seo.ts` (com as perguntas frequentes, que aparecem na página e no `FAQPage`). O build troca o bloco `<!--seo-->` do `index.html` pelo de cada página e gera o `sitemap.xml`. Página pública nova: entra em `PAGES` (`seo.ts`), em `VIEWS` (`prerender.tsx`), em `TOOLS` (`App.tsx`) e nos `rewrites` do `vercel.json`.
- `public/robots.txt`, `public/llms.txt` (resumo do site para modelos de linguagem) e `public/og.png` (imagem da prévia de link, 1200×630) são arquivos estáticos.
- As contas das calculadoras estão em `src/lib/calc.ts`, sobre as regras de `src/lib/grades.ts`.
- **WebMCP** (`src/lib/webmcp.ts`): em navegador com a API (`document.modelContext`), o site registra ferramentas que o assistente do navegador chama direto, sem ler a tela. Abertas: `calcular_nota_ifrn`, `calcular_faltas_ifrn` e `abrir_tela`. Com alguém logado: `minhas_materias`, `posso_faltar`, `aulas_do_dia`, `proximos_prazos` e `buscar_servidor`, que só leem e respondem com os dados da própria pessoa (as mesmas matérias que a tela mostra, via `src/lib/agent.ts`). O código só é baixado onde a API existe.

## App instalável (PWA)

- `public/sw.js` guarda o app inteiro no aparelho (a lista de arquivos e a versão são preenchidas no build pelo plugin `sw-precache` do `vite.config.ts`), então ele abre na hora e sem internet em qualquer rota. As calculadoras saem do cache com o HTML delas; as outras rotas, com o da inicial.
- Deploy novo: o service worker baixa a versão em segundo plano e o app mostra "Tem versão nova do Supaco"; ela também assume sozinha na próxima vez que o app for aberto do zero.
- Ícones em `public/icons` (gerados a partir de `public/icon.svg`) e capturas da loja em `public/screenshots`, usadas na tela de instalação do Android/desktop.
