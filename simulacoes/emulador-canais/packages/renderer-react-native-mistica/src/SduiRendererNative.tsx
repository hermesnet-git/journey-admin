import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageResizeMode,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SduiNode } from '@elastic-journey/sdui-contract';
import type { FieldError, SduiRuntime } from '@elastic-journey/sdui-runtime';
import {
  color,
  defaultMobileMisticaTokens,
  elevation,
  iconSize,
  maxWidth,
  spacing,
  textAlign,
  type MobileMisticaTokens,
} from './tokens.js';

export interface NativeRendererDiagnostic {
  code: string;
  nodeId: string;
  message: string;
}

export interface NativeIconProps {
  size: number;
  color: string;
  accessibilityLabel: string;
}

export type NativeIconRegistry = Record<string, ComponentType<NativeIconProps>>;

export interface SduiRendererNativeProps {
  runtime: SduiRuntime;
  submitting?: boolean;
  tokens?: MobileMisticaTokens;
  iconRegistry?: NativeIconRegistry;
  onDiagnostics?: (diagnostic: NativeRendererDiagnostic) => void;
}

function stringValue(value: unknown): string {
  return value == null ? '' : String(value);
}

function keyboardType(mode: unknown): KeyboardTypeOptions {
  if (mode === 'email') return 'email-address';
  if (mode === 'tel') return 'phone-pad';
  if (mode === 'number') return 'numeric';
  if (mode === 'decimal') return 'decimal-pad';
  if (mode === 'url') return 'url';
  return 'default';
}

function coercedInputValue(node: SduiNode, value: string): unknown {
  if ((node.props.inputMode === 'number' || node.props.inputMode === 'decimal') && value !== '') return Number(value);
  return value;
}

function textPreset(node: SduiNode): TextStyle {
  const variant = String(node.props.variant ?? 'typography.body.regular');
  if (variant.includes('heading')) return { fontSize: 20, fontWeight: '700', lineHeight: 26 };
  if (variant.includes('caption')) return { fontSize: 12, fontWeight: '400', lineHeight: 16 };
  return { fontSize: 16, fontWeight: variant.includes('medium') ? '500' : '400', lineHeight: 22 };
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || !value) return new Date();
  if (/^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number);
    const time = new Date();
    time.setHours(hours ?? 0, minutes ?? 0, 0, 0);
    return time;
  }
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

function dateLimit(value: unknown): Date | undefined {
  if (value === 'today') return new Date();
  if (typeof value !== 'string' || !value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function serializeDate(value: Date, mode: unknown): string {
  if (mode === 'time') return `${twoDigits(value.getHours())}:${twoDigits(value.getMinutes())}`;
  if (mode === 'dateTime') return value.toISOString();
  return `${value.getFullYear()}-${twoDigits(value.getMonth() + 1)}-${twoDigits(value.getDate())}`;
}

function displayDate(value: unknown, mode: unknown, format: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const date = parseDate(value);
  const parts: Record<string, string> = {
    'dd/MM/yyyy': `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`,
    'MM/dd/yyyy': `${twoDigits(date.getMonth() + 1)}/${twoDigits(date.getDate())}/${date.getFullYear()}`,
    'yyyy-MM-dd': `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`,
    'HH:mm': `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`,
    'dd/MM/yyyy HH:mm': `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`,
  };
  if (typeof format === 'string' && parts[format]) return parts[format];
  if (mode === 'time') return parts['HH:mm']!;
  if (mode === 'dateTime') return parts['dd/MM/yyyy HH:mm']!;
  return parts['dd/MM/yyyy']!;
}

function NativeSelectField({
  node,
  runtime,
  error,
  tokens,
  onChange,
}: {
  node: SduiNode;
  runtime: SduiRuntime;
  error?: string;
  tokens: MobileMisticaTokens;
  onChange: (node: SduiNode, value: unknown) => Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const options = Array.isArray(node.props.options) ? node.props.options : [];
  const selectedValue = stringValue(runtime.getNodeValue(node));
  const selectedOption = options.find((option) => String(option.value) === selectedValue);
  const filteredOptions = options.filter((option) => runtime.resolveText(option.label).toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')));
  const label = runtime.resolveText(node.props.label);
  const placeholder = runtime.resolveText(node.props.placeholder) || 'Selecione';

  if (node.props.searchable !== true) {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{label}{node.props.required === true ? ' *' : ''}</Text>
        <View style={[styles.input, styles.picker, { borderColor: error ? tokens.colors.negative : tokens.colors.border }]}>
          <Picker accessibilityLabel={label} selectedValue={selectedValue} onValueChange={(value) => void onChange(node, value)} style={{ color: tokens.colors.textPrimary }}>
            <Picker.Item label={placeholder} value="" enabled={node.props.required !== true} />
            {options.map((option) => <Picker.Item key={String(option.value)} label={runtime.resolveText(option.label)} value={String(option.value)} enabled={option.disabled !== true} />)}
          </Picker>
        </View>
        {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{label}{node.props.required === true ? ' *' : ''}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Abre uma lista pesquisável de opções"
        onPress={() => setVisible(true)}
        style={[styles.input, styles.selectButton, { borderColor: error ? tokens.colors.negative : tokens.colors.border }]}
      >
        <Text style={{ color: selectedOption ? tokens.colors.textPrimary : tokens.colors.textSecondary }}>{selectedOption ? runtime.resolveText(selectedOption.label) : placeholder}</Text>
        <Text accessibilityElementsHidden style={{ color: tokens.colors.textSecondary }}>⌄</Text>
      </Pressable>
      {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}

      <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: tokens.colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: tokens.colors.border }]}>
            <Text accessibilityRole="header" style={[styles.modalTitle, { color: tokens.colors.textPrimary }]}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar lista" onPress={() => setVisible(false)} style={styles.modalClose}>
              <Text style={{ color: tokens.colors.brand, fontSize: 16, fontWeight: '700' }}>Fechar</Text>
            </Pressable>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput
              accessibilityLabel={`Pesquisar em ${label}`}
              autoFocus
              value={query}
              placeholder="Pesquisar"
              placeholderTextColor={tokens.colors.textSecondary}
              onChangeText={setQuery}
              style={[styles.input, { borderColor: tokens.colors.border, color: tokens.colors.textPrimary }]}
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {node.props.required !== true && !query
              ? <Pressable accessibilityRole="button" onPress={() => { void onChange(node, ''); setVisible(false); }} style={[styles.option, { borderBottomColor: tokens.colors.border }]}><Text style={{ color: tokens.colors.textSecondary }}>{placeholder}</Text></Pressable>
              : null}
            {filteredOptions.map((option) => {
              const selected = String(option.value) === selectedValue;
              return (
                <Pressable
                  key={String(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: option.disabled === true, selected }}
                  disabled={option.disabled === true}
                  onPress={() => {
                    void onChange(node, String(option.value));
                    setVisible(false);
                    setQuery('');
                  }}
                  style={[styles.option, { borderBottomColor: tokens.colors.border, opacity: option.disabled === true ? 0.45 : 1 }]}
                >
                  <Text style={{ color: tokens.colors.textPrimary, flex: 1 }}>{runtime.resolveText(option.label)}</Text>
                  {selected ? <Text accessibilityLabel="Selecionado" style={{ color: tokens.colors.brand, fontWeight: '700' }}>✓</Text> : null}
                </Pressable>
              );
            })}
            {filteredOptions.length === 0 ? <Text style={[styles.emptyOptions, { color: tokens.colors.textSecondary }]}>Nenhuma opção encontrada.</Text> : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function NativeDatePickerField({
  node,
  runtime,
  error,
  tokens,
  onChange,
}: {
  node: SduiNode;
  runtime: SduiRuntime;
  error?: string;
  tokens: MobileMisticaTokens;
  onChange: (node: SduiNode, value: unknown) => Promise<void>;
}) {
  const mode = node.props.mode ?? 'date';
  const [visible, setVisible] = useState(false);
  const [androidPhase, setAndroidPhase] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState<Date>(parseDate(runtime.getNodeValue(node)));
  const selected = parseDate(runtime.getNodeValue(node));
  const pickerMode = mode === 'time' ? 'time' : mode === 'dateTime' && Platform.OS === 'ios' ? 'datetime' : androidPhase;

  const handleChange = async (event: DateTimePickerEvent, value?: Date): Promise<void> => {
    if (event.type === 'dismissed' || !value) {
      setVisible(false);
      setAndroidPhase('date');
      return;
    }
    if (mode === 'dateTime' && Platform.OS === 'android' && androidPhase === 'date') {
      setDraft(value);
      setAndroidPhase('time');
      return;
    }
    const complete = mode === 'dateTime' && Platform.OS === 'android'
      ? new Date(draft.getFullYear(), draft.getMonth(), draft.getDate(), value.getHours(), value.getMinutes())
      : value;
    await onChange(node, serializeDate(complete, mode));
    setVisible(false);
    setAndroidPhase('date');
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{runtime.resolveText(node.props.label)}{node.props.required === true ? ' *' : ''}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={runtime.resolveText(node.props.label)}
        accessibilityHint="Abre o seletor de data ou horário"
        onPress={() => {
          setDraft(selected);
          setVisible(true);
        }}
        style={[styles.input, { borderColor: error ? tokens.colors.negative : tokens.colors.border }]}
      >
        <Text style={{ color: runtime.getNodeValue(node) ? tokens.colors.textPrimary : tokens.colors.textSecondary }}>{displayDate(runtime.getNodeValue(node), mode, node.props.format) || 'Selecionar'}</Text>
      </Pressable>
      {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}
      {visible ? (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
          <DateTimePicker
            value={selected}
            mode={pickerMode}
            minimumDate={dateLimit(node.props.minDate)}
            maximumDate={dateLimit(node.props.maxDate)}
            onChange={(event, value) => void handleChange(event, value)}
          />
          {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={[styles.smallButton, { backgroundColor: tokens.colors.brand }]}><Text style={{ color: tokens.colors.onBrand }}>Concluir</Text></Pressable> : null}
        </View>
      ) : null}
    </View>
  );
}

export function SduiRendererNative({
  runtime,
  submitting = false,
  tokens = defaultMobileMisticaTokens,
  iconRegistry = {},
  onDiagnostics,
}: SduiRendererNativeProps) {
  useSyncExternalStore(runtime.subscribe.bind(runtime), runtime.getRevision, runtime.getRevision);
  const { width } = useWindowDimensions();
  const [errors, setErrors] = useState<FieldError[]>([]);
  const deliveredRenderDiagnostics = useRef(new Set<string>());
  const renderDiagnostics: NativeRendererDiagnostic[] = [];

  useEffect(() => {
    deliveredRenderDiagnostics.current.clear();
  }, [runtime]);

  useEffect(() => {
    if (!onDiagnostics) return;
    for (const diagnostic of renderDiagnostics) {
      const key = `${diagnostic.code}:${diagnostic.nodeId}`;
      if (deliveredRenderDiagnostics.current.has(key)) continue;
      deliveredRenderDiagnostics.current.add(key);
      onDiagnostics(diagnostic);
    }
  });

  const fieldError = (node: SduiNode): string | undefined => errors.find((error) => error.nodeId === node.id)?.message;

  const dispatch = async (node: SduiNode, eventName: string): Promise<void> => {
    try {
      const result = await runtime.dispatch(node, eventName);
      setErrors(result.errors);
    } catch (error) {
      onDiagnostics?.({
        code: 'ACTION_FAILED',
        nodeId: node.id,
        message: error instanceof Error ? error.message : 'Falha ao executar ação declarativa.',
      });
    }
  };

  const change = async (node: SduiNode, value: unknown): Promise<void> => {
    if (!runtime.setNodeValue(node, value)) {
      onDiagnostics?.({ code: 'BINDING_NOT_WRITABLE', nodeId: node.id, message: 'O campo não possui binding form.* twoWay gravável.' });
      return;
    }
    setErrors((current) => current.filter((error) => error.nodeId !== node.id));
    await dispatch(node, 'onChange');
  };

  const renderChildren = (node: SduiNode): ReactNode[] => (node.children ?? []).map((child) => (
    <Fragment key={child.id}>{renderNode(child)}</Fragment>
  ));

  const renderNode = (node: SduiNode): ReactNode => {
    if (!runtime.isVisible(node)) return null;
    if (node.version !== '1.0') {
      renderDiagnostics.push({ code: 'COMPONENT_VERSION_UNSUPPORTED', nodeId: node.id, message: `${node.type}@${node.version} não é suportado pelo renderer react.mobile.` });
      return <Text accessibilityRole="alert" style={{ color: tokens.colors.negative }}>Conteúdo incompatível com esta versão do aplicativo.</Text>;
    }
    const props = node.props;
    const resolved = (value: unknown): string => runtime.resolveText(value);
    const children = renderChildren(node);

    switch (node.type) {
      case 'ui.screen': {
        const content = <View style={{ gap: spacing(tokens, props.paddingToken, 16), padding: spacing(tokens, props.paddingToken, 16) }}>{props.title ? <Text accessibilityRole="header" style={[styles.screenTitle, { color: tokens.colors.textPrimary }]}>{resolved(props.title)}</Text> : null}{children}</View>;
        return (
          <SafeAreaView style={[styles.screen, { backgroundColor: color(tokens, props.backgroundToken) ?? tokens.colors.backgroundPrimary }]}>
            {props.scrollable === false ? content : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>{content}</ScrollView>}
          </SafeAreaView>
        );
      }

      case 'ui.container':
        return <View style={{ alignSelf: 'center', backgroundColor: color(tokens, props.backgroundToken), borderColor: props.borderToken ? color(tokens, props.borderToken) ?? tokens.colors.border : undefined, borderWidth: props.borderToken ? StyleSheet.hairlineWidth : 0, margin: spacing(tokens, props.marginToken), maxWidth: maxWidth(tokens, props.maxWidthToken), padding: spacing(tokens, props.paddingToken), width: '100%' }}>{children}</View>;

      case 'ui.stack': {
        const direction = props.direction === 'horizontal' || (props.direction === 'responsive' && width >= 600) ? 'row' : 'column';
        return <View style={{ alignItems: props.align === 'start' ? 'flex-start' : props.align === 'end' ? 'flex-end' : props.align === 'center' ? 'center' : props.align === 'stretch' ? 'stretch' : undefined, flexDirection: direction, flexWrap: props.wrap === true ? 'wrap' : 'nowrap', gap: spacing(tokens, props.gapToken, 16), justifyContent: props.justify === 'between' ? 'space-between' : props.justify === 'around' ? 'space-around' : props.justify === 'evenly' ? 'space-evenly' : props.justify === 'center' ? 'center' : props.justify === 'end' ? 'flex-end' : props.justify === 'start' ? 'flex-start' : undefined }}>{children}</View>;
      }

      case 'ui.card': {
        const variant = String(props.variant ?? 'default');
        const cardStyle: StyleProp<ViewStyle> = [
          styles.card,
          {
            backgroundColor: variant === 'highlighted' ? tokens.colors.informativeLow : tokens.colors.surface,
            borderColor: variant === 'highlighted' ? tokens.colors.brand : tokens.colors.border,
            borderWidth: variant === 'outlined' || variant === 'highlighted' ? 1 : StyleSheet.hairlineWidth,
            padding: spacing(tokens, props.paddingToken, 16),
          },
          elevation(props.elevationToken),
        ];
        return props.interactive === true && node.events?.onPress
          ? <Pressable accessibilityRole="button" onPress={() => void dispatch(node, 'onPress')} style={({ pressed }) => [cardStyle, pressed && { opacity: 0.78 }]}>{children}</Pressable>
          : <View style={cardStyle}>{children}</View>;
      }

      case 'ui.text':
        return <Text numberOfLines={typeof props.maxLines === 'number' ? props.maxLines : undefined} style={[textPreset(node), { color: color(tokens, props.colorToken) ?? tokens.colors.textPrimary, textAlign: textAlign(props.align) }]}>{resolved(props.text)}</Text>;

      case 'ui.image': {
        const source = resolved(props.source);
        if (!source) return null;
        const resizeMode: ImageResizeMode = props.fit === 'cover' || props.fit === 'contain' || props.fit === 'stretch' || props.fit === 'center' || props.fit === 'repeat' ? props.fit : 'cover';
        return <Image accessibilityLabel={resolved(props.alt)} source={{ uri: source }} resizeMode={resizeMode} style={[styles.image, typeof props.aspectRatio === 'number' ? { aspectRatio: props.aspectRatio } : null]} />;
      }

      case 'ui.icon': {
        const name = String(props.name ?? '').toLowerCase();
        const Icon = iconRegistry[name];
        const nativeProps: NativeIconProps = { size: iconSize(tokens, props.sizeToken), color: String(color(tokens, props.colorToken) ?? tokens.colors.textPrimary), accessibilityLabel: resolved(props.accessibilityLabel) };
        if (Icon) return <Icon {...nativeProps} />;
        renderDiagnostics.push({ code: 'ICON_NOT_MAPPED', nodeId: node.id, message: `Ícone '${name}' não mapeado para react.mobile.` });
        const glyphs: Record<string, string> = { info: 'ⓘ', information: 'ⓘ', warning: '⚠', success: '✓', close: '×' };
        return <Text accessible accessibilityLabel={nativeProps.accessibilityLabel} style={{ color: nativeProps.color, fontSize: nativeProps.size }}>{glyphs[name] ?? '•'}</Text>;
      }

      case 'ui.divider':
        return props.orientation === 'vertical'
          ? <View accessibilityElementsHidden style={{ alignSelf: 'stretch', borderLeftColor: color(tokens, props.colorToken) ?? tokens.colors.border, borderLeftWidth: StyleSheet.hairlineWidth, marginHorizontal: spacing(tokens, props.spacingToken, 8) }} />
          : <View accessibilityElementsHidden style={{ borderTopColor: color(tokens, props.colorToken) ?? tokens.colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginVertical: spacing(tokens, props.spacingToken, 8) }} />;

      case 'ui.spacer': {
        const size = spacing(tokens, props.sizeToken, 16);
        return <View accessibilityElementsHidden style={props.axis === 'horizontal' ? { width: size } : { height: size }} />;
      }

      case 'ui.textInput': {
        const error = fieldError(node);
        return (
          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{resolved(props.label)}{props.required === true ? ' *' : ''}</Text>
            <TextInput
              accessibilityLabel={resolved(props.label)}
              accessibilityState={{ disabled: props.readOnly === true }}
              value={stringValue(runtime.getNodeValue(node))}
              placeholder={resolved(props.placeholder)}
              placeholderTextColor={tokens.colors.textSecondary}
              keyboardType={keyboardType(props.inputMode)}
              autoCapitalize={props.inputMode === 'email' || props.inputMode === 'url' ? 'none' : 'sentences'}
              editable={props.readOnly !== true}
              maxLength={typeof props.maxLength === 'number' ? props.maxLength : undefined}
              onChangeText={(value) => void change(node, coercedInputValue(node, value))}
              onBlur={() => void dispatch(node, 'onBlur')}
              style={[styles.input, { borderColor: error ? tokens.colors.negative : tokens.colors.border, color: tokens.colors.textPrimary }]}
            />
            {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}
          </View>
        );
      }

      case 'ui.textArea': {
        const error = fieldError(node);
        const minLines = typeof props.minLines === 'number' ? Math.max(1, props.minLines) : 4;
        const maxLines = typeof props.maxLines === 'number' ? Math.max(minLines, props.maxLines) : undefined;
        return (
          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.colors.textPrimary }]}>{resolved(props.label)}{props.required === true ? ' *' : ''}</Text>
            <TextInput
              accessibilityLabel={resolved(props.label)}
              value={stringValue(runtime.getNodeValue(node))}
              placeholder={resolved(props.placeholder)}
              placeholderTextColor={tokens.colors.textSecondary}
              multiline
              numberOfLines={minLines}
              maxLength={typeof props.maxLength === 'number' ? props.maxLength : undefined}
              textAlignVertical="top"
              onChangeText={(value) => void change(node, value)}
              onBlur={() => void dispatch(node, 'onBlur')}
              style={[styles.input, { borderColor: error ? tokens.colors.negative : tokens.colors.border, color: tokens.colors.textPrimary, minHeight: minLines * 22 + 22, maxHeight: maxLines ? maxLines * 22 + 22 : undefined }]}
            />
            {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}
          </View>
        );
      }

      case 'ui.select': {
        return <NativeSelectField node={node} runtime={runtime} error={fieldError(node)} tokens={tokens} onChange={change} />;
      }

      case 'ui.checkbox': {
        const checked = runtime.getNodeValue(node) === true;
        const indeterminate = props.indeterminate === true;
        const error = fieldError(node);
        return (
          <View style={styles.field}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: indeterminate ? 'mixed' : checked }} accessibilityLabel={resolved(props.label)} onPress={() => void change(node, !checked)} style={styles.checkboxRow}>
              <View style={[styles.checkbox, { backgroundColor: checked || indeterminate ? tokens.colors.brand : tokens.colors.surface, borderColor: checked || indeterminate ? tokens.colors.brand : tokens.colors.border }]}><Text style={{ color: tokens.colors.onBrand, fontWeight: '700' }}>{indeterminate ? '–' : checked ? '✓' : ''}</Text></View>
              <Text style={{ color: tokens.colors.textPrimary, flex: 1 }}>{resolved(props.label)}{props.required === true ? ' *' : ''}</Text>
            </Pressable>
            {error ? <Text style={[styles.helper, { color: tokens.colors.negative }]}>{error}</Text> : null}
          </View>
        );
      }

      case 'ui.datePicker':
        return <NativeDatePickerField node={node} runtime={runtime} error={fieldError(node)} tokens={tokens} onChange={change} />;

      case 'ui.button': {
        const disabled = props.disabled === true || submitting || props.loading === true;
        const variant = String(props.variant ?? 'primary');
        const backgroundColor = variant === 'danger' ? tokens.colors.negative : variant === 'secondary' || variant === 'link' ? 'transparent' : tokens.colors.brand;
        const foreground = variant === 'primary' || variant === 'danger' ? tokens.colors.onBrand : variant === 'danger' ? tokens.colors.negative : tokens.colors.brand;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: submitting || props.loading === true }}
            disabled={disabled}
            onPress={() => void dispatch(node, 'onPress')}
            style={({ pressed }) => [styles.button, { alignSelf: props.fullWidth === true ? 'stretch' : 'flex-start', backgroundColor, borderColor: variant === 'secondary' ? tokens.colors.brand : backgroundColor, minHeight: props.size === 'small' ? 40 : 48, opacity: disabled ? 0.55 : pressed ? 0.78 : 1 }]}
          >
            {submitting || props.loading === true ? <ActivityIndicator color={foreground} /> : <Text style={{ color: foreground, fontSize: 16, fontWeight: '700' }}>{resolved(props.label)}</Text>}
          </Pressable>
        );
      }

      case 'ui.link':
        return <Pressable accessibilityRole="link" accessibilityLabel={resolved(props.accessibilityLabel) || resolved(props.label)} accessibilityHint={props.external === true ? 'Abre conteúdo externo' : undefined} onPress={() => void dispatch(node, 'onPress')}><Text style={{ color: tokens.colors.brand, fontSize: 16, fontWeight: props.emphasis === 'high' ? '700' : '500', textDecorationLine: 'underline' }}>{resolved(props.label)}</Text></Pressable>;

      case 'ui.alert': {
        const severity = String(props.severity ?? 'informative');
        const palette = severity === 'negative' ? { background: tokens.colors.negativeLow, foreground: tokens.colors.negative } : severity === 'positive' ? { background: tokens.colors.positiveLow, foreground: tokens.colors.positive } : severity === 'warning' ? { background: tokens.colors.warningLow, foreground: tokens.colors.warning } : { background: tokens.colors.informativeLow, foreground: tokens.colors.brand };
        return (
          <View accessibilityRole={severity === 'negative' ? 'alert' : 'summary'} style={[styles.alert, { backgroundColor: palette.background, borderColor: palette.foreground }]}>
            <View style={{ flex: 1, gap: 4 }}>{props.title ? <Text style={{ color: palette.foreground, fontSize: 16, fontWeight: '700' }}>{resolved(props.title)}</Text> : null}<Text style={{ color: tokens.colors.textPrimary }}>{resolved(props.message)}</Text></View>
            {props.dismissible === true ? <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={() => node.events?.onDismiss ? void dispatch(node, 'onDismiss') : runtime.dismiss(node.id)}><Text style={{ color: palette.foreground, fontSize: 22 }}>×</Text></Pressable> : null}
          </View>
        );
      }

      case 'ui.progress': {
        const raw = typeof props.value === 'number' ? props.value : 0;
        const value = Math.min(100, Math.max(0, raw <= 1 ? raw * 100 : raw));
        return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }} style={{ gap: 8 }}>{props.label ? <Text style={{ color: tokens.colors.textPrimary }}>{resolved(props.label)}</Text> : null}<View style={[styles.progressTrack, { backgroundColor: tokens.colors.backgroundSecondary }]}><View style={[styles.progressValue, { backgroundColor: tokens.colors.brand, width: `${value}%` }]} /></View>{props.showValue === true ? <Text style={[styles.helper, { color: tokens.colors.textSecondary }]}>{Math.round(value)}%</Text> : null}</View>;
      }

      case 'ui.loading': {
        const body = <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator size={iconSize(tokens, props.sizeToken) >= 28 ? 'large' : 'small'} color={tokens.colors.brand} accessibilityLabel={resolved(props.label) || 'Carregando'} />{props.label ? <Text style={{ color: tokens.colors.textSecondary }}>{resolved(props.label)}</Text> : null}</View>;
        return props.overlay === true ? <View style={[styles.loadingOverlay, { backgroundColor: tokens.colors.surface }]}>{body}</View> : body;
      }

      default:
        renderDiagnostics.push({ code: 'COMPONENT_NOT_RENDERED', nodeId: node.id, message: `Componente '${String(node.type)}' sem adapter react.mobile.` });
        return null;
    }
  };

  return <>{renderNode(runtime.root)}</>;
}

const styles = StyleSheet.create({
  alert: { borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  button: { alignItems: 'center', borderRadius: 24, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 10 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  checkbox: { alignItems: 'center', borderRadius: 4, borderWidth: 1.5, height: 24, justifyContent: 'center', width: 24 },
  checkboxRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44 },
  field: { gap: 7, width: '100%' },
  helper: { fontSize: 12, lineHeight: 16 },
  image: { minHeight: 160, width: '100%' },
  input: { borderRadius: 9, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  iosPicker: { borderRadius: 10, gap: 8, padding: 8 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  loading: { alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 },
  loadingOverlay: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, opacity: 0.94, position: 'absolute', right: 0, top: 0, zIndex: 20 },
  modal: { flex: 1 },
  modalClose: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  modalHeader: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 16 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  emptyOptions: { padding: 20, textAlign: 'center' },
  option: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 10 },
  picker: { justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0 },
  progressTrack: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  progressValue: { borderRadius: 4, height: '100%' },
  screen: { flex: 1, position: 'relative', width: '100%' },
  screenTitle: { fontSize: 24, fontWeight: '700', lineHeight: 31 },
  scrollContent: { flexGrow: 1 },
  selectButton: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  smallButton: { alignItems: 'center', alignSelf: 'flex-end', borderRadius: 18, minHeight: 36, justifyContent: 'center', paddingHorizontal: 16 },
});
