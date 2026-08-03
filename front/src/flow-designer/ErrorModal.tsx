import { Modal } from '../products/Modal';
import { PrimaryButton } from '../products/ui';

export function ErrorModal({ errors, onClose }: { errors: string[]; onClose: () => void }) {
  return (
    <Modal title="Não foi possível salvar" onClose={onClose} footer={<PrimaryButton onClick={onClose}>Ok</PrimaryButton>}>
      <ul className="flex flex-col gap-2 m-0 pl-4 list-disc text-[13px] text-[#3f3f46]">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </Modal>
  );
}
