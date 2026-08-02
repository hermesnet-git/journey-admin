import { apiGet, apiPost, apiPut } from './client';

export type Status = 'ACTIVE' | 'INACTIVE';
export type ChannelType = 'WEB' | 'MOBILE' | 'WHATSAPP' | 'URA' | 'CONTACT_CENTER' | 'OTHER';

export interface Product {
  productId: string;
  name: string;
  description: string | null;
  status: Status;
  channelNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description: string;
}

export interface Channel {
  channelId: string;
  productId: string;
  name: string;
  description: string | null;
  type: ChannelType;
  status: Status;
  journeyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelInput {
  name: string;
  description: string;
  type: ChannelType;
}

export function listProducts(params: { q?: string; status?: Status } = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<Product[]>(`/products${qs ? `?${qs}` : ''}`);
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

export function listChannels(
  productId: string,
  params: { q?: string; type?: ChannelType; status?: Status } = {},
): Promise<Channel[]> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<Channel[]>(`/products/${productId}/channels${qs ? `?${qs}` : ''}`);
}

export function createChannel(productId: string, input: ChannelInput): Promise<Channel> {
  return apiPost<Channel>(`/products/${productId}/channels`, input);
}

export function updateChannel(channelId: string, input: ChannelInput): Promise<Channel> {
  return apiPut<Channel>(`/channels/${channelId}`, input);
}

export function deactivateChannel(channelId: string): Promise<void> {
  return apiPost<void>(`/channels/${channelId}/deactivate`);
}

export function activateChannel(channelId: string): Promise<void> {
  return apiPost<void>(`/channels/${channelId}/activate`);
}
