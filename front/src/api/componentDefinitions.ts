import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type ComponentStatus = 'EXPERIMENTAL' | 'STABLE' | 'DEPRECATED' | 'REMOVED';
export type ComponentCategory = 'CONTENT' | 'LAYOUT' | 'INPUT' | 'ACTION' | 'FEEDBACK';
export type PropKind = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'ENUM' | 'TOKEN' | 'OPTIONS_LIST' | 'VALIDATION_LIST';
export type TargetStatus = 'SUPPORTED' | 'PLANNED' | 'UNSUPPORTED';

// Os 4 alvos de renderização do catálogo (seção 4) — chaves fixas de supportedTargets/adapterKeys.
export const RENDER_TARGETS = ['react.web', 'react.mobile', 'flutter.web', 'flutter.mobile'] as const;
export type RenderTarget = (typeof RENDER_TARGETS)[number];

export interface PropDescriptor {
  name: string;
  kind: PropKind;
  required: boolean;
  defaultValue: unknown;
  tokenGroup: string | null;
  enumValues: string[] | null;
}

export interface TargetSupport {
  status: TargetStatus;
  minRendererVersion: string;
}

export interface ComponentDefinition {
  id: string;
  type: string;
  version: string;
  status: ComponentStatus;
  level: number;
  category: ComponentCategory;
  allowsChildren: boolean;
  allowedChildTypes: string[];
  propsSchema: PropDescriptor[];
  events: string[];
  supportedTargets: Partial<Record<RenderTarget, TargetSupport>>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentDefinitionInput {
  type: string;
  version: string;
  status: ComponentStatus;
  level: number;
  category: ComponentCategory;
  allowsChildren: boolean;
  allowedChildTypes: string[];
  propsSchema: PropDescriptor[];
  events: string[];
  supportedTargets: Partial<Record<RenderTarget, TargetSupport>>;
}

export function listComponentDefinitions(): Promise<ComponentDefinition[]> {
  return apiGet<ComponentDefinition[]>('/component-registry');
}

export function createComponentDefinition(input: ComponentDefinitionInput): Promise<ComponentDefinition> {
  return apiPost<ComponentDefinition>('/component-registry', input);
}

export function updateComponentDefinition(id: string, input: ComponentDefinitionInput): Promise<ComponentDefinition> {
  return apiPut<ComponentDefinition>(`/component-registry/${id}`, input);
}

/** Marca REMOVED — nunca apaga a linha (telas já publicadas podem referenciar o type+version). */
export function deleteComponentDefinition(id: string): Promise<void> {
  return apiDelete<void>(`/component-registry/${id}`);
}
