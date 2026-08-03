import { ChevronDown } from 'lucide-react';
import { useFlowTheme } from './theme';
import type { Product, Channel } from '../api/products';

const fieldLabelClass = 'text-[12.5px] font-medium';
const fieldFontSize = 13;
const controlBase = 'rounded-md px-3 py-2 text-[13px] outline-none box-border w-full';
const textareaClass = 'rounded-md px-3 py-2 text-[13px] leading-[18px] outline-none box-border w-full resize-none';

export function JourneyMetaBar({
  products,
  channels,
  productId,
  channelId,
  onProductChange,
  onChannelChange,
  lockedProductName,
  lockedChannelName,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  products: Product[];
  channels: Channel[];
  productId: string;
  channelId: string;
  onProductChange: (productId: string) => void;
  onChannelChange: (channelId: string) => void;
  lockedProductName?: string;
  lockedChannelName?: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const productChannelLocked = lockedProductName !== undefined;
  const { c } = useFlowTheme();
  // fontSize is explicit (not just the text-[10px] class) so every field — input, select and textarea — renders pixel-identical across browsers.
  const selectStyle = { background: c.cardBg, border: `1px solid ${c.border}`, color: c.textPrimary, fontSize: fieldFontSize };
  // Shared look for read-only/disabled fields across the app: muted background + muted text, no opacity hacks.
  const disabledStyle = {
    background: c.chipBg,
    border: `1px solid ${c.border}`,
    color: c.textSecondary,
    cursor: 'not-allowed' as const,
    fontSize: fieldFontSize,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-[6px]">
        <span className={fieldLabelClass} style={{ color: c.textSecondary }}>
          Produto
        </span>
        {productChannelLocked ? (
          <div className={`${controlBase} flex items-center`} style={disabledStyle}>
            {lockedProductName || '—'}
          </div>
        ) : (
          <div className="relative">
            <select
              value={productId}
              onChange={(e) => onProductChange(e.target.value)}
              className={`${controlBase} appearance-none pr-8 cursor-pointer`}
              style={selectStyle}
            >
              <option value="">Selecione...</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textSecondary }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={fieldLabelClass} style={{ color: c.textSecondary }}>
          Canal
        </span>
        {productChannelLocked ? (
          <div className={`${controlBase} flex items-center`} style={disabledStyle}>
            {lockedChannelName || '—'}
          </div>
        ) : (
          <div className="relative">
            <select
              value={channelId}
              onChange={(e) => onChannelChange(e.target.value)}
              disabled={!productId}
              className={`${controlBase} appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed`}
              style={!productId ? disabledStyle : selectStyle}
            >
              <option value="">Selecione...</option>
              {channels.map((ch) => (
                <option key={ch.channelId} value={ch.channelId}>
                  {ch.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textSecondary }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={fieldLabelClass} style={{ color: c.textSecondary }}>
          Nome da jornada
        </span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nome da jornada"
          className={controlBase}
          style={selectStyle}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={fieldLabelClass} style={{ color: c.textSecondary }}>
          Descrição
        </span>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Descrição da jornada"
          rows={5}
          className={textareaClass}
          style={selectStyle}
        />
      </div>
    </div>
  );
}
