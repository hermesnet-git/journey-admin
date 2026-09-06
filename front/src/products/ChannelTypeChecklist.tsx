import { useAppTheme } from '../shell/theme';
import { CHANNEL_TYPE_LABELS, type ChannelType } from '../api/products';

interface Props {
  options: ChannelType[];
  selected: ChannelType[];
  onChange: (types: ChannelType[]) => void;
}

// Checklist de tipo de canal — canal é um valor de domínio fixo (WEB/MOBILE/WHATSAPP), não uma
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
    <div className="flex flex-col gap-1 rounded-lg p-2" style={{ border: `1px solid ${c.border}` }}>
      {options.map((type) => (
        <label key={type} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
          <input type="checkbox" checked={selected.includes(type)} onChange={() => toggle(type)} />
          <span style={{ fontSize: 13, color: c.textPrimary }}>{CHANNEL_TYPE_LABELS[type]}</span>
        </label>
      ))}
    </div>
  );
}
