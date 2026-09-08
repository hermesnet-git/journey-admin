import type { SduiNode } from '../../sdui/model';
import type { DesignChannel } from '../../sdui/designChannel';
import { WebFormPreview } from './WebFormPreview';
import { MobileFormPreview } from './MobileFormPreview';
import { WhatsAppFormPreview } from './WhatsAppFormPreview';
import { FormPreviewDiagnostics } from './FormPreviewDiagnostics';
import { collectPreviewDiagnostics } from './previewDiagnostics';

/** Entrada única do preview estático pertencente ao Flow Designer. */
export function FormDesignPreview({ root, channel }: { root: SduiNode; channel: DesignChannel }) {
  const diagnostics = collectPreviewDiagnostics(root, channel);
  return (
    <div>
      {channel === 'WEB' && <WebFormPreview root={root} />}
      {channel === 'MOBILE' && <MobileFormPreview root={root} />}
      {channel === 'WHATSAPP' && <WhatsAppFormPreview root={root} />}
      <FormPreviewDiagnostics diagnostics={diagnostics} />
    </div>
  );
}
