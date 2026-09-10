import type { SduiNode } from '../../sdui/model';
import { useFlowTheme } from '../theme';
import { FormPreviewNodeRenderer } from './FormPreviewNodeRenderer';

export function MobileFormPreview({ root }: { root: SduiNode }) {
  const { c } = useFlowTheme();
  return (
    <div className="mx-auto w-[360px] max-w-full rounded-[28px] p-[10px]" style={{ background: '#17171c', boxShadow: '0 12px 32px rgba(0,0,0,.22)' }}>
      <div className="mx-auto mb-2 h-1 w-12 rounded-full" style={{ background: '#555' }} />
      <div className="min-h-[560px] rounded-[20px] p-4 overflow-hidden" style={{ background: c.cardBg }}><FormPreviewNodeRenderer node={root} channel="MOBILE" /></div>
    </div>
  );
}
