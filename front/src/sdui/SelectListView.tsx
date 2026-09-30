import { ButtonDanger, ButtonPrimary, ButtonSecondary, Callout, Stack, Text, skinVars } from '@telefonica/mistica';
import type { SelectListAction, SelectListItem, SelectListLoadError } from './selectList';

/** Lista de seleção na forma entregue (itens já montados pelo servidor): cards com seleção única e,
 * abaixo, as ações sobre o item escolhido — desabilitadas até escolher e habilitadas conforme o
 * item. Usada pela execução (Execuções) e pelo preview do editor. */
export function SelectListView({
  label,
  required,
  items,
  totalItems,
  actions,
  emptyMessage,
  loadError,
  selected,
  onSelect,
  onAction,
  onRetry,
  busy = false,
  disabled = false,
}: {
  label: string;
  required: boolean;
  items: SelectListItem[];
  totalItems: number;
  actions: SelectListAction[];
  emptyMessage?: string;
  loadError?: SelectListLoadError | null;
  selected: string | null;
  onSelect: (value: string) => void;
  onAction: (actionId: string) => void;
  onRetry?: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const selectedItem = items.find((item) => item.value === selected) ?? null;
  const blocked = !!loadError?.required;
  return (
    <Stack space={12}>
      <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
        {label}{required ? ' *' : ''}
      </Text>
      {loadError && (
        <Stack space={8}>
          <Callout title="Não foi possível carregar a lista" description={loadError.message} />
          {loadError.required && onRetry && (
            <div>
              <ButtonSecondary small onPress={onRetry}>Tentar novamente</ButtonSecondary>
            </div>
          )}
        </Stack>
      )}
      {!blocked && items.length === 0 && (
        <Text size={14} color={skinVars.colors.textSecondary}>{emptyMessage || 'Nenhum item para mostrar.'}</Text>
      )}
      <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const checked = item.value === selected;
          return (
            <label
              key={item.value}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8,
                cursor: disabled ? 'default' : 'pointer',
                border: `1px solid ${checked ? skinVars.colors.controlActivated : skinVars.colors.border}`,
                background: checked ? skinVars.colors.backgroundContainer : skinVars.colors.background,
              }}
            >
              <input type="radio" name={`select-list-${label}`} checked={checked} disabled={disabled} onChange={() => onSelect(item.value)} style={{ marginTop: 3 }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <Text size={14} weight="medium" color={skinVars.colors.textPrimary}>{item.title}</Text>
                {item.description && <Text size={12.5} color={skinVars.colors.textSecondary}>{item.description}</Text>}
                {checked && item.hint && <Text size={12.5} color={skinVars.colors.textSecondary}>{item.hint}</Text>}
              </span>
            </label>
          );
        })}
      </div>
      {totalItems > items.length && (
        <Text size={12} color={skinVars.colors.textSecondary}>Mostrando {items.length} de {totalItems}.</Text>
      )}
      {actions.length > 0 && !blocked && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((action) => {
            const enabled = !disabled && !busy && !!selectedItem && selectedItem.enabledActions.includes(action.id);
            const props = { onPress: () => onAction(action.id), disabled: !enabled, showSpinner: busy };
            if (action.variant === 'danger') return <ButtonDanger key={action.id} {...props}>{action.label}</ButtonDanger>;
            if (action.variant === 'secondary') return <ButtonSecondary key={action.id} {...props}>{action.label}</ButtonSecondary>;
            return <ButtonPrimary key={action.id} {...props}>{action.label}</ButtonPrimary>;
          })}
        </div>
      )}
    </Stack>
  );
}
