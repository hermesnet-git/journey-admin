import { apiDownload, apiPost } from './client';
import type { FlowConnection, FlowNode } from './flows';
import type { SduiNode } from '../sdui/model';

// Importação Figma: lê um arquivo de design e deriva dele as etapas de uma jornada.
//
// A leitura é determinística — telas viram Tarefas de Usuário, formas de decisão viram Decisões e
// os conectores entre elas viram os caminhos do fluxo. Sem nenhum vínculo com a geração por IA
// (AiFlowGenerator e cia.): as duas capacidades evoluem em tempos diferentes.
//
// São duas leituras, e não uma: o arquivo inteiro só é percorrido até o primeiro nível de cada
// página, pra montar a lista do que dá pra importar; contar telas e decisões exige descer na árvore
// e só acontece depois, no trecho que o usuário escolheu. Um arquivo de verdade tem dezenas de
// páginas, e descer em tudo de uma vez devolve centenas de MB.

/**
 * Um agrupamento de telas — candidato a virar uma jornada. Agrupamentos se aninham, e todos são
 * importáveis: a jornada pode ser o bloco inteiro ou só uma etapa dele.
 */
export interface FigmaSectionRef {
  nodeId: string;
  name: string;
  /** Onde ele fica, para distinguir homônimos em lugares diferentes. */
  path: string;
  depth: number;
}

export interface FigmaPage {
  pageId: string;
  name: string;
  sections: FigmaSectionRef[];
  /** Telas que estão direto na página, fora de qualquer agrupamento. */
  looseScreens: number;
}

/** Resultado da leitura rasa: o que o arquivo tem, sem ainda ter contado nada. */
export interface FigmaOutline {
  fileName: string;
  fileKey: string;
  version: string;
  pages: FigmaPage[];
  /** Vem do endereço colado, quando ele foi copiado com algo selecionado — só pré-seleciona. */
  suggestedNodeId: string | null;
}

/** Resultado da leitura profunda de um trecho: o que ele vira se for importado. */
export interface FigmaScopeAnalysis {
  nodeId: string;
  name: string;
  screens: number;
  /** Telas restantes depois de reunir as que repetem o mesmo título. */
  distinctScreens: number;
  decisions: number;
  /** Decisões sem os dois caminhos definidos no desenho — dependem do usuário pra fechar. */
  incompleteDecisions: number;
  /** Largura das telas desenhadas, em px — diz de que formato veio o desenho. */
  screenWidth: number;
}

/** Formato do desenho em palavras, pra ajudar a escolher os canais que recebem as telas. */
export function viewportLabel(width: number): string {
  if (width <= 480) return 'celular';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

/**
 * Páginas e seções costumam ser nomeadas com símbolos na frente pra se organizarem visualmente no
 * Figma ("↪︎ Release 1", "✅ mensagens"). Eles não significam nada fora do arquivo.
 */
export function cleanFigmaName(name: string): string {
  const cleaned = name.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return cleaned || name.trim();
}

/** Aceita a URL inteira colada da barra do navegador, ou só a chave do arquivo. */
export function parseFigmaUrl(input: string): { fileKey: string | null; nodeId: string | null } {
  const raw = input.trim();
  if (!raw) return { fileKey: null, nodeId: null };
  const fromUrl = raw.match(/(?:file|design|proto)\/([A-Za-z0-9]{10,})/);
  const fileKey = fromUrl ? fromUrl[1] : /^[A-Za-z0-9]{10,}$/.test(raw) ? raw : null;
  const node = raw.match(/node-id=([0-9]+[-:][0-9]+)/);
  return { fileKey, nodeId: node ? node[1].replace('-', ':') : null };
}

// POST em duas leituras: o token vai no corpo, não na URL, pra não acabar em log de acesso nem em
// histórico de proxy.
export async function readFigmaOutline(fileKey: string, token: string, nodeId: string | null): Promise<FigmaOutline> {
  const read = await apiPost<{ fileName: string; version: string; pages: FigmaPage[] }>('/figma/outline', {
    fileKey,
    token,
  });
  return { ...read, fileKey, suggestedNodeId: nodeId };
}

export function analyzeFigmaScope(
  fileKey: string,
  token: string,
  nodeId: string,
  name: string,
): Promise<FigmaScopeAnalysis> {
  return apiPost<FigmaScopeAnalysis>('/figma/scope', { fileKey, token, nodeId, name });
}

/** Um arquivo exportado já traz a árvore inteira, então os trechos voltam com a contagem pronta —
 * não existe o segundo passo que a leitura pelo Figma precisa. */
export async function uploadFigmaFile(file: File): Promise<{ outline: FigmaOutline; scopes: FigmaScopeAnalysis[] }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Este arquivo não é um desenho exportado. Use o plugin no Figma para gerá-lo.');
  }
  const result = await apiPost<{ outline: Omit<FigmaOutline, 'fileKey' | 'suggestedNodeId'>; scopes: FigmaScopeAnalysis[] }>(
    '/figma/upload',
    parsed,
  );
  return {
    outline: { ...result.outline, fileKey: '', suggestedNodeId: null },
    scopes: result.scopes,
  };
}

export function downloadFigmaPlugin(): Promise<void> {
  return apiDownload('/figma/plugin', 'elastic-journey-figma-plugin.zip');
}

export interface FigmaBuiltFlow {
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  /** Etapas que entraram sem ligação: o desenho não disse o que leva até elas. */
  unlinkedSteps: number;
}

export interface FigmaBuildRequest {
  nodeIds: string[];
  name: string;
  mergeRepeated: boolean;
  includeScreens: boolean;
  /** Desenho enviado. Sem ele, a árvore é buscada no Figma com fileKey e token. */
  file: File | null;
  fileKey: string;
  token: string;
}

export async function buildFigmaFlow(request: FigmaBuildRequest): Promise<FigmaBuiltFlow> {
  const { file, ...rest } = request;
  // O arquivo é relido aqui em vez de ficar guardado já convertido: uma árvore grande ocupa muito
  // mais na memória do navegador do que o texto de onde ela veio.
  const body = file ? { ...rest, file: JSON.parse(await file.text()) } : rest;
  return apiPost<FigmaBuiltFlow>('/figma/build', body);
}

/** Uma tela do Figma pronta para entrar no editor — a árvore SDUI já vem montada, porque a escolha
 * é imediata: o usuário clica e ela substitui a tela em edição. */
export interface FigmaScreenOption {
  screenId: string;
  title: string;
  /** Trilha de seções até a tela ("Instalação › Apresentação"), para agrupar a lista na busca. */
  path: string;
  screen: SduiNode;
}

export interface FigmaScreensRequest {
  /** Opcional só com `file` preenchido: sem ele, lista as telas do arquivo inteiro. Pela API é
   * obrigatório — não dá pra descer em cada seção do arquivo sem estourar a cota de leitura. */
  nodeId?: string;
  file: File | null;
  fileKey: string;
  token: string;
}

export async function listFigmaScreens(request: FigmaScreensRequest): Promise<FigmaScreenOption[]> {
  const { file, ...rest } = request;
  const body = file ? { ...rest, file: JSON.parse(await file.text()) } : rest;
  return apiPost<FigmaScreenOption[]>('/figma/screens', body);
}
