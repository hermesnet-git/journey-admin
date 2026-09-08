import { useAppTheme } from '../shell/theme';
import { CHANNEL_TYPE_LABELS, type ChannelType } from '../api/products';

interface Props {
  options: ChannelType[];
  selected: ChannelType[];
  onChange: (types: ChannelType[]) => void;
}

// WhatsApp sempre por último, independente da ordem em que o backend devolve os canais do produto.
const CHANNEL_TYPE_ORDER: Record<ChannelType, number> = { WEB: 0, MOBILE: 1, WHATSAPP: 2 };

// Seletor de tipo de canal — canal é um valor de domínio fixo (WEB/MOBILE/WHATSAPP), não uma
// entidade cadastrável. Reaproveitado pelo modal de Produto (todos os 3 tipos disponíveis) e pelos
// modais de canal de Jornada (só os tipos que o produto da jornada já tem).
export function ChannelTypeChecklist({ options, selected, onChange }: Props) {
  const { colors: c } = useAppTheme();

  function toggle(type: ChannelType) {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  if (options.length === 0) {
    return <div style={{ fontSize: 13, color: c.textMuted }}>Nenhum canal disponível.</div>;
  }

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {[...options].sort((a, b) => CHANNEL_TYPE_ORDER[a] - CHANNEL_TYPE_ORDER[b]).map((type) => {
        const active = selected.includes(type);
        return (
          <label key={type} className="flex items-center gap-2 select-none" style={{ cursor: 'pointer' }}>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => toggle(type)}
              className="relative w-[34px] h-[20px] rounded-full shrink-0 p-0 border-0 transition-colors"
              style={{ background: active ? c.accent : c.border, cursor: 'pointer' }}
            >
              <span
                className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white transition-transform"
                style={{ transform: active ? 'translateX(14px)' : 'translateX(0)' }}
              />
            </button>
            <span style={{ fontSize: 13, color: c.textPrimary }}>{CHANNEL_TYPE_LABELS[type]}</span>
          </label>
        );
      })}
    </div>
  );
}
