import type { SduiNode } from '../../sdui/model';
import { useFlowTheme } from '../theme';
import { FormPreviewNodeRenderer } from './FormPreviewNodeRenderer';

export function WebFormPreview({ root }: { root: SduiNode }) {
  const { c } = useFlowTheme();
  return <div className="mx-auto w-full max-w-[760px] rounded-xl p-6" style={{ border: `1px solid ${c.border}`, background: c.cardBg, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}><FormPreviewNodeRenderer node={root} /></div>;
}
