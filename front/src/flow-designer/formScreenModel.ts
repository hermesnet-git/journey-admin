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
  MousePointerClick,
  CircleUserRound,
  BadgeIcon,
  Tag as TagIcon,
  Gauge,
  PanelTop,
  GalleryHorizontal,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import type { ChannelType } from '../api/products';
import type { FormField, FormFieldType } from '../api/forms';
import type { SduiNode } from '../execution/api';

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
  // Tags SDUI novas (ui.button/ui.avatar/...) — a própria funcionalidade "Executar" deste admin é
  // quem simula o canal (web e mobile), sempre pelo mesmo SduiFormRenderer.tsx — não existe um
  // renderer nativo/mobile separado fora deste repo pra ficar desatualizado. Por isso entram em
  // todos os canais de paleta cheia, não só WEB.
  'BUTTON',
  'AVATAR',
  'BADGE',
  'TAG',
  'METER',
  'TABS',
  'CAROUSEL',
  'TABLE',
];
const WHATSAPP_PALETTE: FormFieldType[] = ['TEXT', 'INPUT'];

// SECTION sai da paleta só pra WEB: seu único propósito (agrupar filhos num grid de colunas) não
// faz sentido com posição livre (x/y) — ver formScreenModel WEB_POSITION_FALLBACK mais abaixo.
const WEB_PALETTE: FormFieldType[] = FULL_PALETTE.filter((t) => t !== 'SECTION');

export const CHANNEL_PALETTE: Record<ChannelType, FormFieldType[]> = {
  WEB: WEB_PALETTE,
  MOBILE: FULL_PALETTE,
  CONTACT_CENTER: FULL_PALETTE,
  OTHER: FULL_PALETTE,
  WHATSAPP: WHATSAPP_PALETTE,
  URA: [],
};

/** Largura/altura padrão da "prancheta" de telas WEB (tamanho de desktop) — usadas quando a tela
 * ainda não tem uma resolução escolhida salva (ver CANVAS_SIZE_PRESETS/localStorage em
 * FormPreviewDock.tsx). WEB_CANVAS_WIDTH também é o valor usado por ChannelScreenFrame.tsx pros
 * demais canais, que não têm seletor. */
export const WEB_CANVAS_WIDTH = 1280;
export const WEB_CANVAS_HEIGHT = 800;

/** Resoluções de mercado oferecidas no seletor de tamanho da prancheta (WEB). A altura aqui é só o
 * tamanho INICIAL/mínimo da prancheta (mesmo espírito de uma tela de desktop) — a página continua
 * podendo crescer pra baixo conforme mais componentes são adicionados, nunca foi (e não vira agora)
 * uma proporção travada que corta conteúdo. */
export const CANVAS_SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'Desktop grande', width: 1920, height: 1080 },
  { label: 'Desktop', width: 1440, height: 900 },
  { label: 'Laptop', width: 1366, height: 768 },
  { label: 'Laptop pequeno', width: 1280, height: 800 },
  { label: 'Tablet', width: 1024, height: 768 },
];

/** Largura/altura padrão do "celular" (MOBILE) — mesmo valor que ChannelScreenFrame.tsx já usava
 * fixo (só largura; altura agora tem um padrão real de aparelho, ver MOBILE_SIZE_PRESETS). */
export const MOBILE_FRAME_WIDTH = 380;
export const MOBILE_FRAME_HEIGHT = 780;

/** Proporções de mercado oferecidas no seletor do celular (MOBILE) — tamanhos reais de aparelho
 * (largura×altura de viewport), não só largura: sem uma altura fixa pareada, a moldura crescia
 * junto com a quantidade de componentes e parava de parecer um celular (virava uma coluna longa e
 * fina). Com altura fixa + scroll vertical por dentro (mesma técnica da prancheta WEB no Preview),
 * a moldura sempre mantém a proporção de tela de verdade, não importa quantos componentes tenha. */
export const MOBILE_SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'Android compacto', width: 360, height: 640 },
  { label: 'iPhone SE', width: 375, height: 667 },
  { label: 'iPhone padrão', width: 390, height: 844 },
  { label: 'Android grande', width: 412, height: 915 },
  { label: 'iPhone Plus/Max', width: 430, height: 932 },
];

/** Altura de fallback pra cascata (só usada quando o campo também não tem altura fixada) — também
 * reaproveitada por quem precisa estimar até onde a tela desce (FormScreenCanvasWeb.tsx,
 * FormScreenPreview.tsx), já que um campo de altura "auto" não tem altura real conhecida antes de
 * renderizar. 96 (não 72) porque o preview (fieldToSduiNode + SduiFieldPreview) desenha a pergunta
 * completa acima do campo pra INPUT/SELECT/AUTOCOMPLETE (mesma altura que a execução real usa) —
 * 72 bastava quando o preview só mostrava o rótulo nativo da Mística, numa linha só. */
export const FALLBACK_ROW_HEIGHT = 96;

// Cascata de fallback determinística pra campos de tela WEB sem posição salva (telas desenhadas
// antes desta mudança) — MESMA fórmula usada no backend (FormSduiSerializer.java), pra o editor,
// o preview do dock e a execução real nunca divergirem em como posicionam um campo legado. `height`
// null = altura automática pelo conteúdo (não fixada) — nunca ganha fallback, ao contrário de x/y/width.
export function resolveWebPosition(field: FormField, index: number): { x: number; y: number; width: number; height: number | null } {
  return {
    x: field.positionX ?? 40,
    y: field.positionY ?? 40 + index * FALLBACK_ROW_HEIGHT,
    width: field.width ?? 320,
    height: field.height ?? null,
  };
}

// "Organizar" → auto-arranjar: preenche a largura disponível da resolução escolhida da esquerda pra
// direita, quebrando pra próxima linha só quando o próximo campo não couber mais (mesmo princípio
// de flex-wrap) — reempilhar tudo numa única coluna desperdiçava toda a largura da tela pra telas
// mais largas (WEB). Largura/altura de cada campo são preservadas (só x/y mudam); altura da linha =
// a maior altura entre os campos daquela linha, pra próxima linha nunca sobrepor a anterior.
export function autoArrangeWeb(fields: FormField[], canvasWidth: number): FormField[] {
  const MARGIN = 40;
  const GAP = 16;
  let x = MARGIN;
  let y = MARGIN;
  let rowHeight = 0;
  return fields.map((f) => {
    if (f.type === 'SECTION') return f;
    const width = f.width ?? 320;
    const height = f.height ?? FALLBACK_ROW_HEIGHT;
    if (x > MARGIN && x + width > canvasWidth - MARGIN) {
      x = MARGIN;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    const next = { ...f, positionX: x, positionY: y };
    x += width + GAP;
    rowHeight = Math.max(rowHeight, height);
    return next;
  });
}

// Mesma curadoria de categorias discutida antes de construir o catálogo: Layout (só a seção, é
// estrutural — não coleta valor nem é conteúdo), Campos de entrada, Conteúdo. A paleta agrupa por
// isto; grupo sem nenhum tipo disponível pro canal atual (ver CHANNEL_PALETTE) some sozinho.
// Ordem = frequência de uso real (pedido explícito do usuário): Conteúdo/Campos de entrada/Botões
// primeiro, o resto depois.
export const COMPONENT_GROUPS: { label: string; types: FormFieldType[] }[] = [
  { label: 'Conteúdo', types: ['TEXT', 'TITLE', 'IMAGE', 'DIVIDER', 'CARD', 'CALLOUT'] },
  {
    label: 'Campos de entrada',
    types: ['INPUT', 'SINGLE_SELECT', 'MULTI_SELECT', 'FILE_UPLOAD', 'RADIO', 'SWITCH', 'SLIDER', 'RATING', 'STEPPER', 'AUTOCOMPLETE'],
  },
  { label: 'Botões', types: ['BUTTON'] },
  { label: 'Layout', types: ['SECTION'] },
  { label: 'Identificação e status', types: ['AVATAR', 'BADGE', 'TAG', 'METER'] },
  { label: 'Conteúdo avançado', types: ['TABS', 'CAROUSEL', 'TABLE'] },
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
  BUTTON: { label: 'Botão', icon: MousePointerClick },
  AVATAR: { label: 'Avatar', icon: CircleUserRound },
  BADGE: { label: 'Badge', icon: BadgeIcon },
  TAG: { label: 'Tag', icon: TagIcon },
  METER: { label: 'Medidor', icon: Gauge },
  TABS: { label: 'Abas', icon: PanelTop },
  CAROUSEL: { label: 'Carrossel', icon: GalleryHorizontal },
  TABLE: { label: 'Tabela', icon: Table2 },
};

export type PropertyKind = 'text' | 'number' | 'boolean' | 'textarea' | 'option-list' | 'select' | 'image' | 'item-list';

export interface PropertySchema {
  key: string;
  label: string;
  kind: PropertyKind;
  optional?: boolean;
  selectOptions?: string[];
  /** Só para kind 'item-list' — schema de cada item da lista (TABS/CAROUSEL/TABLE). */
  itemSchema?: PropertySchema[];
  /** Seção do painel de Configuração — ausente = 'basic'. */
  group?: 'basic' | 'validation';
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
const REQUIRED: PropertySchema = { key: 'required', label: 'Obrigatório', kind: 'boolean', group: 'validation' };
const OPTIONS: PropertySchema = { key: 'options', label: 'Opções', kind: 'option-list' };

// Schema por tipo de componente — um único painel genérico (FormFieldConfigPanel) itera isto em
// vez de um bloco de JSX por tipo (não escalaria pros ~17 componentes do catálogo).
export const COMPONENT_PROPERTIES: Record<FormFieldType, PropertySchema[]> = {
  SECTION: [
    { key: 'label', label: 'Título da seção', kind: 'text' },
    { key: 'columns', label: 'Colunas', kind: 'select', selectOptions: ['1', '2', '3', '4'] },
  ],
  TEXT: [
    { key: 'label', label: 'Texto', kind: 'textarea' },
    { key: 'size', label: 'Tamanho', kind: 'select', selectOptions: ['pequeno', 'medio', 'grande', 'destaque'], optional: true },
  ],
  INPUT: [
    LABEL_TEXT,
    REQUIRED,
    {
      key: 'inputSubtype',
      label: 'Subtipo',
      kind: 'select',
      selectOptions: ['TEXT', 'NUMBER', 'EMAIL', 'DATE', 'PHONE', 'PASSWORD', 'SEARCH', 'INTEGER', 'TIME', 'PIN', 'IBAN'],
    },
    { key: 'defaultValue', label: 'Valor padrão', kind: 'text', optional: true },
    { key: 'helpText', label: 'Texto de ajuda', kind: 'text', optional: true },
    { key: 'validationPattern', label: 'Expressão regular (regex)', kind: 'text', optional: true, group: 'validation' },
    { key: 'minValue', label: 'Mínimo', kind: 'number', optional: true, group: 'validation' },
    { key: 'maxValue', label: 'Máximo', kind: 'number', optional: true, group: 'validation' },
  ],
  SINGLE_SELECT: [LABEL_TEXT, REQUIRED, OPTIONS],
  MULTI_SELECT: [LABEL_TEXT, REQUIRED, OPTIONS],
  FILE_UPLOAD: [
    LABEL_TEXT,
    REQUIRED,
    { key: 'acceptedExtensions', label: 'Extensões aceitas', kind: 'text', optional: true, group: 'validation' },
    { key: 'maxFileSizeBytes', label: 'Tamanho máximo (bytes)', kind: 'number', optional: true, group: 'validation' },
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
  TITLE: [
    { key: 'label', label: 'Texto', kind: 'text' },
    { key: 'size', label: 'Tamanho', kind: 'select', selectOptions: ['pequeno', 'medio', 'grande', 'destaque'], optional: true },
  ],
  IMAGE: [
    { key: 'url', label: 'URL da imagem', kind: 'image' },
    { key: 'alt', label: 'Texto alternativo', kind: 'text', optional: true },
  ],
  DIVIDER: [],
  CARD: [
    { key: 'label', label: 'Título', kind: 'text' },
    { key: 'description', label: 'Descrição', kind: 'textarea', optional: true },
    { key: 'imageUrl', label: 'Imagem', kind: 'image', optional: true },
    { key: 'variant', label: 'Variante', kind: 'select', selectOptions: ['naked', 'data', 'media'] },
  ],
  CALLOUT: [
    { key: 'label', label: 'Título', kind: 'text' },
    { key: 'description', label: 'Descrição', kind: 'textarea', optional: true },
    { key: 'variant', label: 'Tipo', kind: 'select', selectOptions: ['info', 'aviso', 'erro'] },
  ],
  BUTTON: [
    { key: 'label', label: 'Texto do botão', kind: 'text' },
    { key: 'variant', label: 'Variante', kind: 'select', selectOptions: ['primary', 'secondary', 'danger', 'link'] },
    { key: 'href', label: 'Link (URL)', kind: 'text', optional: true },
    { key: 'newTab', label: 'Abrir em nova aba', kind: 'boolean', optional: true },
  ],
  AVATAR: [
    { key: 'initials', label: 'Iniciais', kind: 'text', optional: true },
    { key: 'imageUrl', label: 'Imagem', kind: 'image', optional: true },
    { key: 'size', label: 'Tamanho (px)', kind: 'number' },
  ],
  BADGE: [
    { key: 'label', label: 'Rótulo', kind: 'text' },
    { key: 'value', label: 'Valor', kind: 'number' },
  ],
  TAG: [
    { key: 'label', label: 'Texto', kind: 'text' },
    {
      key: 'variant',
      label: 'Tipo',
      kind: 'select',
      selectOptions: ['promo', 'info', 'active', 'inactive', 'success', 'warning', 'error'],
    },
  ],
  METER: [
    { key: 'label', label: 'Rótulo', kind: 'text' },
    { key: 'value', label: 'Valor (0-100)', kind: 'number' },
    { key: 'type', label: 'Formato', kind: 'select', selectOptions: ['linear', 'circular'] },
  ],
  TABS: [
    {
      key: 'items',
      label: 'Abas',
      kind: 'item-list',
      itemSchema: [
        { key: 'text', label: 'Aba', kind: 'text' },
        { key: 'content', label: 'Conteúdo', kind: 'textarea', optional: true },
      ],
    },
  ],
  CAROUSEL: [
    {
      key: 'items',
      label: 'Itens',
      kind: 'item-list',
      itemSchema: [
        { key: 'title', label: 'Título', kind: 'text' },
        { key: 'description', label: 'Descrição', kind: 'textarea', optional: true },
        { key: 'imageUrl', label: 'Imagem', kind: 'image', optional: true },
      ],
    },
  ],
  // ponytail: linhas como texto único separado por ";" (não um grid 2D editável célula a célula)
  // — evita construir um editor de planilha pra um caso de uso ainda incerto. Upgrade: se surgir
  // necessidade de edição célula a célula, trocar `cells` por um item-list aninhado por linha.
  TABLE: [
    {
      key: 'heading',
      label: 'Colunas',
      kind: 'item-list',
      itemSchema: [{ key: 'label', label: 'Título da coluna', kind: 'text' }],
    },
    {
      key: 'rows',
      label: 'Linhas',
      kind: 'item-list',
      itemSchema: [{ key: 'cells', label: 'Células (separadas por ";")', kind: 'text' }],
    },
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

// Espelha FormSduiSerializer.serializeField() (backend) campo a campo — o builder usa isto pra
// alimentar o MESMO SduiFieldPreview/FieldRenderer que a execução real usa (SduiFormRenderer.tsx),
// em vez de manter uma renderização de preview própria e separada que costuma divergir da real (foi
// o que causou campos de tela WEB sobrepondo na execução sem sobrepor no editor). SECTION não entra
// aqui — é estrutural, os 3 lugares que chamam isto já tratam a seção à parte via
// groupFieldsBySections antes de mapear os filhos.
export function fieldToSduiNode(field: FormField): SduiNode {
  const config = field.config ?? {};
  switch (field.type) {
    case 'TEXT':
      return withVisibleIf(field, ['ui.text', { text: field.label, ...(field.helpText != null ? { helpText: field.helpText } : {}) }]);
    case 'INPUT':
      return withVisibleIf(field, [
        'ui.input',
        {
          name: field.name,
          type: (field.inputSubtype ?? 'TEXT').toLowerCase(),
          label: field.label,
          required: field.required,
          defaultValue: field.defaultValue,
          ...(field.minValue != null ? { min: field.minValue } : {}),
          ...(field.maxValue != null ? { max: field.maxValue } : {}),
          ...(field.validationPattern != null ? { pattern: field.validationPattern } : {}),
          ...config,
        },
      ]);
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
    case 'RADIO':
    case 'AUTOCOMPLETE': {
      const tag = field.type === 'SINGLE_SELECT' ? 'ui.select' : field.type === 'MULTI_SELECT' ? 'ui.multiselect' : field.type === 'RADIO' ? 'ui.radio' : 'ui.autocomplete';
      return withVisibleIf(field, [
        tag,
        {
          name: field.name,
          label: field.label,
          required: field.required,
          ...(field.dataSource ? { dataSource: { config: field.dataSource.config, credentialRef: field.dataSource.credentialRef } } : { options: field.options ?? [] }),
        },
      ]);
    }
    case 'FILE_UPLOAD':
      return withVisibleIf(field, [
        'ui.upload',
        {
          name: field.name,
          label: field.label,
          required: field.required,
          ...(field.acceptedExtensions != null ? { acceptedExtensions: field.acceptedExtensions } : {}),
          ...(field.maxFileSizeBytes != null ? { maxFileSizeBytes: field.maxFileSizeBytes } : {}),
        },
      ]);
    case 'DIVIDER':
      return withVisibleIf(field, ['ui.divider', { ...config }]);
    case 'SWITCH':
      return withVisibleIf(field, ['ui.switch', { name: field.name, label: field.label, required: field.required }]);
    case 'SLIDER':
    case 'RATING':
    case 'STEPPER': {
      const tag = field.type === 'SLIDER' ? 'ui.slider' : field.type === 'RATING' ? 'ui.rating' : 'ui.stepper';
      return withVisibleIf(field, [tag, { name: field.name, label: field.label, required: field.required, ...config }]);
    }
    case 'TITLE':
    case 'IMAGE':
    case 'CARD':
    case 'CALLOUT':
    case 'BUTTON':
    case 'AVATAR':
    case 'BADGE':
    case 'TAG':
    case 'METER':
    case 'TABS':
    case 'CAROUSEL':
    case 'TABLE': {
      const tag: Record<string, string> = {
        TITLE: 'ui.title',
        IMAGE: 'ui.image',
        CARD: 'ui.card',
        CALLOUT: 'ui.callout',
        BUTTON: 'ui.button',
        AVATAR: 'ui.avatar',
        BADGE: 'ui.badge',
        TAG: 'ui.tag',
        METER: 'ui.meter',
        TABS: 'ui.tabs',
        CAROUSEL: 'ui.carousel',
        TABLE: 'ui.table',
      };
      return withVisibleIf(field, [tag[field.type], { label: field.label, ...config }]);
    }
    case 'SECTION':
      throw new Error('SECTION é estrutural — trate separadamente via groupFieldsBySections, não chame fieldToSduiNode nela.');
  }
}

function withVisibleIf(field: FormField, [tag, props]: [string, Record<string, unknown>]): SduiNode {
  if (field.visibleIf != null) props.visibleIf = field.visibleIf;
  return [tag, props, []];
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

// Mesmo espírito do OPTIONS default de SELECT_TYPES logo abaixo: começar com um item já
// preenchido em vez de uma lista vazia, pra o canvas não nascer em branco pros tipos com item-list.
function defaultConfig(type: FormFieldType): Record<string, unknown> | null {
  switch (type) {
    case 'BUTTON':
      return { variant: 'primary' };
    case 'CARD':
      return { variant: 'naked' };
    case 'TAG':
      return { variant: 'info' };
    case 'METER':
      return { value: 50, type: 'linear' };
    case 'TABS':
      return { items: [{ text: 'Aba 1', content: '' }] };
    case 'CAROUSEL':
      return { items: [{ title: 'Item 1', description: '', imageUrl: '' }] };
    case 'TABLE':
      return { heading: [{ label: 'Coluna 1' }], rows: [{ cells: 'Valor 1' }] };
    default:
      return null;
  }
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
    config: defaultConfig(type),
  };
}
