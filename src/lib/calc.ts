// Contas das calculadoras públicas (nota e faltas): as mesmas regras do app, sem depender de login.
import { absenceLevel, currentAverage, FINAL_MIN, outlook, PASS, weightsFor, type AbsenceLevel, type GradeOutlook } from './grades';

export type CalcTone = 'success' | 'warning' | 'error' | 'neutral';

export type GradeAnswer = {
  outlook: GradeOutlook;
  /** Média ponderada só das etapas já informadas. */
  average: number | null;
  weights: number[];
  /** O que vem antes do número: "Você precisa de", "Aprovado com"... */
  lead: string;
  /** O número (ou palavra) que responde à pergunta, para aparecer grande. */
  big: string;
  /** Onde esse número vale: "na N2", "na prova final"... */
  where: string;
  /** A resposta completa, em uma frase (é o que as ferramentas do assistente devolvem). */
  text: string;
  /** O que completa o número na tela, sem repetir o que ele já diz. */
  detail: string;
  tone: CalcTone;
};

/** Texto digitado → nota de 0 a 100, ou null se o campo está vazio (etapa que ainda não aconteceu). */
export function parseGrade(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
}

/** Quanto falta tirar para passar, com `grades` na ordem das etapas (null = etapa sem nota). */
export function gradeAnswer(stages: number, grades: (number | null)[]): GradeAnswer {
  const weights = weightsFor(stages);
  const filled = Array.from({ length: stages }, (_, i) => grades[i] ?? null);
  const s = { stages, grades: filled, status: '', average: null, finalAverage: null, finalExam: null };
  const o = outlook(s);
  const base = { outlook: o, average: currentAverage(s), weights };

  switch (o.kind) {
    case 'empty':
      return { ...base, lead: 'Para passar direto', big: String(PASS), where: 'de média', tone: 'neutral', text: `Para passar direto no IFRN, a média das etapas precisa chegar a ${PASS}.`, detail: 'Coloque a nota de uma etapa para ver quanto falta nas outras.' };
    case 'secured':
      return { ...base, lead: 'Você precisa de', big: '0', where: 'no que falta', tone: 'success', text: `Média ${PASS} garantida: você passa mesmo tirando zero no que falta.`, detail: `Média ${PASS} garantida: você já passou direto.` };
    case 'needs': {
      const one = o.stagesLeft === 1;
      const where = one ? `na N${filled.findIndex((g) => g === null) + 1}` : `em cada uma das ${o.stagesLeft} etapas que faltam`;
      if (o.needed <= 100) {
        return { ...base, lead: 'Você precisa de', big: String(o.needed), where, tone: o.needed > 80 ? 'warning' : 'success', text: `Você precisa de ${o.needed} ${where} para fechar média ${PASS} e passar direto.`, detail: `para fechar média ${PASS} e passar direto, sem prova final.` };
      }
      // Com 100 em tudo que falta, a média ainda fica abaixo de 60
      const best = currentAverage({ ...s, grades: filled.map((g) => g ?? 100) }) ?? 0;
      return best < FINAL_MIN
        ? { ...base, lead: 'Com essas notas', big: 'Não dá', where: 'sem prova final', tone: 'error', text: `Nem com 100 ${where} a média chega a ${FINAL_MIN}: sem direito à prova final.`, detail: `Nem com 100 ${where} a média chega a ${FINAL_MIN}, o mínimo para fazer a prova final.` }
        : { ...base, lead: 'Com essas notas', big: 'Final', where: 'não fecha direto', tone: 'warning', text: `Nem com 100 ${where} a média chega a ${PASS}: vai para a prova final.`, detail: `Nem com 100 ${where} a média chega a ${PASS}. Você vai para a prova final.` };
    }
    case 'passed':
      return { ...base, lead: 'Aprovado com', big: String(Math.round(o.average)), where: 'de média', tone: 'success', text: `Aprovado com média ${Math.round(o.average)}, sem prova final.`, detail: 'Passou direto, sem prova final.' };
    case 'final':
      return { ...base, lead: 'Você precisa de', big: String(o.needed ?? '–'), where: 'na prova final', tone: 'warning', text: `Média ${Math.round(o.average)}: você vai para a prova final e precisa de ${o.needed} nela para ser aprovado.`, detail: `Sua média ficou em ${Math.round(o.average)}, abaixo de ${PASS}. Com essa nota na final, você é aprovado.` };
    case 'failed':
      return { ...base, lead: 'Reprovado com', big: String(Math.round(o.average ?? 0)), where: 'de média', tone: 'error', text: `Média ${Math.round(o.average ?? 0)}, abaixo de ${FINAL_MIN}: reprovado, sem direito à prova final.`, detail: `Com média abaixo de ${FINAL_MIN} não há direito à prova final.` };
  }
}

export type AbsenceAnswer = {
  /** Máximo de faltas (25% da carga horária). */
  limit: number;
  /** Quantas ainda dá para ter; negativo quando o limite já estourou. */
  left: number;
  /** Dias inteiros que ainda dá para faltar, quando se sabe quantas aulas a matéria tem por dia. */
  days: number | null;
  /** Frequência atual, em %. */
  attendance: number;
  level: AbsenceLevel;
  text: string;
  /** O que completa o número na tela, sem repetir o que ele já diz. */
  detail: string;
  tone: CalcTone;
};

/** Limite de faltas de uma disciplina. `workload` é a carga horária em aulas, como aparece no boletim do SUAP. */
export function absenceAnswer(workload: number, absences = 0, perDay = 0): AbsenceAnswer {
  const limit = Math.floor(Math.max(0, workload) * 0.25);
  const left = limit - absences;
  const days = perDay > 0 ? Math.floor(Math.max(0, left) / perDay) : null;
  const level = absenceLevel({ limit, absences });
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const text = !limit ? 'Informe a carga horária da disciplina para ver o limite de faltas.'
    : left < 0 ? `Você passou ${plural(-left, 'falta', 'faltas')} do limite de ${limit}: reprovação por falta nessa disciplina.`
    : left === 0 ? `Você está no limite de ${limit} faltas: a próxima reprova por falta.`
    : `Dá para ter mais ${plural(left, 'falta', 'faltas')}${days === null ? '' : days ? `, ou ${plural(days, 'dia inteiro', 'dias inteiros')} dessa matéria` : ', menos que um dia inteiro dessa matéria'}. O limite é ${limit}.`;
  const detail = !limit ? 'Informe a carga horária da disciplina, em aulas.'
    : left < 0 ? `O limite era ${limit}: é reprovação por falta nessa disciplina.`
    : left === 0 ? `Você já usou as ${limit} do limite: a próxima reprova por falta.`
    : `${days === null ? '' : days ? `São ${plural(days, 'dia inteiro', 'dias inteiros')} dessa matéria. ` : 'É menos que um dia inteiro dessa matéria. '}O limite é ${plural(limit, 'falta', 'faltas')}.`;
  return {
    limit, left, days, level, text, detail,
    attendance: workload > 0 ? Math.max(0, (1 - absences / workload) * 100) : 100,
    tone: !limit ? 'neutral' : level === 'safe' ? 'success' : level === 'caution' ? 'warning' : 'error',
  };
}
