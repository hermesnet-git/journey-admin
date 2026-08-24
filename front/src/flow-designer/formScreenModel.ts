import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  Type,
  TextCursorInput,
  CircleDot,
  ListChecks,
  Upload,
  Rows3,
  ToggleLeft,
  SlidersHorizontal,
  Star,
  Plus,
  Search,
  Heading,
  Image as ImageIcon,
  Minus,
  RectangleHorizontal,
  Info,
  type LucideIcon,
} from 'lucide-react';
import type { ChannelType } from '../api/products';
import type { FormField, FormFieldType } from '../api/forms';

// Paleta por canal (US pedido explícito: WhatsApp/URA têm capacidade muito mais limitada que
// web/mobile — não faz sentido oferecer upload/date picker/etc. num canal que não os renderiza).
// URA não tem paleta nenhuma — o dock nem monta o canvas pra esse canal (ver FormPreviewDock.tsx).
const FULL_PALETTE: FormFieldType[] = [
  'SECTION',
  'TEXT',
  'INPUT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'FILE_UPLOAD',
  'RADIO',
  'SWITCH',
  'SLIDER',
  'RATING',
  'STEPPER',
  'AUTOCOMPLETE',
  'TITLE',
  'IMAGE',
  'DIVIDER',
  'CARD',
  'CALLOUT',
];
const WHATSAPP_PALETTE: FormFieldType[] = ['TEXT', 'INPUT'];

export const CHANNEL_PALETTE: Record<ChannelType, FormFieldType[]> = {
  WEB: FULL_PALETTE,
  MOBILE: FULL_PALETTE,
  CONTACT_CENTER: FULL_PALETTE,
  OTHER: FULL_PALETTE,
  WHATSAPP: WHATSAPP_PALETTE,
  URA: [],
};

// Mesma curadoria de categorias discutida antes de construir o catálogo: Layout (só a seção, é
// estrutural — não coleta valor nem é conteúdo), Campos de entrada, Conteúdo. A paleta agrupa por
// isto; grupo sem nenhum tipo disponível pro canal atual (ver CHANNEL_PALETTE) some sozinho.
export const COMPONENT_GROUPS: { label: string; types: FormFieldType[] }[] = [
  { label: 'Layout', types: ['SECTION'] },
  {
    label: 'Campos de entrada',
    types: ['INPUT', 'SINGLE_SELECT', 'MULTI_SELECT', 'FILE_UPLOAD', 'RADIO', 'SWITCH', 'SLIDER', 'RATING', 'STEPPER', 'AUTOCOMPLETE'],
  },
  { label: 'Conteúdo', types: ['TEXT', 'TITLE', 'IMAGE', 'DIVIDER', 'CARD', 'CALLOUT'] },
];

export const COMPONENT_META: Record<FormFieldType, { label: string; icon: LucideIcon }> = {
  SECTION: { label: 'Seção', icon: Rows3 },
  TEXT: { label: 'Texto', icon: Type },
  INPUT: { label: 'Campo de entrada', icon: TextCursorInput },
  SINGLE_SELECT: { label: 'Seleção simples', icon: CircleDot },
  MULTI_SELECT: { label: 'Seleção múltipla', icon: ListChecks },
  FILE_UPLOAD: { label: 'Upload de arquivo', icon: Upload },
  RADIO: { label: 'Botões de opção', icon: CircleDot },
  SWITCH: { label: 'Interruptor', icon: ToggleLeft },
  SLIDER: { label: 'Escala numérica', icon: SlidersHorizontal },
  RATING: { label: 'Avaliação', icon: Star },
  STEPPER: { label: 'Contador', icon: Plus },
  AUTOCOMPLETE: { label: 'Busca com sugestão', icon: Search },
  TITLE: { label: 'Título', icon: Heading },
  IMAGE: { label: 'Imagem', icon: ImageIcon },
  DIVIDER: { label: 'Divisor', icon: Minus },
  CARD: { label: 'Card', icon: RectangleHorizontal },
  CALLOUT: { label: 'Aviso', icon: Info },
};

export type PropertyKind = 'text' | 'number' | 'boolean' | 'textarea' | 'option-list' | 'select' | 'image';

export interface PropertySchema {
  key: string;
  label: string;
  kind: PropertyKind;
  optional?: boolean;
  selectOptions?: string[];
}

// Chaves que vivem como coluna tipada no FormField — qualquer outra chave lê/grava em
// field.config (genérico, estilo ConnectorConfig — ver domain/form/FormField.java).
const CORE_KEYS = new Set([
  'label',
  'required',
  'defaultValue',
  'helpText',
  'options',
  'minValue',
  'maxValue',
  'validationPattern',
  'acceptedExtensions',
  'maxFileSizeBytes',
  'inputSubtype',
  'columns',
]);

export function getPropertyValue(field: FormField, key: string): unknown {
  if (CORE_KEYS.has(key)) return (field as unknown as Record<string, unknown>)[key];
  return field.config?.[key];
}

export function setPropertyValue(field: FormField, key: string, value: unknown): FormField {
  if (CORE_KEYS.has(key)) return { ...field, [key]: value };
  return { ...field, config: { ...field.config, [key]: value } };
}

const LABEL_TEXT: PropertySchema = { key: 'label', label: 'Rótulo', kind: 'text' };
const REQUIRED: PropertySchema = { key: 'required', label: 'Obrigatório', kind: 'boolean' };
const OPTIONS: PropertySchema = { key: 'options', label: 'Opções', kind: 'option-list' };

// Schema por tipo de componente — um único painel genérico (FormFieldConfigPanel) itera isto em
// vez de um bloco de JSX por tipo (não escalaria pros ~17 componentes do catálogo).
export const COMPONENT_PROPERTIES: Record<FormFieldType, PropertySchema[]> = {
  SECTION: [
    { key: 'label', label: 'Título da seção', kind: 'text' },
    { key: 'columns', label: 'Colunas', kind: 'select', selectOptions: ['1', '2', '3', '4'] },
  ],
  TEXT: [{ key: 'label', label: 'Texto', kind: 'textarea' }],
  INPUT: [
    LABEL_TEXT,
    REQUIRED,
    { key: 'inputSubtype', label: 'Subtipo', kind: 'select', selectOptions: ['TEXT', 'NUMBER', 'EMAIL', 'DATE', 'PHONE', 'PASSWORD'] },
    { key: 'defaultValue', label: 'Valor padrão', kind: 'text', optional: true },
    { key: 'helpText', label: 'Texto de ajuda', kind: 'text', optional: true },
    { key: 'validationPattern', label: 'Expressão regular (regex)', kind: 'text', optional: true },
    { key: 'minValue', label: 'Mínimo', kind: 'number', optional: true },
    { key: 'maxValue', label: 'Máximo', kind: 'number', optional: true },
  ],
  SINGLE_SELECT: [LABEL_TEXT, REQUIRED, OPTIONS],
  MULTI_SELECT: [LABEL_TEXT, REQUIRED, OPTIONS],
  FILE_UPLOAD: [
    LABEL_TEXT,
    REQUIRED,
    { key: 'acceptedExtensions', label: 'Extensões aceitas', kind: 'text', optional: true },
    { key: 'maxFileSizeBytes', label: 'Tamanho máximo (bytes)', kind: 'number', optional: true },
  ],
  RADIO: [LABEL_TEXT, REQUIRED, OPTIONS],
  SWITCH: [LABEL_TEXT, REQUIRED],
  SLIDER: [
    LABEL_TEXT,
    REQUIRED,
    { key: 'min', label: 'Mínimo', kind: 'number' },
    { key: 'max', label: 'Máximo', kind: 'number' },
    { key: 'step', label: 'Incremento', kind: 'number' },
  ],
  RATING: [LABEL_TEXT, REQUIRED, { key: 'max', label: 'Máximo de estrelas', kind: 'number' }],
  STEPPER: [
    LABEL_TEXT,
    REQUIRED,
    { key: 'min', label: 'Mínimo', kind: 'number' },
    { key: 'max', label: 'Máximo', kind: 'number' },
    { key: 'step', label: 'Incremento', kind: 'number' },
  ],
  // dataSource (busca remota) fica pra uma próxima rodada — opções estáticas por enquanto, mesmo
  // caminho do SINGLE_SELECT.
  AUTOCOMPLETE: [LABEL_TEXT, REQUIRED, OPTIONS],
  TITLE: [{ key: 'label', label: 'Texto', kind: 'text' }],
  IMAGE: [
    { key: 'url', label: 'URL da imagem', kind: 'image' },
    { key: 'alt', label: 'Texto alternativo', kind: 'text', optional: true },
  ],
  DIVIDER: [],
  CARD: [
    { key: 'label', label: 'Título', kind: 'text' },
    { key: 'description', label: 'Descrição', kind: 'textarea', optional: true },
    { key: 'imageUrl', label: 'Imagem', kind: 'image', optional: true },
  ],
  CALLOUT: [
    { key: 'label', label: 'Título', kind: 'text' },
    { key: 'description', label: 'Descrição', kind: 'textarea', optional: true },
    { key: 'variant', label: 'Tipo', kind: 'select', selectOptions: ['info', 'aviso', 'erro'] },
  ],
};

let counter = 0;
// extraTakenNames: nomes de campo já usados em OUTRAS User Tasks do mesmo fluxo (não só o próprio
// nó) — cada campo que coleta valor vira variável de processo, um namespace único pra jornada
// inteira (REQ-03.09.011, ver FlowValidator.java), não por tela. Sem isto, duas telas geradas do
// zero sempre colidiam no mesmo nome (ex.: "campo_de_entrada" nos dois), só descoberto no erro de
// validação ao salvar em vez de já sair com um nome livre.
export function nextFieldName(existing: FormField[], type: FormFieldType, extraTakenNames?: Iterable<string>): string {
  const base = COMPONENT_META[type].label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const taken = new Set(existing.map((f) => f.name));
  if (extraTakenNames) {
    for (const name of extraTakenNames) taken.add(name);
  }
  let candidate = base;
  while (taken.has(candidate)) {
    counter += 1;
    candidate = `${base}_${counter}`;
  }
  return candidate;
}

const SELECT_TYPES = new Set<FormFieldType>(['SINGLE_SELECT', 'MULTI_SELECT', 'RADIO', 'AUTOCOMPLETE']);

// Uma única lista ordenável cobre o canvas inteiro (fields já é a lista plana que o backend usa
// como fonte de ordem/agrupamento — SECTION é só um marcador dentro dela) — soltar da paleta
// insere na posição solta; arrastar um campo já existente é só arrayMove. Nenhuma tradução
// zona↔índice-global é necessária porque nunca existiu uma lista por zona separada.
export interface FieldBlock {
  section: FormField | null;
  children: FormField[];
}

// Mesmo agrupamento que o backend usa pra gerar a árvore SDUI (FormSduiSerializer): campos entre
// um marcador SECTION e o próximo pertencem a ele; campos antes da primeira seção ficam soltos
// (bloco sem seção, sempre 1 coluna). É só um agrupamento visual — a ordem/pertencimento continua
// sendo a posição no array `fields`, não uma estrutura de dados separada.
export function groupFieldsBySections(fields: FormField[]): FieldBlock[] {
  const blocks: FieldBlock[] = [{ section: null, children: [] }];
  for (const field of fields) {
    if (field.type === 'SECTION') {
      blocks.push({ section: field, children: [] });
      continue;
    }
    blocks[blocks.length - 1].children.push(field);
  }
  return blocks;
}

// Zona raiz (campos antes da 1ª seção) e uma zona por seção — cada uma com seu próprio
// useDroppable no canvas, pra dar pra soltar mesmo numa seção ainda vazia (sem nenhum campo dentro
// pra servir de alvo) e pra destacar visualmente onde a solta é válida durante o arrasto.
export const ROOT_ZONE_ID = 'zone-root';
export function sectionZoneId(sectionName: string): string {
  return `zone-section-${sectionName}`;
}

// Índice de inserção no array plano `fields`, a partir do id solto (`over.id`): um campo existente
// insere bem ali; uma zona vazia insere no fim daquele bloco (logo antes da próxima seção, ou no
// fim do array).
function resolveDropIndex(fields: FormField[], overId: string): number {
  if (overId === ROOT_ZONE_ID) {
    const firstSectionIndex = fields.findIndex((f) => f.type === 'SECTION');
    return firstSectionIndex === -1 ? fields.length : firstSectionIndex;
  }
  if (overId.startsWith('zone-section-')) {
    const sectionName = overId.slice('zone-section-'.length);
    const sectionIndex = fields.findIndex((f) => f.name === sectionName && f.type === 'SECTION');
    if (sectionIndex === -1) return fields.length;
    for (let i = sectionIndex + 1; i < fields.length; i++) {
      if (fields[i].type === 'SECTION') return i;
    }
    return fields.length;
  }
  const fieldIndex = fields.findIndex((f) => f.name === overId);
  return fieldIndex === -1 ? fields.length : fieldIndex;
}

export function applyDragEnd(fields: FormField[], event: DragEndEvent, extraTakenNames?: Iterable<string>): FormField[] {
  const { active, over } = event;
  if (!over) return fields;
  const activeData = active.data.current as { source?: string; fieldType?: FormFieldType } | undefined;
  if (!activeData) return fields;
  const insertIndex = resolveDropIndex(fields, String(over.id));

  if (activeData.source === 'palette' && activeData.fieldType) {
    const newField = makeFormField(activeData.fieldType, fields, extraTakenNames);
    const next = [...fields];
    next.splice(insertIndex, 0, newField);
    return next;
  }

  if (activeData.source === 'canvas') {
    const oldIndex = fields.findIndex((f) => f.name === active.id);
    if (oldIndex === -1) return fields;
    // resolveDropIndex calcula no array original; depois de remover o item de oldIndex, todo
    // índice alvo depois dele desloca uma posição pra trás.
    const newIndex = insertIndex > oldIndex ? insertIndex - 1 : insertIndex;
    if (oldIndex === newIndex) return fields;
    return arrayMove(fields, oldIndex, newIndex);
  }

  return fields;
}

export function makeFormField(type: FormFieldType, existing: FormField[], extraTakenNames?: Iterable<string>): FormField {
  return {
    name: nextFieldName(existing, type, extraTakenNames),
    type,
    inputSubtype: type === 'INPUT' ? 'TEXT' : null,
    label: COMPONENT_META[type].label,
    required: false,
    defaultValue: null,
    helpText: null,
    options: SELECT_TYPES.has(type) ? [{ label: 'Opção 1', value: 'opcao_1' }] : null,
    minValue: null,
    maxValue: null,
    validationPattern: null,
    acceptedExtensions: null,
    maxFileSizeBytes: null,
    columns: type === 'SECTION' ? 1 : null,
    visibleIf: null,
    dataSource: null,
    config: null,
  };
}
