import { apiGet, apiPost, apiPut } from './client';

export type Status = 'ACTIVE' | 'INACTIVE';
export type ChannelType = 'WEB' | 'MOBILE' | 'WHATSAPP';

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  WHATSAPP: 'WhatsApp',
};

export interface Product {
  productId: string;
  name: string;
  description: string | null;
  status: Status;
  channelTypes: ChannelType[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description: string;
  channelTypes: ChannelType[];
}

export function listProducts(params: { q?: string; status?: Status } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<Product[]>(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(productId: string): Promise<Product> {
  return apiGet<Product>(`/products/${productId}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiPost<Product>('/products', input);
}

export function updateProduct(productId: string, input: ProductInput): Promise<Product> {
  return apiPut<Product>(`/products/${productId}`, input);
}

export function deactivateProduct(productId: string): Promise<void> {
  return apiPost<void>(`/products/${productId}/deactivate`);
}

export function activateProduct(productId: string): Promise<void> {
  return apiPost<void>(`/products/${productId}/activate`);
}
