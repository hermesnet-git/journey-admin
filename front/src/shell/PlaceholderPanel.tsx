import { Construction } from 'lucide-react';

export function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#a1a1aa]">
      <Construction size={32} color="#c4c4c8" />
      <div className="text-[14px] font-medium text-[#3f3f46]">{title}</div>
      <div className="text-[12.5px]">Esta área ainda não foi implementada.</div>
    </div>
  );
}
