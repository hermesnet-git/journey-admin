import { useState } from 'react';
import {
  ButtonLayout,
  ButtonPrimary,
  ButtonSecondary,
  Checkbox,
  DateField,
  DecimalField,
  EmailField,
  FileItem,
  FileUpload,
  Form,
  Select,
  Stack,
  Text,
  TextField,
  skinVars,
} from '@telefonica/mistica';
import type { FormValues } from '@telefonica/mistica';
import type { SduiNode } from './api';

interface Props {
  sdui: SduiNode;
  onSubmit: (answers: Record<string, unknown>) => void;
  submitting: boolean;
}

type OptionSpec = { label: string; value: string };

// name técnico do campo -> [name, tag] de cada opção do multiselect, já que Checkbox não se
// registra sozinho no Form (cada um precisaria de um "name" próprio, sem virar array de volta).
const MULTISELECT_SEPARATOR = '::';

export function SduiFormRenderer({ sdui, onSubmit, submitting }: Props) {
  const children = (sdui[2] ?? []) as SduiNode[];
  // FileUpload e Checkbox (multiselect) não se integram à coleta automática de valores do Form
  // da Mística (só componentes baseados em CommonFormFieldProps o fazem) — o restante dos campos
  // é resolvido pelo próprio Form via name.
  const [multiselectValues, setMultiselectValues] = useState<Record<string, string[]>>({});

  // Sem initialValues, o Form começa com values[name] undefined até a 1ª digitação — os campos
  // tipados (DecimalField/DateField) passam esse undefined direto pro <input>, que o React acusa
  // como "uncontrolled virando controlled" assim que o primeiro valor chega. Uma string vazia por
  // campo (name/select) evita essa transição.
  const initialValues: Record<string, string> = {};
  for (const [tag, props] of children) {
    if ((tag === 'ui.input' || tag === 'ui.select') && typeof props.name === 'string') {
      initialValues[props.name] = '';
    }
  }

  function handleFormSubmit(values: FormValues) {
    const answers: Record<string, unknown> = { ...values, ...multiselectValues };
    onSubmit(answers);
  }

  function toggleMultiselect(name: string, optionValue: string, checked: boolean) {
    setMultiselectValues((prev) => {
      const current = prev[name] ?? [];
      const next = checked ? [...current, optionValue] : current.filter((v) => v !== optionValue);
      return { ...prev, [name]: next };
    });
  }

  return (
    <Form onSubmit={handleFormSubmit} initialValues={initialValues}>
      <Stack space={24}>
        {children.map((child, i) => (
          <FieldRenderer key={i} node={child} multiselectValues={multiselectValues} onToggleMultiselect={toggleMultiselect} />
        ))}
        <ButtonLayout align="right" primaryButton={<ButtonPrimary submit showSpinner={submitting}>Avançar</ButtonPrimary>} />
      </Stack>
    </Form>
  );
}

function FieldRenderer({
  node,
  multiselectValues,
  onToggleMultiselect,
}: {
  node: SduiNode;
  multiselectValues: Record<string, string[]>;
  onToggleMultiselect: (name: string, optionValue: string, checked: boolean) => void;
}) {
  const [tag, props] = node;
  const name = props.name as string | undefined;
  const label = (props.label as string | undefined) ?? name ?? '';
  const required = props.required === true;
  const optional = !required;

  if (tag === 'ui.text') {
    return (
      <Stack space={4}>
        <Text size={15} color={skinVars.colors.textPrimary}>
          {props.text as string}
        </Text>
        {props.helpText != null && (
          <Text size={13} color={skinVars.colors.textSecondary}>
            {props.helpText as string}
          </Text>
        )}
      </Stack>
    );
  }

  if (!name) {
    return null;
  }

  // O rótulo da SDUI costuma ser a pergunta inteira ("Como você avalia..."), não um nome curto de
  // campo — o slot de "label" da Mística (TextField/Select/...) é pensado pro segundo caso e trunca
  // o primeiro. Por isso a pergunta vira um texto normal acima, e o próprio campo recebe um rótulo
  // curto e genérico (mesmo padrão usado nos demais tipos abaixo, que já faziam isso).
  const question = (
    <Text size={15} weight="medium" color={skinVars.colors.textPrimary}>
      {label}
      {required ? ' *' : ' (opcional)'}
    </Text>
  );

  if (tag === 'ui.input') {
    const inputType = props.type as string | undefined;
    const pattern = props.pattern as string | undefined;
    const min = props.min as number | undefined;
    const max = props.max as number | undefined;

    if (inputType === 'email') {
      return (
        <Stack space={8}>
          {question}
          <EmailField name={name} label="E-mail" optional={optional} fullWidth />
        </Stack>
      );
    }
    if (inputType === 'number') {
      return (
        <Stack space={8}>
          {question}
          <DecimalField
            name={name}
            label="Valor"
            optional={optional}
            fullWidth
            validate={(value) => {
              if (value === undefined || value === '') return undefined;
              const n = Number(value);
              if (min !== undefined && n < min) return `O valor mínimo é ${min}`;
              if (max !== undefined && n > max) return `O valor máximo é ${max}`;
              return undefined;
            }}
          />
        </Stack>
      );
    }
    if (inputType === 'date') {
      return (
        <Stack space={8}>
          {question}
          <DateField name={name} label="Data" optional={optional} fullWidth />
        </Stack>
      );
    }
    return (
      <Stack space={8}>
        {question}
        <TextField
          name={name}
          label="Sua resposta"
          optional={optional}
          fullWidth
          validate={(value) => {
            if (!pattern || !value) return undefined;
            return new RegExp(pattern).test(String(value)) ? undefined : 'Formato inválido';
          }}
        />
      </Stack>
    );
  }

  if (tag === 'ui.select') {
    const options = (props.options as OptionSpec[] | undefined) ?? [];
    return (
      <Stack space={8}>
        {question}
        <Select
          name={name}
          label="Selecione uma opção"
          optional={optional}
          fullWidth
          options={options.map((o) => ({ value: o.value, text: o.label }))}
        />
      </Stack>
    );
  }

  if (tag === 'ui.multiselect') {
    const options = (props.options as OptionSpec[] | undefined) ?? [];
    const selected = multiselectValues[name] ?? [];
    return (
      <Stack space={8}>
        {question}
        <Stack space={4}>
          {options.map((o) => (
            <Checkbox
              key={o.value}
              name={`${name}${MULTISELECT_SEPARATOR}${o.value}`}
              checked={selected.includes(o.value)}
              onChange={(checked) => onToggleMultiselect(name, o.value, checked)}
            >
              {o.label}
            </Checkbox>
          ))}
        </Stack>
      </Stack>
    );
  }

  if (tag === 'ui.upload') {
    // ponytail: FileUpload não expõe o arquivo escolhido ao componente pai fora do modo "render"
    // completo (dropzone/lista própria) — como nenhuma jornada atual usa o valor do upload em
    // outputMapping/condição de gateway, ele fica só visual (não entra no payload de "answers").
    // Upgrade: se algum fluxo passar a depender do nome do arquivo, trocar para o modo "render".
    const acceptedExtensions = props.acceptedExtensions as string[] | undefined;
    return (
      <Stack space={8}>
        {question}
        <FileUpload
          id={name}
          name={name}
          accept={acceptedExtensions?.join(',')}
          renderButton={(buttonProps) => <ButtonSecondary {...buttonProps}>Selecionar arquivo</ButtonSecondary>}
          renderFiles={({ files, removeFile }) =>
            files && files.length > 0 ? (
              <Stack space={4}>
                {Array.from(files).map((file) => (
                  <FileItem key={file.name} file={file} onRemove={removeFile} />
                ))}
              </Stack>
            ) : null
          }
        />
      </Stack>
    );
  }

  return null;
}
