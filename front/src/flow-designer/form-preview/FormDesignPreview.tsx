import { useEffect, useMemo, useState } from 'react';
import type { SduiNode } from '../../sdui/model';
import { listComponentDefinitions, type ComponentDefinition } from '../../api/componentDefinitions';
import type { DesignChannel } from '../form-builder/designChannel';
import { compatibilityForDesignChannel } from '../form-builder/designChannel';
import { WebFormPreview } from './WebFormPreview';
import { MobileFormPreview } from './MobileFormPreview';
import { WhatsAppFormPreview } from './WhatsAppFormPreview';
import { FormPreviewDiagnostics } from './FormPreviewDiagnostics';
import { collectPreviewDiagnostics } from './previewDiagnostics';

/** Entrada única do preview estático pertencente ao Flow Designer. */
export function FormDesignPreview({ root, channel }: { root: SduiNode; channel: DesignChannel }) {
  const [definitions, setDefinitions] = useState<ComponentDefinition[] | null>(null);

  useEffect(() => {
    listComponentDefinitions().then(setDefinitions).catch(() => setDefinitions([]));
  }, []);

  const registry = useMemo(
    () => new Map((definitions ?? []).map((definition) => [`${definition.type}@${definition.version}`, definition])),
    [definitions],
  );
  const compatibleRoot = definitions ? filterCompatibleTree(root, channel, registry) : null;
  const diagnostics = definitions ? collectPreviewDiagnostics(root, channel, registry) : [];

  if (!definitions) {
    return <div className="py-10 text-center text-[12px]">Carregando preview…</div>;
  }

  return (
    <div>
      {!compatibleRoot && <div className="py-10 text-center text-[12px]">Nenhum conteúdo compatível com este canal.</div>}
      {compatibleRoot && channel === 'WEB' && <WebFormPreview root={compatibleRoot} />}
      {compatibleRoot && channel === 'MOBILE' && <MobileFormPreview root={compatibleRoot} />}
      {compatibleRoot && channel === 'WHATSAPP' && <WhatsAppFormPreview root={compatibleRoot} />}
      <FormPreviewDiagnostics diagnostics={diagnostics} />
    </div>
  );
}

/** O preview representa somente o que o canal consegue renderizar. A árvore de autoria não é
 * alterada: componentes incompatíveis continuam visíveis no Design para correção pelo autor. */
function filterCompatibleTree(
  node: SduiNode,
  channel: DesignChannel,
  registry: Map<string, ComponentDefinition>,
): SduiNode | null {
  const definition = registry.get(`${node.type}@${node.version}`) ?? null;
  if (!definition || compatibilityForDesignChannel(definition, channel) !== 'COMPATIBLE') return null;
  if (!node.children) return node;
  return {
    ...node,
    children: node.children
      .map((child) => filterCompatibleTree(child, channel, registry))
      .filter((child): child is SduiNode => child !== null),
  };
}
