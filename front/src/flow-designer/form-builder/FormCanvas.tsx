import type { CSSProperties, ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import * as LucideIcons from 'lucide-react';
import { AlertTriangle, Boxes, GripVertical, Loader2, X } from 'lucide-react';
import {
  ButtonDanger,
  ButtonPrimary,
  ButtonSecondary,
  Callout,
  Divider,
  Image,
  Meter,
  Stack,
  Text,
  TextLink,
  Title2,
  skinVars,
} from '@telefonica/mistica';
import { useFlowTheme } from '../theme';
import type { ComponentDefinition } from '../../api/componentDefinitions';
import type { SduiNode } from '../../sdui/model';
import { labelFor } from '../../sdui/componentMeta';
import { compatibilityForDesignChannel, compatibilityMessage, DESIGN_CHANNEL_LABEL, type DesignChannel } from './designChannel';

export interface CanvasDragData {
  source: 'canvas';
  nodeId: string;
}

export type CanvasDropMode = 'inside' | 'before' | 'after';

export interface CanvasDropData {
  source: 'canvas-drop';
  nodeId: string;
  mode: CanvasDropMode;
}

const SPACING: Record<string, number> = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

function registryKey(node: SduiNode): string {
  return `${node.type}@${node.version}`;
}

function suffix(value: unknown): string {
  return typeof value === 'string' ? value.split('.').pop() ?? '' : '';
}

function spacing(value: unknown, fallback = 0): number {
  return SPACING[suffix(value)] ?? fallback;
}

function color(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'color.background.primary' || value === 'color.surface.default') return skinVars.colors.background;
  if (value === 'color.background.secondary' || value === 'color.surface.highlight') return skinVars.colors.backgroundAlternative;
  if (value === 'color.background.elevated' || value === 'color.surface.selected') return skinVars.colors.backgroundContainer;
  if (value === 'color.background.inverse') return skinVars.colors.textPrimary;
  if (value === 'color.surface.disabled') return skinVars.colors.backgroundAlternative;
  if (value === 'color.text.primary') return skinVars.colors.textPrimary;
  if (value === 'color.text.secondary' || value === 'color.text.disabled') return skinVars.colors.textSecondary;
  if (value === 'color.text.inverse') return skinVars.colors.background;
  if (value === 'color.border.default') return skinVars.colors.border;
  if (value === 'color.border.strong' || value === 'color.border.focus') return skinVars.colors.brand;
  if (value === 'color.border.error' || value === 'color.action.danger' || value === 'color.feedback.negative') return skinVars.colors.error;
  if (value === 'color.action.primary') return skinVars.colors.buttonPrimaryBackground;
  if (value === 'color.action.secondary' || value === 'color.feedback.info') return skinVars.colors.brand;
  if (value === 'color.feedback.success') return skinVars.colors.success;
  if (value === 'color.feedback.warning') return skinVars.colors.brand;
  return undefined;
}

function text(node: SduiNode, name: string, fallback = ''): string {
  const value = node.props[name];
  return typeof value === 'string' && value ? value : fallback;
}

const staticFieldStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 8,
  border: `1px solid ${skinVars.colors.border}`,
  padding: '10px 12px',
  background: skinVars.colors.background,
  color: skinVars.colors.textSecondary,
  fontFamily: 'inherit',
  fontSize: 14,
};

function StaticField({ node, multiline = false }: { node: SduiNode; multiline?: boolean }) {
  const label = text(node, 'label', 'Campo sem rótulo');
  const placeholder = text(node, 'placeholder', multiline ? 'Digite uma resposta' : 'Preencha este campo');
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Text size={13.5} weight="medium">{label}{node.props.required === true ? ' *' : ''}</Text>
      {multiline
        ? <textarea disabled rows={Number(node.props.minLines) || 3} placeholder={placeholder} style={{ ...staticFieldStyle, resize: 'none' }} />
        : <input disabled placeholder={placeholder} style={staticFieldStyle} />}
    </label>
  );
}

function EmptyDropHint({ active }: { active: boolean }) {
  const { c } = useFlowTheme();
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-lg"
      style={{
        minHeight: 58,
        border: `1px dashed ${active ? c.accent : c.border}`,
        background: active ? c.accentSoft : 'transparent',
        color: c.textSecondary,
        fontSize: 11,
      }}
    >
      <Boxes size={17} color={active ? c.accent : c.textSecondary} />
      <span>{active ? 'Solte para adicionar aqui' : 'Arraste um componente para cá'}</span>
    </div>
  );
}

function VisualContent({
  node,
  children,
  dragActive,
  isOver,
  designChannel,
}: {
  node: SduiNode;
  children: ReactNode;
  dragActive: boolean;
  isOver: boolean;
  designChannel: DesignChannel;
}) {
  const childCount = node.children?.length ?? 0;
  const mobile = designChannel === 'MOBILE';
  const emptyHint = childCount === 0 ? <EmptyDropHint active={dragActive || isOver} /> : null;

  switch (node.type) {
    case 'ui.screen':
      return (
        <Stack space={mobile ? 16 : 24}>
          {text(node, 'title') && <Title2>{text(node, 'title')}</Title2>}
          <Stack space={mobile ? 16 : 24}>{childCount ? children : emptyHint}</Stack>
        </Stack>
      );
    case 'ui.container':
      return (
        <div style={{ padding: spacing(node.props.paddingToken), background: color(node.props.backgroundToken), borderRadius: spacing(node.props.borderRadiusToken) }}>
          <Stack space={16}>{childCount ? children : emptyHint}</Stack>
        </div>
      );
    case 'ui.stack':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: node.props.direction === 'horizontal' ? 'row' : 'column',
            flexWrap: mobile && node.props.direction === 'horizontal' ? 'wrap' : undefined,
            gap: spacing(node.props.spacingToken, mobile ? 12 : 16),
            alignItems: String(node.props.alignment ?? 'stretch') as CSSProperties['alignItems'],
          }}
        >
          {childCount ? children : emptyHint}
        </div>
      );
    case 'ui.card':
      return (
        <div
          style={{
            padding: spacing(node.props.paddingToken, 16),
            border: `1px solid ${skinVars.colors.border}`,
            borderRadius: 10,
            boxShadow: suffix(node.props.elevationToken) === 'medium'
              ? '0 6px 18px rgba(0,0,0,.14)'
              : suffix(node.props.elevationToken) === 'low'
                ? '0 2px 8px rgba(0,0,0,.10)'
                : 'none',
          }}
        >
          <Stack space={12}>{childCount ? children : emptyHint}</Stack>
        </div>
      );
    case 'ui.text':
      return <Text size={suffix(node.props.variant) === 'caption' ? 12 : suffix(node.props.variant).includes('heading') ? 18 : 15} color={color(node.props.colorToken)} textAlign={node.props.align as 'left' | 'center' | 'right' | undefined}>{text(node, 'text', 'Texto')}</Text>;
    case 'ui.image':
      return text(node, 'source')
        ? <div style={{ maxHeight: mobile ? 220 : 360, overflow: 'hidden' }}><Image src={text(node, 'source')} alt={text(node, 'alt')} width="100%" /></div>
        : <div style={{ ...staticFieldStyle, textAlign: 'center' }}>{text(node, 'alt', 'Prévia da imagem')}</div>;
    case 'ui.icon': {
      const name = text(node, 'name', 'Circle').replace(/(^|-|_)(\w)/g, (_, __, letter: string) => letter.toUpperCase());
      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[name] ?? LucideIcons.Circle;
      return <Icon size={20} color={color(node.props.colorToken)} />;
    }
    case 'ui.divider':
      return <Divider />;
    case 'ui.spacer':
      return <div style={node.props.axis === 'horizontal' ? { width: spacing(node.props.sizeToken, 16) } : { height: spacing(node.props.sizeToken, 16) }} />;
    case 'ui.textInput':
      return <StaticField node={node} />;
    case 'ui.textArea':
      return <StaticField node={node} multiline />;
    case 'ui.select': {
      const first = Array.isArray(node.props.options) ? (node.props.options as { label?: string }[])[0]?.label : undefined;
      return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Text size={13.5} weight="medium">{text(node, 'label', 'Seleção')}{node.props.required === true ? ' *' : ''}</Text><select disabled style={staticFieldStyle}><option>{text(node, 'placeholder', first ?? 'Selecione uma opção')}</option></select></label>;
    }
    case 'ui.checkbox':
      return <label style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: node.props.disabled === true || node.props.readOnly === true ? .55 : 1 }}><input type="checkbox" disabled checked={node.props.indeterminate === true} readOnly /><Text size={13.5}>{text(node, 'label', 'Confirmação')}{node.props.required === true ? ' *' : ''}</Text></label>;
    case 'ui.datePicker':
      return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Text size={13.5} weight="medium">{text(node, 'label', 'Data')}{node.props.required === true ? ' *' : ''}</Text><input disabled type={node.props.mode === 'time' ? 'time' : node.props.mode === 'datetime' ? 'datetime-local' : 'date'} style={staticFieldStyle} /></label>;
    case 'ui.button': {
      const label = text(node, 'label', 'Botão');
      const noop = () => {};
      if (node.props.variant === 'secondary') return <ButtonSecondary disabled onPress={noop}>{label}</ButtonSecondary>;
      if (node.props.variant === 'danger') return <ButtonDanger disabled onPress={noop}>{label}</ButtonDanger>;
      return <ButtonPrimary disabled onPress={noop}>{label}</ButtonPrimary>;
    }
    case 'ui.link':
      return <TextLink disabled onPress={() => {}} underline="always">{text(node, 'label', 'Link')}</TextLink>;
    case 'ui.alert':
      return <Callout variant={node.props.severity === 'positive' || node.props.severity === 'informative' ? 'brand' : 'default'} title={text(node, 'title') || undefined} description={text(node, 'message', 'Mensagem de alerta')} />;
    case 'ui.progress':
      return <Stack space={4}>{text(node, 'label') && <Text size={13}>{text(node, 'label')}</Text>}<Meter type="linear" values={[typeof node.props.value === 'number' ? node.props.value : 0]} /></Stack>;
    case 'ui.loading':
      return <Stack space={4}><Loader2 size={20} /><Text size={13}>{text(node, 'label', 'Carregando...')}</Text></Stack>;
    default:
      return null;
  }
}

function DropIndicator({
  nodeId,
  mode,
  horizontal,
  active,
}: {
  nodeId: string;
  mode: Exclude<CanvasDropMode, 'inside'>;
  horizontal: boolean;
  active: boolean;
}) {
  const { c } = useFlowTheme();
  const droppable = useDroppable({
    id: `canvas-drop:${nodeId}:${mode}`,
    data: { source: 'canvas-drop', nodeId, mode } satisfies CanvasDropData,
    disabled: !active,
  });
  if (!active) return null;
  const before = mode === 'before';
  return (
    <div
      ref={droppable.setNodeRef}
      aria-label={before ? 'Soltar antes deste componente' : 'Soltar depois deste componente'}
      style={{
        position: 'absolute',
        zIndex: 5,
        pointerEvents: 'auto',
        ...(horizontal
          ? {
              top: 0,
              bottom: 0,
              left: before ? -6 : undefined,
              right: before ? undefined : -6,
              width: 12,
            }
          : {
              left: 0,
              right: 0,
              top: before ? -6 : undefined,
              bottom: before ? undefined : -6,
              height: 12,
            }),
      }}
    >
      <span
        style={{
          position: 'absolute',
          borderRadius: 999,
          background: c.accent,
          opacity: droppable.isOver ? 1 : 0,
          boxShadow: droppable.isOver ? `0 0 0 3px ${c.accentSoft}` : 'none',
          transition: 'opacity 120ms ease-out, box-shadow 120ms ease-out',
          ...(horizontal
            ? { top: 4, bottom: 4, left: 5, width: 2 }
            : { left: 4, right: 4, top: 5, height: 2 }),
        }}
      />
    </div>
  );
}

function CanvasNode({
  node,
  isRoot,
  parentHorizontal,
  registry,
  selectedId,
  onSelect,
  onRemove,
  dragActive,
  designChannel,
}: {
  node: SduiNode;
  isRoot?: boolean;
  parentHorizontal?: boolean;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  const definition = registry.get(registryKey(node));
  const isContainer = !!definition?.allowsChildren;
  const compatibility = compatibilityForDesignChannel(definition ?? null, designChannel);
  const compatible = compatibility === 'COMPATIBLE';
  const selected = selectedId === node.id;
  const childParentHorizontal = node.type === 'ui.stack' && node.props.direction === 'horizontal';
  const dragData: CanvasDragData = { source: 'canvas', nodeId: node.id };
  const draggable = useDraggable({ id: node.id, data: dragData, disabled: isRoot });
  const droppable = useDroppable({
    id: `canvas-drop:${node.id}:inside`,
    data: { source: 'canvas-drop', nodeId: node.id, mode: 'inside' } satisfies CanvasDropData,
    disabled: !isContainer,
  });
  const children = (node.children ?? []).map((child) => (
    <CanvasNode
      key={child.id}
      node={child}
      parentHorizontal={childParentHorizontal}
      registry={registry}
      selectedId={selectedId}
      onSelect={onSelect}
      onRemove={onRemove}
      dragActive={dragActive}
      designChannel={designChannel}
    />
  ));

  function setNodeRef(element: HTMLDivElement | null) {
    draggable.setNodeRef(element);
    if (isContainer) droppable.setNodeRef(element);
  }

  return (
    <div
      ref={setNodeRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      title={labelFor(node.type)}
      className="group relative"
      style={{
        minWidth: 0,
        width: isRoot || !parentHorizontal ? '100%' : undefined,
        flex: parentHorizontal ? '1 1 0' : undefined,
        flexBasis: parentHorizontal ? 0 : undefined,
        opacity: draggable.isDragging ? 0.35 : 1,
        padding: isRoot ? 18 : 7,
        borderRadius: isRoot ? 12 : 10,
        outline: `${selected ? 1.5 : dragActive && isContainer ? 1 : 1}px ${dragActive && isContainer && !selected ? 'dashed' : 'solid'} ${selected ? c.accent : droppable.isOver ? c.accent : 'transparent'}`,
        background: selected ? 'rgba(128,0,255,0.055)' : droppable.isOver ? c.hoverBg : 'transparent',
        boxShadow: selected ? `0 0 0 2px ${c.accentSoft}` : 'none',
        cursor: 'pointer',
      }}
    >
      <DropIndicator nodeId={node.id} mode="before" horizontal={!!parentHorizontal} active={dragActive && !isRoot} />
      <DropIndicator nodeId={node.id} mode="after" horizontal={!!parentHorizontal} active={dragActive && !isRoot} />
      {!isRoot && (
        <span
          {...draggable.listeners}
          {...draggable.attributes}
          className={`absolute flex items-center justify-center rounded-md ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          title="Mover componente"
          style={{
            left: -8,
            top: 6,
            width: 22,
            height: 22,
            cursor: 'grab',
            background: c.cardBg,
            color: c.textSecondary,
            border: `1px solid ${c.border}`,
            zIndex: 2,
          }}
        >
          <GripVertical size={13} />
        </span>
      )}
      {!isRoot && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(node.id);
          }}
          title="Remover"
          className={`absolute rounded-md border-0 flex items-center justify-center cursor-pointer ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{
            right: -8,
            top: 6,
            width: 22,
            height: 22,
            background: c.cardBg,
            color: c.textSecondary,
            border: `1px solid ${c.border}`,
            zIndex: 2,
          }}
        >
          <X size={12} />
        </button>
      )}
      {definition && !compatible && (
        <span
          title={compatibilityMessage(compatibility, designChannel) ?? undefined}
          className="absolute flex items-center justify-center"
          style={{ right: isRoot ? 10 : 18, top: isRoot ? 10 : 34, color: c.danger, zIndex: 2 }}
        >
          <AlertTriangle size={13} />
        </span>
      )}
      <VisualContent node={node} dragActive={dragActive} isOver={droppable.isOver} designChannel={designChannel}>
        {children}
      </VisualContent>
    </div>
  );
}

/** Canvas visual do Form Builder. A árvore técnica continua no painel de camadas; aqui o autor
 * edita olhando para uma aproximação da tela final, com alças e contornos apenas como affordances. */
export function FormCanvas({
  root,
  registry,
  selectedId,
  onSelect,
  onRemove,
  dragActive,
  designChannel,
}: {
  root: SduiNode;
  registry: Map<string, ComponentDefinition>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  dragActive: boolean;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  const mobile = designChannel === 'MOBILE';
  const whatsapp = designChannel === 'WHATSAPP';
  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: c.canvasBg }} onClick={() => onSelect(root.id)}>
      <div className="mx-auto w-full" style={{ maxWidth: mobile ? 430 : whatsapp ? 560 : 860 }}>
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <div className="text-[12px] font-semibold" style={{ color: c.textPrimary }}>Design da tela</div>
            <div className="text-[10.5px]" style={{ color: c.textSecondary }}>Clique em um componente da tela para editar suas configurações.</div>
          </div>
          <span className="rounded-full px-2 py-1 text-[9px] font-semibold" style={{ background: c.accentSoft, color: c.accent }}>
            {DESIGN_CHANNEL_LABEL[designChannel]}
          </span>
        </div>
        <div
          style={{
            border: `1px solid ${c.border}`,
            borderRadius: mobile ? 28 : 12,
            background: skinVars.colors.background,
            boxShadow: '0 18px 50px -30px rgba(0,0,0,.45)',
            minHeight: mobile ? 620 : 460,
            overflow: 'hidden',
          }}
        >
          <CanvasNode
            node={root}
            isRoot
            registry={registry}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
            dragActive={dragActive}
            designChannel={designChannel}
          />
        </div>
      </div>
    </div>
  );
}
