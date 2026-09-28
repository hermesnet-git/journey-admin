import { useEffect, useMemo, useState } from 'react';
import { ThemeContextProvider, getSkinByName } from '@telefonica/mistica';
import type { KnownSkinName } from '@telefonica/mistica';
import type { SduiNode } from '../../sdui/model';
import { listComponentDefinitions, type ComponentDefinition } from '../../api/componentDefinitions';
import type { DesignChannel } from '../form-builder/designChannel';
import { WebFormPreview } from './WebFormPreview';
import { MobileFormPreview } from './MobileFormPreview';
import { WhatsAppFormPreview } from './WhatsAppFormPreview';
import { FormPreviewDiagnostics } from './FormPreviewDiagnostics';
import { collectPreviewDiagnostics } from './previewDiagnostics';
import { EMPTY_PREVIEW_CONTEXT, projectPreviewTree } from './previewProjection';
import { useAppTheme } from '../../shell/theme';
import { FilterDropdown } from '../../products/ui';

const SKIN_OPTIONS: { value: KnownSkinName; label: string }[] = [
  { value: 'Blau', label: 'Blau' },
  { value: 'Movistar', label: 'Movistar' },
  { value: 'Vivo', label: 'Vivo' },
];

// Só existe um design system hoje; a lista já vem pronta para o dia em que houver outro.
const DESIGN_SYSTEM_OPTIONS = [{ value: 'mistica', label: 'Mística (@telefonica/mistica)' }];

/** Entrada única do preview estático pertencente ao Flow Designer. */
export function FormDesignPreview({ root, channel }: { root: SduiNode; channel: DesignChannel }) {
  const { dark, skinName: appSkinName } = useAppTheme();
  // A skin aqui é independente da skin global do app (topo da tela): serve para conferir a tela
  // contra uma marca sem trocar o app inteiro de skin.
  const [skinName, setSkinName] = useState<KnownSkinName>(appSkinName);
  const [definitions, setDefinitions] = useState<ComponentDefinition[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);

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
  const projection = definitions ? projectPreviewTree(root, channel, registry, EMPTY_PREVIEW_CONTEXT) : null;
  const diagnostics = projection ? collectPreviewDiagnostics(root, channel, projection) : [];

  if (!definitions) {
    return <div className="py-10 text-center text-[12px]">Carregando preview…</div>;
  }
  if (catalogError) {
    return <div className="py-10 text-center text-[12px]">Não foi possível preparar o preview. Tente novamente em alguns instantes.</div>;
  }

  return (
    <div>
      <div className="mx-auto mb-4 flex w-full max-w-[760px] items-center gap-2">
        <FilterDropdown label="Skin" options={SKIN_OPTIONS} value={skinName} onChange={(value) => setSkinName(value as KnownSkinName)} />
        <FilterDropdown label="Design system" options={DESIGN_SYSTEM_OPTIONS} value="mistica" onChange={() => {}} />
      </div>
      <ThemeContextProvider
        theme={{ skin: getSkinByName(skinName), colorScheme: dark ? 'dark' : 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}
      >
        {!projection?.root && <div className="py-10 text-center text-[12px]">Nenhum conteúdo compatível com este canal.</div>}
        {projection?.root && channel === 'WEB' && <WebFormPreview root={projection.root} />}
        {projection?.root && channel === 'MOBILE' && <MobileFormPreview root={projection.root} />}
        {projection?.root && channel === 'WHATSAPP' && <WhatsAppFormPreview root={projection.root} />}
      </ThemeContextProvider>
      <FormPreviewDiagnostics diagnostics={diagnostics} />
    </div>
  );
}
