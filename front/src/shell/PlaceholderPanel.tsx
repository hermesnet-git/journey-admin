import { Construction } from 'lucide-react';
import { useAppTheme } from './theme';

export function PlaceholderPanel({ title }: { title: string }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: c.bg, color: c.textMuted }}>
      <Construction size={32} color={c.textMuted} />
      <div className="text-[14px] font-medium" style={{ color: c.textSecondary }}>
        {title}
      </div>
      <div className="text-[12.5px]">Esta área ainda não foi implementada.</div>
    </div>
  );
}
