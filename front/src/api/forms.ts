import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type FormFieldType = 'TEXT' | 'INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'FILE_UPLOAD';
export type InputSubtype = 'TEXT' | 'NUMBER' | 'EMAIL' | 'DATE';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  inputSubtype: InputSubtype | null;
  label: string;
  required: boolean;
  defaultValue: string | null;
  helpText: string | null;
  options: FormFieldOption[] | null;
  minValue: number | null;
  maxValue: number | null;
  validationPattern: string | null;
  acceptedExtensions: string[] | null;
  maxFileSizeBytes: number | null;
}

export interface Form {
  formId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FormInput {
  name: string;
  description: string;
  fields: FormField[];
}

export function listForms(params: { q?: string } = {}): Promise<Form[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  const qs = query.toString();
  return apiGet<Form[]>(`/forms${qs ? `?${qs}` : ''}`);
}

export function getForm(formId: string): Promise<Form> {
  return apiGet<Form>(`/forms/${formId}`);
}

export function createForm(input: FormInput): Promise<Form> {
  return apiPost<Form>('/forms', input);
}

export function updateForm(formId: string, input: FormInput): Promise<Form> {
  return apiPut<Form>(`/forms/${formId}`, input);
}

export function deleteForm(formId: string): Promise<void> {
  return apiDelete<void>(`/forms/${formId}`);
}
