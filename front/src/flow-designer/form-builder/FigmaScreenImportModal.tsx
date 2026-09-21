import { useMemo, useState } from 'react';
import { ArrowLeft, Check, FileUp, Layers, Link2, RefreshCw, Search } from 'lucide-react';
import { Modal } from '../../products/Modal';
import { ConfirmDialog } from '../../products/ConfirmDialog';
import { Field, TextInput, ErrorBanner, SecondaryButton } from '../../products/ui';
import { useAppTheme } from '../../shell/theme';
import {
  cleanFigmaName,
  listFigmaScreens,
  parseFigmaUrl,
  readFigmaOutline,
  type FigmaOutline,
  type FigmaScreenOption,
} from '../../api/figma';
import type { SduiNode } from '../../sdui/model';

interface FigmaScreenImportModalProps {
  onClose: () => void;
  onImport: (screen: SduiNode) => void;
  /** Se já existe algo desenhado, escolher uma tela pede confirmação antes de substituir. */
  hasExistingContent: boolean;
}

type Source = 'figma' | 'file';

/** Só existe pelo modo API: ali não dá para varrer o arquivo inteiro sem estourar a cota de
 * leitura (cada seção aninhada custaria uma chamada a mais), então o usuário escolhe uma página ou
 * seção primeiro, e as telas listadas depois são só as de dentro dela. */
interface GroupChoice {
  nodeId: string;
  name: string;
  where: string;
  depth: number;
  looseScreens?: number;
}

function toGroupChoices(outline: FigmaOutline): GroupChoice[] {
  return outline.pages.flatMap((page) => {
    const pageName = cleanFigmaName(page.name);
    if (page.sections.length > 0) {
      return page.sections.map((s) => ({
        nodeId: s.nodeId,
        name: cleanFigmaName(s.name),
        where: s.path ? `${pageName} › ${s.path}` : pageName,
        depth: s.depth,
      }));
    }
    if (page.looseScreens > 0) {
      return [{ nodeId: page.pageId, name: pageName, where: pageName, depth: 0, looseScreens: page.looseScreens }];
    }
    return [];
  });
}

/**
 * Importa uma tela avulsa do Figma direto no editor — diferente da aba "Figma" de Nova Jornada, que
 * monta um fluxo inteiro: aqui a escolha é de uma única tela, que vira o conteúdo desta User Task.
 *
 * As duas origens terminam na mesma lista final (telas com busca, tela + seção onde ela está), mas
 * chegam lá de jeitos diferentes por causa do custo de cada uma:
 *  - Enviar arquivo: a árvore inteira já está em mãos, então lista TODAS as telas do arquivo de
 *    uma vez, sem passo intermediário.
 *  - Ler do Figma: pela API, varrer o arquivo inteiro custaria uma chamada por seção aninhada (ou
 *    uma leitura funda do tamanho da que já esgotou a cota de uma conta antes) — por isso aqui o
 *    usuário escolhe uma página ou seção primeiro (mesmo custo de sempre, uma chamada), e só as
 *    telas de dentro dela entram na lista.
 */
export function FigmaScreenImportModal({ onClose, onImport, hasExistingContent }: FigmaScreenImportModalProps) {
  const { colors: c } = useAppTheme();
  const [source, setSource] = useState<Source>('figma');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [outline, setOutline] = useState<FigmaOutline | null>(null);
  const [groupFilter, setGroupFilter] = useState('');
  const [readError, setReadError] = useState<string | null>(null);
  const [loadingScreens, setLoadingScreens] = useState(false);
  const [screens, setScreens] = useState<FigmaScreenOption[] | null>(null);
  const [screenFilter, setScreenFilter] = useState('');
  const [pending, setPending] = useState<FigmaScreenOption | null>(null);

  const { fileKey, nodeId } = parseFigmaUrl(url);
  const canRead = !!fileKey && !!token.trim() && !reading;
  const groupChoices = useMemo(() => (outline ? toGroupChoices(outline) : []), [outline]);
  const visibleGroups = useMemo(() => {
    const q = groupFilter.trim().toLowerCase();
    if (!q) return groupChoices;
    return groupChoices.filter((ch) => `${ch.name} ${ch.where}`.toLowerCase().includes(q));
  }, [groupChoices, groupFilter]);
  const visibleScreens = useMemo(() => {
    if (!screens) return [];
    const q = screenFilter.trim().toLowerCase();
    if (!q) return screens;
    return screens.filter((s) => `${s.title} ${s.path}`.toLowerCase().includes(q));
  }, [screens, screenFilter]);

  function resetAll() {
    setOutline(null);
    setScreens(null);
    setReadError(null);
    setGroupFilter('');
    setScreenFilter('');
  }

  function switchSource(next: Source) {
    setSource(next);
    setFile(null);
    resetAll();
  }

  async function fetchScreens(scopeNodeId: string | undefined, sourceFile: File | null) {
    setScreens(null);
    setScreenFilter('');
    setLoadingScreens(true);
    setReadError(null);
    try {
      const found = await listFigmaScreens({
        nodeId: scopeNodeId,
        file: sourceFile,
        fileKey: fileKey ?? '',
        token: token.trim(),
      });
      setScreens(found);
      if (found.length === 0) setReadError('Nenhuma tela encontrada.');
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Não foi possível ler as telas.');
    } finally {
      setLoadingScreens(false);
    }
  }

  async function readFromFigma() {
    if (!fileKey) return;
    setReading(true);
    resetAll();
    try {
      const result = await readFigmaOutline(fileKey, token.trim(), nodeId);
      setOutline(result);
      if (toGroupChoices(result).length === 0) setReadError('Este arquivo não tem nenhum grupo de telas.');
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setReading(false);
    }
  }

  function pickScreen(option: FigmaScreenOption) {
    if (hasExistingContent) {
      setPending(option);
      return;
    }
    onImport(option.screen);
    onClose();
  }

  async function readFromFile(picked: File) {
    setFile(picked);
    setReading(true);
    resetAll();
    try {
      // Sem passo de escolher grupo aqui: a árvore inteira já está em mãos, então a lista já sai
      // completa, com todas as telas do arquivo.
      await fetchScreens(undefined, picked);
    } catch {
      // fetchScreens já registra o erro em readError.
    } finally {
      setReading(false);
    }
  }

  return (
    <>
      <Modal title="Importar tela do Figma" onClose={onClose} width={480} footer={<SecondaryButton onClick={onClose}>Fechar</SecondaryButton>}>
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
            Escolha uma tela do desenho — ela substitui o conteúdo desenhado nesta User Task.
          </div>

          <div className="flex gap-1 border-b" style={{ borderColor: c.border }}>
            {(
              [
                { id: 'figma' as const, label: 'Ler do Figma', icon: <Link2 size={13} /> },
                { id: 'file' as const, label: 'Enviar arquivo', icon: <FileUp size={13} /> },
              ]
            ).map((option) => {
              const active = source === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={reading}
                  onClick={() => switchSource(option.id)}
                  className="px-3 py-[8px] text-[12.5px] font-semibold bg-transparent border-0 border-b-2 -mb-px flex items-center gap-[6px] disabled:cursor-not-allowed"
                  style={{
                    borderBottomColor: active ? c.accent : 'transparent',
                    color: active ? c.accent : c.textSecondary,
                    cursor: reading ? 'not-allowed' : 'pointer',
                    opacity: reading ? 0.6 : 1,
                  }}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>

          {source === 'figma' ? (
            <>
              <Field label="Link do arquivo" helperText="Cole o endereço do arquivo direto da barra do navegador.">
                <TextInput
                  value={url}
                  disabled={reading}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    resetAll();
                  }}
                  placeholder="https://www.figma.com/design/..."
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Token de acesso"
                helperText="Gere em figma.com/settings › Segurança › Tokens de acesso pessoal, com permissão de leitura de conteúdo. Usado só nesta importação e não fica guardado."
              >
                {/* Escondido por CSS, não por type="password" — um campo de senha real faz o
                    navegador confundir isto com um login e insistir em salvar credenciais aqui. */}
                <TextInput
                  value={token}
                  disabled={reading}
                  onChange={(e) => {
                    setToken(e.target.value);
                    resetAll();
                  }}
                  placeholder="figd_..."
                  autoComplete="off"
                  spellCheck={false}
                  style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                />
              </Field>
              {!outline && (
                <div>
                  <button
                    type="button"
                    onClick={() => void readFromFigma()}
                    disabled={!canRead}
                    className="px-3 py-[7px] rounded-lg text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-[6px] disabled:cursor-not-allowed"
                    style={{
                      border: `1px solid ${canRead ? c.accent : c.border}`,
                      color: canRead ? c.accent : c.textMuted,
                      background: 'transparent',
                      opacity: canRead ? 1 : 0.6,
                    }}
                  >
                    <RefreshCw size={13} className={reading ? 'animate-spin' : undefined} />
                    {reading ? 'Lendo o arquivo...' : 'Ler arquivo'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <Field label="Arquivo do desenho" helperText="Gerado no Figma pelo plugin Exportar para o Elastic Journey.">
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className="px-3 py-[8px] rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-[6px]"
                  style={{
                    border: `1px solid ${c.accent}`,
                    background: c.accentSoft,
                    color: c.accent,
                    cursor: reading ? 'not-allowed' : 'pointer',
                    opacity: reading ? 0.6 : 1,
                  }}
                >
                  <FileUp size={14} />
                  {file ? 'Trocar arquivo' : 'Escolher arquivo'}
                  <input
                    type="file"
                    accept=".json,application/json"
                    disabled={reading}
                    className="hidden"
                    onChange={(e) => {
                      const picked = e.target.files?.[0];
                      if (picked) void readFromFile(picked);
                      e.target.value = '';
                    }}
                  />
                </label>
                {file && (
                  <span className="text-[11.5px] flex items-center gap-[6px] min-w-0" style={{ color: c.textMuted }}>
                    <Check size={13} style={{ color: c.success, flexShrink: 0 }} />
                    <span className="truncate">{file.name}</span>
                  </span>
                )}
                {reading && (
                  <span className="text-[11.5px] flex items-center gap-[6px]" style={{ color: c.textMuted }}>
                    <RefreshCw size={13} className="animate-spin" />
                    Lendo o arquivo...
                  </span>
                )}
              </div>
            </Field>
          )}

          {readError && <ErrorBanner>{readError}</ErrorBanner>}

          {/* Passo intermediário só do modo API — escolher onde procurar, porque varrer o arquivo
              inteiro pela API custaria uma chamada por seção aninhada. */}
          {source === 'figma' && outline && groupChoices.length > 0 && !screens && !loadingScreens && (
            <>
              <div className="pt-2 border-t text-[11.5px]" style={{ borderColor: c.border, color: c.textMuted }}>
                {groupChoices.length} grupos de telas em {outline.pages.length} páginas. Escolha onde procurar a tela.
              </div>
              {groupChoices.length > 8 && (
                <div className="relative">
                  <Search size={13} style={{ color: c.textMuted, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <TextInput
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    placeholder="Filtrar por nome"
                    style={{ paddingLeft: 30 }}
                    autoComplete="off"
                  />
                </div>
              )}
              <div className="flex flex-col gap-[6px] max-h-[240px] overflow-y-auto">
                {visibleGroups.map((choice) => (
                  <button
                    key={choice.nodeId}
                    type="button"
                    onClick={() => void fetchScreens(choice.nodeId, null)}
                    className="rounded-lg px-3 py-[9px] text-left cursor-pointer flex items-center justify-between gap-2"
                    style={{ border: `1px solid ${c.border}`, background: c.surface, marginLeft: Math.min(choice.depth, 4) * 14 }}
                  >
                    <span className="flex flex-col gap-[2px] min-w-0">
                      <span className="text-[13px] font-semibold flex items-center gap-[6px]" style={{ color: c.textPrimary }}>
                        <Layers size={13} style={{ color: c.textMuted, flexShrink: 0 }} />
                        <span className="truncate">{choice.name}</span>
                      </span>
                      <span className="text-[11px] truncate" style={{ color: c.textMuted }}>
                        {choice.where}
                        {choice.looseScreens ? ` · ${choice.looseScreens} telas soltas na página` : ''}
                      </span>
                    </span>
                  </button>
                ))}
                {visibleGroups.length === 0 && (
                  <div className="text-[11.5px] py-2" style={{ color: c.textMuted }}>
                    Nenhum grupo com esse nome.
                  </div>
                )}
              </div>
            </>
          )}

          {loadingScreens && (
            <div className="text-[11.5px] flex items-center gap-[6px]" style={{ color: c.textMuted }}>
              <RefreshCw size={13} className="animate-spin" />
              Lendo as telas...
            </div>
          )}

          {screens && screens.length > 0 && (
            <>
              <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: c.border }}>
                <span className="text-[11.5px]" style={{ color: c.textMuted }}>
                  {screens.length} {screens.length === 1 ? 'tela encontrada' : 'telas encontradas'}.
                </span>
                {source === 'figma' && (
                  <button
                    type="button"
                    onClick={() => setScreens(null)}
                    className="text-[11.5px] font-semibold cursor-pointer inline-flex items-center gap-[4px] bg-transparent border-0 p-0"
                    style={{ color: c.accent }}
                  >
                    <ArrowLeft size={12} /> Escolher outro grupo
                  </button>
                )}
              </div>
              {screens.length > 8 && (
                <div className="relative">
                  <Search size={13} style={{ color: c.textMuted, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <TextInput
                    value={screenFilter}
                    onChange={(e) => setScreenFilter(e.target.value)}
                    placeholder="Filtrar por nome ou seção"
                    style={{ paddingLeft: 30 }}
                    autoComplete="off"
                  />
                </div>
              )}
              <div className="flex flex-col gap-[6px] max-h-[280px] overflow-y-auto">
                {visibleScreens.map((option) => (
                  <button
                    key={option.screenId}
                    type="button"
                    onClick={() => pickScreen(option)}
                    className="rounded-lg px-3 py-[9px] text-left cursor-pointer flex flex-col gap-[2px]"
                    style={{ border: `1px solid ${c.border}`, background: c.surface }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: c.textPrimary }}>
                      {option.title}
                    </span>
                    {option.path && (
                      <span className="text-[11px] truncate" style={{ color: c.textMuted }}>
                        {option.path}
                      </span>
                    )}
                  </button>
                ))}
                {visibleScreens.length === 0 && (
                  <div className="text-[11.5px] py-2" style={{ color: c.textMuted }}>
                    Nenhuma tela com esse nome.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {pending && (
        <ConfirmDialog
          title="Substituir a tela atual?"
          message={`Isso troca tudo que já está desenhado nesta User Task pelo conteúdo de "${pending.title}", vindo do Figma. Não dá pra desfazer depois de salvar.`}
          confirmLabel="Substituir"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onImport(pending.screen);
            setPending(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
