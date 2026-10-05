# Supaco

Cliente web do SUAP (IFRN) focado no que o aluno precisa ver rápido: aula de agora, notas, faltas que ainda restam e próximos prazos.

## Telas

- **Hoje** — aula atual/próxima, aulas do dia, disciplinas em risco, próximos prazos e resumo do período.
- **Disciplinas** — notas por etapa, média, quanto falta para passar e faltas livres (marcas de chamada). O detalhe traz simulador de notas, nota necessária na prova final e quantos dias ainda dá para faltar.
- **Horário** — semana em grade (desktop) ou por dia (mobile).
- **Agenda** — avaliações do SUAP + tarefas pendentes do Google Classroom.
- **Servidores** — quem trabalha no IFRN, com página de detalhes de cada professor ou técnico.
- **Você** — curso, IRA, conclusão do curso, mensagens do SUAP, tema e conexão com o Classroom.

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
- **Servidores** (`/servidores`): diretório de docentes, técnicos e estagiários a partir de `rh/servidores` do SUAP (o token de aluno tem acesso), com busca e filtro por campus e categoria. Cada pessoa tem uma página (`/servidores/<matrícula>`) com setor, função, matérias que dá para você, projetos que coordena e os dados públicos do Portal da Transparência: tempo de casa, folha mais recente detalhada, evolução da remuneração em 12 meses (a pedido) e o histórico de viagens a serviço.
- Portal da Transparência: as funções `api/servidor.ts` (cadastro e folha, pelo nome dentro do órgão SIAPE 26435), `api/folhas.ts` (folhas dos últimos 12 meses) e `api/orcamento.ts` (empenhado, liquidado e pago pelo IFRN por ano, na aba Números do Campus) usam a API de dados do Portal. A chave gratuita sai em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email e vai em `PORTAL_TRANSPARENCIA_KEY` (variável de ambiente no Vercel; `.env.local` no dev). Sem a chave, a página do servidor só mostra o que vem do SUAP.
- **Cuidado com o limite da chave:** o Portal aceita 400 requisições por minuto e, em vez de responder 429, **bloqueia a chave** de quem passa disso (o desbloqueio é por e-mail). Por isso as funções fazem poucas chamadas, com pausa entre elas, e nada que exija varrer muitos meses roda com o app no ar.
- Viagens a serviço: o Portal só lista viagens por órgão e mês (umas 14 páginas por mês do IFRN), então o histórico é gerado fora do ar por `npm run viagens` e publicado como arquivos estáticos em `public/dados/viagens` (por pessoa, com o nome trocado por um hash, e por mês para os 12 mais recentes). O script é lento de propósito (perto de 85 chamadas por minuto), continua de onde parou e, nas execuções seguintes, só confere os meses que faltam e os três mais recentes. Rode uma vez por mês e faça commit dos arquivos. Enquanto eles não existirem, os blocos de viagens não aparecem.
- Horários vêm de `minhas-turmas-virtuais` (código `3V1234`), convertidos em `src/lib/schedule.ts`.

## App instalável (PWA)

- `public/sw.js` guarda o app inteiro no aparelho (a lista de arquivos e a versão são preenchidas no build pelo plugin `sw-precache` do `vite.config.ts`), então ele abre na hora e sem internet em qualquer rota.
- Deploy novo: o service worker baixa a versão em segundo plano e o app mostra "Tem versão nova do Supaco"; ela também assume sozinha na próxima vez que o app for aberto do zero.
- Ícones em `public/icons` (gerados a partir de `public/icon.svg`) e capturas da loja em `public/screenshots`, usadas na tela de instalação do Android/desktop.
