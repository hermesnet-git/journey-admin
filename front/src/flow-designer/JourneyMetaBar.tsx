import { useFlowTheme } from './theme';

const fieldLabelClass = 'text-[12.5px] font-medium';
const fieldFontSize = 13;
const controlBase = 'rounded-md px-3 py-2 text-[13px] outline-none box-border w-full';
const textareaClass = 'rounded-md px-3 py-2 text-[13px] leading-[18px] outline-none box-border w-full resize-none';

export function JourneyMetaBar({
  productName,
  channelName,
  name,
  onNameChange,
  description,
  onDescriptionChange,
}: {
  productName: string;
  channelName: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
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
        <div className={`${controlBase} flex items-center`} style={disabledStyle}>
          {productName || '—'}
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={fieldLabelClass} style={{ color: c.textSecondary }}>
          Canal
        </span>
        <div className={`${controlBase} flex items-center`} style={disabledStyle}>
          {channelName || '—'}
        </div>
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
