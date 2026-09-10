import { useEffect, useMemo, useState } from 'react';
import type { SduiNode } from '../../sdui/model';
import { listComponentDefinitions, type ComponentDefinition } from '../../api/componentDefinitions';
import type { DesignChannel } from '../form-builder/designChannel';
import { WebFormPreview } from './WebFormPreview';
import { MobileFormPreview } from './MobileFormPreview';
import { WhatsAppFormPreview } from './WhatsAppFormPreview';
import { FormPreviewDiagnostics } from './FormPreviewDiagnostics';
import { collectPreviewDiagnostics } from './previewDiagnostics';
import { EMPTY_PREVIEW_CONTEXT, projectPreviewTree, type PreviewContext } from './previewProjection';
import { PreviewContextEditor } from './PreviewContextEditor';

/** Entrada única do preview estático pertencente ao Flow Designer. */
export function FormDesignPreview({ root, channel }: { root: SduiNode; channel: DesignChannel }) {
  const [definitions, setDefinitions] = useState<ComponentDefinition[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [context, setContext] = useState<PreviewContext>(EMPTY_PREVIEW_CONTEXT);

  useEffect(() => {
    listComponentDefinitions()
      .then((items) => {
        setDefinitions(items);
        setCatalogError(false);
      })
      .catch(() => {
        setDefinitions([]);
        setCatalogError(true);
      });
  }, []);

  const registry = useMemo(
    () => new Map((definitions ?? []).map((definition) => [`${definition.type}@${definition.version}`, definition])),
    [definitions],
  );
  const projection = definitions ? projectPreviewTree(root, channel, registry, context) : null;
  const diagnostics = projection ? collectPreviewDiagnostics(root, channel, projection) : [];

  if (!definitions) {
    return <div className="py-10 text-center text-[12px]">Carregando preview…</div>;
  }
  if (catalogError) {
    return <div className="py-10 text-center text-[12px]">Não foi possível preparar o preview. Tente novamente em alguns instantes.</div>;
  }

  return (
    <div>
      <PreviewContextEditor value={context} onChange={setContext} />
      {!projection?.root && <div className="py-10 text-center text-[12px]">Nenhum conteúdo compatível com este canal.</div>}
      {projection?.root && channel === 'WEB' && <WebFormPreview root={projection.root} />}
      {projection?.root && channel === 'MOBILE' && <MobileFormPreview root={projection.root} />}
      {projection?.root && channel === 'WHATSAPP' && <WhatsAppFormPreview root={projection.root} />}
      <FormPreviewDiagnostics diagnostics={diagnostics} />
    </div>
  );
}
