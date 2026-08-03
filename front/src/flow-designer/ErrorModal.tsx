import { Modal } from '../products/Modal';
import { PrimaryButton } from '../products/ui';
import { useAppTheme } from '../shell/theme';

export function ErrorModal({ errors, onClose }: { errors: string[]; onClose: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <Modal title="Não foi possível salvar" onClose={onClose} footer={<PrimaryButton onClick={onClose}>Ok</PrimaryButton>}>
      <ul className="flex flex-col gap-2 m-0 pl-4 list-disc text-[13px]" style={{ color: c.textPrimary }}>
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </Modal>
  );
}
