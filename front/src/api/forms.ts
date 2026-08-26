import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ConnectorTestInput, ConnectorTestResponse } from './flows';

export type FormFieldType =
  | 'TEXT'
  | 'INPUT'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'FILE_UPLOAD'
  | 'SECTION'
  // Campos de entrada adicionais (config específica em FormField.config, estilo ConnectorConfig).
  | 'RADIO'
  | 'SWITCH'
  | 'SLIDER'
  | 'RATING'
  | 'STEPPER'
  | 'AUTOCOMPLETE'
  // Conteúdo (só exibição, não coleta valor) — mesmo espírito de TEXT.
  | 'TITLE'
  | 'IMAGE'
  | 'DIVIDER'
  | 'CARD'
  | 'CALLOUT'
  // Ampliação do catálogo com componentes Mística cross-platform (web + mobile) — também
  // só-de-apresentação, mesmo espírito de TITLE/IMAGE/CARD/CALLOUT.
  | 'BUTTON'
  | 'AVATAR'
  | 'BADGE'
  | 'TAG'
  | 'METER'
  | 'TABS'
  | 'CAROUSEL'
  | 'TABLE';
export type InputSubtype =
  | 'TEXT'
  | 'NUMBER'
  | 'EMAIL'
  | 'DATE'
  | 'PHONE'
  | 'PASSWORD'
  | 'SEARCH'
  | 'INTEGER'
  | 'TIME'
  | 'PIN'
  | 'IBAN';

// Só-de-apresentação — não coletam valor de usuário, não podem ser referenciados por visibleIf de
// outro campo. Único ponto de verdade no front, espelha FormFieldType.collectsValue() do backend.
const NON_COLLECTING_FIELD_TYPES = new Set<FormFieldType>([
  'SECTION',
  'TEXT',
  'FILE_UPLOAD',
  'TITLE',
  'IMAGE',
  'DIVIDER',
  'CARD',
  'CALLOUT',
  'BUTTON',
  'AVATAR',
  'BADGE',
  'TAG',
  'METER',
  'TABS',
  'CAROUSEL',
  'TABLE',
]);

export function collectsValue(type: FormFieldType): boolean {
  return !NON_COLLECTING_FIELD_TYPES.has(type);
}

export interface FormFieldOption {
  label: string;
  value: string;
}

// Mesma config declarativa do conector REST do flow (method/url/headers/params/body dentro de
// config), sempre REST — reaproveitada tal como está, sem um tipo próprio de "form connector".
export interface FormFieldDataSource {
  config: Record<string, unknown> | null;
  credentialRef: string | null;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  inputSubtype: InputSubtype | null;
  label: string;
  required: boolean;
  defaultValue: string | null;
  helpText: string | null;
  options: FormFieldOption[] | null;
  minValue: number | null;
  maxValue: number | null;
  validationPattern: string | null;
  acceptedExtensions: string[] | null;
  maxFileSizeBytes: number | null;
  /** Só relevante para SECTION — número de colunas do grid da seção. Opcional: ausente em código que ainda não conhece essas 3 propriedades. */
  columns?: number | null;
  /** Sintaxe {{campo}} OP valor, mesmo modelo da condição de Gateway (US-03.11). */
  visibleIf?: string | null;
  /** Só relevante para SINGLE_SELECT/MULTI_SELECT — mutuamente exclusivo com `options` estático. */
  dataSource?: FormFieldDataSource | null;
  /** Config específica dos componentes novos (slider min/max/step, imagem url/alt, callout etc.). */
  config?: Record<string, unknown> | null;
  /** Posição livre (x/y) e tamanho numa tela do canal WEB — null pra qualquer outro canal, que
   * continua com o layout linear/seções de sempre. `height` nulo = altura automática pelo conteúdo. */
  positionX?: number | null;
  positionY?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface Form {
  formId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FormInput {
  name: string;
  description: string;
  fields: FormField[];
}

export function listForms(params: { q?: string } = {}): Promise<Form[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return apiGet<Form[]>(`/forms${qs ? `?${qs}` : ''}`);
}

export function getForm(formId: string): Promise<Form> {
  return apiGet<Form>(`/forms/${formId}`);
}

export function createForm(input: FormInput): Promise<Form> {
  return apiPost<Form>('/forms', input);
}

export function updateForm(formId: string, input: FormInput): Promise<Form> {
  return apiPut<Form>(`/forms/${formId}`, input);
}

export function deleteForm(formId: string): Promise<void> {
  return apiDelete<void>(`/forms/${formId}`);
}

// US-03.10-like test call, desacoplado de journey/node (formulário não pertence a um nó de fluxo)
// — mesmo backend (SSRF guard, timeout, limite de resposta) do teste de conector REST do flow.
export function testDataSourceConnector(input: ConnectorTestInput): Promise<ConnectorTestResponse> {
  return apiPost<ConnectorTestResponse>('/forms/datasource-test', input);
}
