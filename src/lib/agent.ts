// O que o app já calculou e as ferramentas do assistente do navegador (lib/webmcp.ts) reaproveitam.
import type { Subject } from './suap';

/** Matérias do período atual como a tela mostra: com as notas parciais e o horário corrigido. Vazio fora do app. */
export const live: { subjects?: Subject[] } = {};
