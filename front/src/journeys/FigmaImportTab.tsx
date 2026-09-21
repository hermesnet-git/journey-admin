import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Download, FileUp, Layers, Link2, RefreshCw, Search } from 'lucide-react';
import { Field, TextInput, ErrorBanner } from '../products/ui';
import { ChannelTypeChecklist } from '../products/ChannelTypeChecklist';
import { useAppTheme } from '../shell/theme';
import type { ChannelType } from '../api/products';
import {
  analyzeFigmaScope,
  cleanFigmaName,
  downloadFigmaPlugin,
  parseFigmaUrl,
  readFigmaOutline,
  uploadFigmaFile,
  viewportLabel,
  type FigmaOutline,
  type FigmaScopeAnalysis,
} from '../api/figma';

export interface FigmaImportSelection {
  fileKey: string;
  token: string;
  /** Trechos escolhidos. Vários de uma vez fecham as setas que emendam um no outro. */
  scopes: FigmaScopeAnalysis[];
  /** Desenho enviado, quando a origem foi um arquivo — relido na hora de montar o fluxo. */
  file: File | null;
  targetChannels: ChannelType[];
  mergeRepeated: boolean;
  includeScreens: boolean;
}

interface FigmaImportTabProps {
  disabled: boolean;
  /** Canais já marcados em "Dados da jornada" — o desenho importado só pode valer para um deles. */
  channelOptions: ChannelType[];
  onChange: (selection: FigmaImportSelection | null) => void;
}

/** De onde a árvore do desenho vem. O que acontece depois é igual nos dois casos. */
type Source = 'file' | 'figma';

/** Cada linha escolhível: um agrupamento, ou uma página inteira quando ela não tem agrupamentos. */
interface Choice {
  nodeId: string;
  name: string;
  /** Página e agrupamentos acima dele, para situar quem escolhe. */
  where: string;
  depth: number;
  looseScreens?: number;
}

/** Caminho completo até o agrupamento — é por ele que se sabe quem está dentro de quem. */
function fullPathOf(choice: Choice): string {
  return `${choice.where} › ${choice.name}`;
}

function toChoices(outline: FigmaOutline): Choice[] {
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

export function FigmaImportTab({ disabled, channelOptions, onChange }: FigmaImportTabProps) {
  const { colors: c } = useAppTheme();
  const [source, setSource] = useState<Source>('figma');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [outline, setOutline] = useState<FigmaOutline | null>(null);
  // Só no arquivo enviado: a árvore inteira veio junto, então todos os trechos já vêm contados.
  const [preCounted, setPreCounted] = useState<FigmaScopeAnalysis[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [chosen, setChosen] = useState<FigmaScopeAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [targetChannels, setTargetChannels] = useState<ChannelType[]>([]);
  const [mergeRepeated, setMergeRepeated] = useState(true);
  const [includeScreens, setIncludeScreens] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { fileKey, nodeId } = parseFigmaUrl(url);
  const canRead = !!fileKey && !!token.trim() && !reading && !disabled;
  const choices = useMemo(() => (outline ? toChoices(outline) : []), [outline]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return choices;
    return choices.filter((ch) => `${ch.name} ${ch.where}`.toLowerCase().includes(q));
  }, [choices, filter]);

  // Os canais da jornada são escolhidos na outra aba e podem mudar depois desta já estar aberta —
  // por padrão o desenho vale para todos eles, e o usuário tira os que ainda não atende.
  useEffect(() => {
    setTargetChannels(channelOptions);
  }, [channelOptions]);

  /** O que os trechos escolhidos somam — é isso que vai virar jornada. */
  const summary = useMemo(() => {
    if (chosen.length === 0) return null;
    return {
      screens: chosen.reduce((total, s) => total + s.screens, 0),
      distinctScreens: chosen.reduce((total, s) => total + s.distinctScreens, 0),
      decisions: chosen.reduce((total, s) => total + s.decisions, 0),
      incompleteDecisions: chosen.reduce((total, s) => total + s.incompleteDecisions, 0),
      screenWidth: chosen[0].screenWidth,
    };
  }, [chosen]);

  // Uma única fonte da seleção publicada pro modal: enquanto faltar trecho escolhido ou canal, não
  // há o que importar.
  useEffect(() => {
    onChange(
      chosen.length > 0 && targetChannels.length > 0
        ? { fileKey: fileKey ?? '', token: token.trim(), scopes: chosen, file, targetChannels, mergeRepeated, includeScreens }
        : null,
    );
  }, [onChange, fileKey, token, chosen, file, targetChannels, mergeRepeated, includeScreens]);

  // Escolher um trecho abre canais, opções e resumo de uma vez. Sem isto, num modal baixo o
  // conteúdo novo nasce fora da área visível e parece que nada aconteceu.
  useEffect(() => {
    if (chosen.length === 1) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chosen.length]);

  /** Qualquer mudança na origem invalida tudo que já tinha sido lido. */
  function resetAll() {
    setOutline(null);
    setPreCounted([]);
    setChosen([]);
    setReadError(null);
    setFilter('');
  }

  function applyOutline(next: FigmaOutline, counted: FigmaScopeAnalysis[]) {
    setOutline(next);
    setPreCounted(counted);
    const found = toChoices(next);
    if (found.length === 0) {
      setReadError('Este arquivo não tem nenhum grupo de telas que dê pra importar.');
      return;
    }
    // O endereço copiado com algo selecionado no Figma só adianta a escolha — a lista continua
    // inteira, e o usuário troca à vontade.
    const suggested = found.find((ch) => ch.nodeId === next.suggestedNodeId);
    if (suggested) void choose(suggested, counted);
  }

  async function readFromFigma() {
    if (!fileKey) return;
    setReading(true);
    resetAll();
    try {
      applyOutline(await readFigmaOutline(fileKey, token.trim(), nodeId), []);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    } finally {
      setReading(false);
    }
  }

  async function readFromFile(picked: File) {
    setFile(picked);
    setReading(true);
    resetAll();
    try {
      const result = await uploadFigmaFile(picked);
      applyOutline(result.outline, result.scopes);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Não foi possível ler este arquivo.');
    } finally {
      setReading(false);
    }
  }

  async function choose(choice: Choice, counted = preCounted) {
    if (chosen.some((s) => s.nodeId === choice.nodeId)) {
      setChosen((current) => current.filter((s) => s.nodeId !== choice.nodeId));
      return;
    }
    // Um agrupamento já traz tudo que está dentro dele. Marcar os dois faria cada tela entrar duas
    // vezes, então o de fora e os de dentro se substituem em vez de se somarem.
    const path = fullPathOf(choice);
    const withoutOverlap = (list: FigmaScopeAnalysis[]) =>
      list.filter((s) => {
        const other = choices.find((ch) => ch.nodeId === s.nodeId);
        if (!other) return true;
        const otherPath = fullPathOf(other);
        return !otherPath.startsWith(`${path} › `) && !path.startsWith(`${otherPath} › `);
      });

    const ready = counted.find((s) => s.nodeId === choice.nodeId);
    if (ready) {
      setChosen((current) => [...withoutOverlap(current), ready]);
      return;
    }
    setAnalyzing(true);
    try {
      const analysis = await analyzeFigmaScope(fileKey ?? '', token.trim(), choice.nodeId, choice.name);
      setChosen((current) => [...withoutOverlap(current), analysis]);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'Não foi possível ler este grupo de telas.');
    } finally {
      setAnalyzing(false);
    }
  }

  function switchSource(next: Source) {
    setSource(next);
    setFile(null);
    resetAll();
  }

  const steps = summary ? (mergeRepeated ? summary.distinctScreens : summary.screens) : 0;

  return (
    <div className="mt-3 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
      <div className="text-[11.5px] leading-[1.4]" style={{ color: c.textSecondary }}>
        As telas e as decisões desenhadas no arquivo viram as etapas do fluxo, em uma versão Rascunho pronta pra você
        ajustar no editor.
      </div>

      {/* Mesmo padrão visual das abas de "Nova jornada" (sublinhado, sem fundo) — aqui é a mesma
          escolha "de onde vem a origem", só que um nível abaixo. */}
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
              disabled={disabled || reading}
              onClick={() => switchSource(option.id)}
              className="px-3 py-[8px] text-[12.5px] font-semibold bg-transparent border-0 border-b-2 -mb-px flex items-center gap-[6px] disabled:cursor-not-allowed"
              style={{
                borderBottomColor: active ? c.accent : 'transparent',
                color: active ? c.accent : c.textSecondary,
                cursor: disabled || reading ? 'not-allowed' : 'pointer',
                opacity: disabled || reading ? 0.6 : 1,
              }}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>

      {source === 'file' ? (
        <>
          {/* O seletor do navegador fica escondido e é acionado pelo botão: sozinho ele não parece
              clicável e some no meio do formulário. */}
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (chosen) void readFromFile(chosen);
              // Sem isto, escolher o mesmo arquivo de novo depois de um erro não dispara nada.
              e.target.value = '';
            }}
          />
          <Field label="Arquivo do desenho" helperText="Gerado no Figma pelo plugin Exportar para o Elastic Journey.">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={disabled || reading}
                onClick={() => fileRef.current?.click()}
                className="px-3 py-[8px] rounded-lg text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-[6px] disabled:cursor-not-allowed"
                style={{
                  border: `1px solid ${c.accent}`,
                  background: c.accentSoft,
                  color: c.accent,
                  opacity: disabled || reading ? 0.6 : 1,
                }}
              >
                <FileUp size={14} />
                {file ? 'Trocar arquivo' : 'Escolher arquivo'}
              </button>
              {file && (
                <span className="text-[11.5px] flex items-center gap-[6px] min-w-0" style={{ color: c.textMuted }}>
                  <Check size={13} style={{ color: c.success, flexShrink: 0 }} />
                  <span className="truncate">{file.name}</span>
                </span>
              )}
            </div>
          </Field>
          <div
            className="rounded-lg px-3 py-[10px] flex items-start justify-between gap-3"
            style={{ background: c.chipBg, border: `1px solid ${c.border}` }}
          >
            <div className="text-[11.5px] leading-[1.45]" style={{ color: c.textSecondary }}>
              <span style={{ color: c.textPrimary, fontWeight: 600 }}>Ainda não tem o plugin?</span> Baixe, instale no
              aplicativo do Figma e exporte o desenho direto de lá. O passo a passo vem junto no pacote.
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void downloadFigmaPlugin()}
              className="shrink-0 px-[10px] py-[6px] rounded-lg text-[12px] font-semibold cursor-pointer inline-flex items-center gap-[6px] disabled:cursor-not-allowed"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.accent }}
            >
              <Download size={13} />
              Baixar
            </button>
          </div>
        </>
      ) : (
        <>
          <Field label="Link do arquivo" helperText="Cole o endereço do arquivo direto da barra do navegador.">
            <TextInput
              value={url}
              disabled={disabled || reading}
              onChange={(e) => {
                setUrl(e.target.value);
                resetAll();
              }}
              placeholder="https://www.figma.com/design/..."
              autoComplete="off"
            />
          </Field>
          {url.trim() && !fileKey && (
            <div className="text-[11.5px] -mt-1" style={{ color: c.warning }}>
              Não reconheci um arquivo do Figma nesse endereço.
            </div>
          )}
          {fileKey && (
            <div className="text-[11.5px] -mt-1 flex items-center gap-[6px]" style={{ color: c.textMuted }}>
              <Check size={13} style={{ color: c.success }} />
              Link reconhecido.
            </div>
          )}

          <Field
            label="Token de acesso"
            helperText="Gere em figma.com/settings › Segurança › Tokens de acesso pessoal, com permissão de leitura de conteúdo. Usado só nesta importação e não fica guardado."
          >
            {/* Escondido por CSS, e não por type="password": um campo de senha de verdade faz o
                navegador enxergar um login aqui — ele oferece as credenciais salvas da aplicação
                neste campo e no primeiro campo de texto acima, e depois insiste em salvar o link e
                o token como se fossem usuário e senha. */}
            <TextInput
              value={token}
              disabled={disabled || reading}
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
              {reading ? 'Lendo o arquivo...' : outline ? 'Ler de novo' : 'Ler arquivo'}
            </button>
          </div>
        </>
      )}

      {reading && source === 'file' && (
        <div className="text-[11.5px] flex items-center gap-[6px]" style={{ color: c.textMuted }}>
          <RefreshCw size={13} className="animate-spin" />
          Lendo o arquivo...
        </div>
      )}

      {readError && <ErrorBanner>{readError}</ErrorBanner>}

      {outline && choices.length > 0 && (
        <>
          <div className="pt-2 border-t" style={{ borderColor: c.border }}>
            <div className="text-[12px] font-semibold" style={{ color: c.textPrimary }}>
              {outline.fileName}
            </div>
            <div className="text-[11.5px] mt-[2px]" style={{ color: c.textMuted }}>
              {choices.length} grupos de telas em {outline.pages.length} páginas. Marque um ou mais — escolher os
              grupos de fases seguidas mantém os caminhos que levam de uma à outra.
            </div>
          </div>

          {choices.length > 8 && (
            <div className="relative">
              <Search
                size={13}
                style={{ color: c.textMuted, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
              <TextInput
                value={filter}
                disabled={disabled}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar por nome"
                style={{ paddingLeft: 30 }}
                autoComplete="off"
              />
            </div>
          )}

          <div className="flex flex-col gap-[6px] max-h-[200px] overflow-y-auto">
            {visible.map((choice) => {
              const selected = chosen.some((s) => s.nodeId === choice.nodeId);
              const counted = preCounted.find((s) => s.nodeId === choice.nodeId);
              return (
                <button
                  key={choice.nodeId}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled || analyzing}
                  onClick={() => void choose(choice)}
                  className="rounded-lg px-3 py-[9px] text-left cursor-pointer flex items-center justify-between gap-2 disabled:cursor-not-allowed"
                  style={{
                    border: `1px solid ${selected ? c.accent : c.border}`,
                    background: selected ? c.accentSoft : c.surface,
                    // Recuo por nível: mostra de relance que um agrupamento está dentro do outro,
                    // e que dá para importar tanto o bloco inteiro quanto uma etapa dele.
                    marginLeft: Math.min(choice.depth, 4) * 14,
                  }}
                >
                  <span className="flex flex-col gap-[2px] min-w-0">
                    <span
                      className="text-[13px] font-semibold flex items-center gap-[6px]"
                      style={{ color: c.textPrimary }}
                    >
                      <Layers size={13} style={{ color: c.textMuted, flexShrink: 0 }} />
                      <span className="truncate">{choice.name}</span>
                    </span>
                    <span className="text-[11px] truncate" style={{ color: c.textMuted }}>
                      {choice.where}
                      {counted
                        ? ` · ${mergeRepeated ? counted.distinctScreens : counted.screens} etapas · ${counted.decisions} decisões`
                        : choice.looseScreens
                          ? ` · ${choice.looseScreens} telas soltas na página`
                          : ''}
                    </span>
                  </span>
                  {selected &&
                    (analyzing ? (
                      <RefreshCw size={14} className="animate-spin" style={{ color: c.accent, flexShrink: 0 }} />
                    ) : (
                      <Check size={15} style={{ color: c.accent, flexShrink: 0 }} />
                    ))}
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="text-[11.5px] py-2" style={{ color: c.textMuted }}>
                Nenhum grupo com esse nome.
              </div>
            )}
          </div>
        </>
      )}

      {summary && (
        <div ref={resultRef} className="flex flex-col gap-3">
          <Field
            label="Canais que recebem estas telas"
            helperText={`O desenho está em ${summary.screenWidth}px de largura (${viewportLabel(
              summary.screenWidth,
            )}). Marque apenas os canais em que ele já serve — os outros você monta depois no editor.`}
          >
            <ChannelTypeChecklist options={channelOptions} selected={targetChannels} onChange={setTargetChannels} />
          </Field>

          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 text-[12px] cursor-pointer" style={{ color: c.textPrimary }}>
              <input
                type="checkbox"
                checked={mergeRepeated}
                disabled={disabled}
                onChange={(e) => setMergeRepeated(e.target.checked)}
                className="mt-[2px]"
              />
              <span>
                Reunir telas que repetem o mesmo título
                <span className="block text-[11.5px]" style={{ color: c.textMuted }}>
                  Estados diferentes da mesma tela (vazia, preenchida, com erro) viram uma etapa só.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-[12px] cursor-pointer" style={{ color: c.textPrimary }}>
              <input
                type="checkbox"
                checked={includeScreens}
                disabled={disabled}
                onChange={(e) => setIncludeScreens(e.target.checked)}
                className="mt-[2px]"
              />
              <span>
                Montar as telas de cada etapa
                <span className="block text-[11.5px]" style={{ color: c.textMuted }}>
                  Textos, listas e botões do desenho viram os componentes da tela. Desmarque para trazer só as etapas e
                  o caminho entre elas.
                </span>
              </span>
            </label>
          </div>

          <div
            className="rounded-lg px-3 py-[10px] text-[12px] leading-[1.5]"
            style={{ background: c.chipBg, border: `1px solid ${c.border}`, color: c.textSecondary }}
          >
            {chosen.length > 1 && `${chosen.length} grupos escolhidos: `}
            <span style={{ color: c.textPrimary, fontWeight: 600 }}>{steps} Tarefas de Usuário</span>
            {' e '}
            <span style={{ color: c.textPrimary, fontWeight: 600 }}>{summary.decisions} Decisões</span>
            {summary.incompleteDecisions > 0 && (
              <>
                {', sendo '}
                <span className="inline-flex items-center gap-[4px]" style={{ color: c.warning, fontWeight: 600 }}>
                  <AlertTriangle size={12} />
                  {summary.incompleteDecisions} sem os dois caminhos definidos
                </span>
              </>
            )}
            {'. '}
            {includeScreens ? 'As telas vêm montadas. ' : 'As etapas vêm sem tela. '}
            Você revisa tudo no editor antes de publicar.
          </div>

          {targetChannels.length === 0 && (
            <div className="text-[11.5px]" style={{ color: c.warning }}>
              Marque ao menos um canal para receber as telas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
