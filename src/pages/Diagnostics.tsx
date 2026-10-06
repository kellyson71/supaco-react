import { useState } from 'react';
import { get } from '../lib/api';
import { usePeriod } from '../lib/data';
import { back } from '../lib/router';
import { Badge, Button, Card, cx, Icon, IconButton, TopTitle } from '../components/ui';

type Result = { path: string; status: 'ok' | 'erro'; ms: number; body: string };

// Dados pessoais que não precisam aparecer no diagnóstico
const SENSITIVE = /cpf|rg|passaporte|nascimento|email|telefone|endereco|nome_mae|nome_pai/i;
const mask = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.slice(0, 3).map(mask);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) ? '•••' : mask(x)]));
  return v;
};

/** Mostra a resposta crua de cada endpoint usado pelo app, para investigar dados faltando. */
export function Diagnostics() {
  const { current } = usePeriod();
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const p = current;
  const paths = [
    // Primeiro o que mostra a hora de cada aula registrada
    `/api/ensino/minhas-aulas/${now.getFullYear()}/${now.getMonth() + 1}/`,
    '/api/rh/eu/',
    '/api/ensino/meus-dados-aluno/',
    '/api/ensino/meus-periodos-letivos/',
    ...(p ? [
      `/api/ensino/meu-boletim/${p.ano}/${p.periodo}/`,
      `/api/ensino/minhas-turmas-virtuais/${p.ano}/${p.periodo}/`,
      `/api/ensino/frequencia-periodo-letivo/${p.ano}/${p.periodo}/`,
      `/api/ensino/meu-calendario-academico/${p.ano}/${p.periodo}/`,
      `/api/ensino/disciplinas/${p.ano}.${p.periodo}/`,
      `/api/ensino/disciplinas/${p.ano}${p.periodo}/`,
    ] : []),
    '/api/ensino/minhas-proximas-avaliacoes/',
    '/api/ensino/requisitos-conclusao/',
  ];

  const run = async () => {
    setRunning(true);
    setResults([]);
    const queue = [...paths];
    for (let path = queue.shift(); path; path = queue.shift()) {
      const t0 = performance.now();
      try {
        const body = await get<unknown>(path);
        // Do primeiro diário: a aula bruta (com o que o SUAP tiver de hora), o diário e as etapas
        const first = path.includes('minhas-turmas-virtuais') ? (body as { results?: { id: string }[] }).results?.[0]?.id : undefined;
        if (first) queue.push(`/api/ensino/diarios/${first}/`, `/api/ensino/diarios/${first}/aulas/`);
        setResults((r) => [...r, { path, status: 'ok', ms: Math.round(performance.now() - t0), body: JSON.stringify(mask(body), null, 2) }]);
      } catch (e) {
        setResults((r) => [...r, { path, status: 'erro', ms: Math.round(performance.now() - t0), body: (e as Error).message }]);
      }
    }
    setRunning(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(results.map((r) => `## ${r.path} (${r.status}, ${r.ms}ms)\n${r.body.slice(0, 2500)}`).join('\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <IconButton icon="arrow_back" label="Voltar" onClick={() => back('/voce')} />
        <span className="text-sm font-medium text-on-surface-variant">Você</span>
      </div>
      <TopTitle title="Diagnóstico" sub="Resposta crua de cada endpoint do SUAP (dados pessoais ocultos)"
        right={<>
          <Button icon="play_arrow" onClick={run} disabled={running}>{running ? 'Testando…' : 'Testar endpoints'}</Button>
          {results.length > 0 && <Button variant="tonal" icon={copied ? 'check' : 'content_copy'} onClick={copy}>{copied ? 'Copiado' : 'Copiar resultado'}</Button>}
        </>} />
      <div className="flex flex-col gap-3">
        {results.map((r) => (
          <Card key={r.path} variant="filled" className="rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Icon name={r.status === 'ok' ? 'check_circle' : 'error'} fill className={r.status === 'ok' ? 'text-success' : 'text-error'} />
              <code className="flex-1 text-sm break-all">{r.path}</code>
              <Badge tone={r.status === 'ok' ? 'success' : 'error'}>{r.status} · {r.ms}ms</Badge>
            </div>
            <pre className={cx('mt-3 max-h-72 overflow-auto rounded-lg bg-surface-container-lowest p-3 text-xs', r.status === 'erro' && 'text-error')}>{r.body}</pre>
          </Card>
        ))}
      </div>
    </>
  );
}
