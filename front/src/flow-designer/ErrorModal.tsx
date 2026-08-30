import { CircleAlert } from 'lucide-react';
import { Modal } from '../products/Modal';
import { PrimaryButton } from '../products/ui';
import { useAppTheme } from '../shell/theme';

export function ErrorModal({
  errors,
  onClose,
  title = 'Não foi possível salvar',
}: {
  errors: string[];
  onClose: () => void;
  title?: string;
}) {
  const { colors: c } = useAppTheme();
  return (
    <Modal
      title={title}
      icon={<CircleAlert size={20} style={{ color: c.danger }} />}
      onClose={onClose}
      footer={<PrimaryButton onClick={onClose}>Ok</PrimaryButton>}
    >
      {/* flex-1 min-h-0: o painel preenche o espaço que a modal tiver (acompanha o resize dela) e
          rola por conta própria — em vez de altura fixa, que ou sobrava vazio ou cortava cedo. */}
      <div className="flex-1 min-h-0 rounded-lg border overflow-y-auto" style={{ borderColor: c.border, background: c.bg }}>
        <ul className="flex flex-col gap-2 m-0 p-4 pl-8 list-disc text-[13px]" style={{ color: c.textPrimary }}>
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
