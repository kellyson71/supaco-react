# Supaco

Cliente web do SUAP (IFRN) focado no que o aluno precisa ver rápido: aula de agora, notas, faltas que ainda restam e próximos prazos.

## Telas

- **Hoje** — aula atual/próxima, aulas do dia, disciplinas em risco, próximos prazos e resumo do período.
- **Disciplinas** — notas por etapa, média, quanto falta para passar e faltas livres (marcas de chamada). O detalhe traz simulador de notas, nota necessária na prova final e quantos dias ainda dá para faltar.
- **Horário** — semana em grade (desktop) ou por dia (mobile).
- **Agenda** — avaliações do SUAP + tarefas pendentes do Google Classroom.
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
```

O Classroom usa o fluxo de token do Google Identity Services (sem client secret). A origem do app (ex.: `https://supaco.vercel.app` e `http://localhost:5173`) precisa estar em **Authorized JavaScript origins** no Google Cloud Console.

## Como os dados funcionam

- Login direto na API do SUAP (`/api/token/pair`); só os tokens ficam no aparelho.
- Cada consulta é salva localmente e exibida na hora; a atualização acontece em segundo plano (ao abrir, ao voltar para a aba e no botão "Atualizar").
- Regras do IFRN em `src/lib/grades.ts`: média 60, pesos 2/3 (2 etapas) e 2/2/3/3 (4 etapas), prova final e limite de 25% de faltas.
- Horários vêm de `minhas-turmas-virtuais` (código `3V1234`), convertidos em `src/lib/schedule.ts`.
