import { useEffect, useState } from 'react';
import { Field, TextInput, TextArea, SelectInput } from '../products/ui';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';

export interface JourneyMeta {
  name: string;
  description: string;
  channelId: string;
}

export function JourneyPanel({
  meta,
  onChange,
  locked,
}: {
  meta: JourneyMeta;
  onChange: (meta: JourneyMeta) => void;
  locked: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [productId, setProductId] = useState('');

  useEffect(() => {
    listProducts({ status: 'ACTIVE' }).then(setProducts);
  }, []);

  useEffect(() => {
    if (!productId) {
      setChannels([]);
      return;
    }
    listChannels(productId, { status: 'ACTIVE' }).then(setChannels);
  }, [productId]);

  return (
    <div className="w-[280px] shrink-0 border-r border-[#e4e4e7] bg-white p-4 flex flex-col gap-4 overflow-auto">
      <div className="text-[15px] font-semibold">Dados da jornada</div>
      {!locked && (
        <>
          <Field label="Produto">
            <SelectInput
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                onChange({ ...meta, channelId: '' });
              }}
            >
              <option value="">Selecione...</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Canal">
            <SelectInput
              value={meta.channelId}
              disabled={!productId}
              onChange={(e) => onChange({ ...meta, channelId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {channels.map((c) => (
                <option key={c.channelId} value={c.channelId}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </>
      )}
      <Field label="Nome">
        <TextInput value={meta.name} onChange={(e) => onChange({ ...meta, name: e.target.value })} maxLength={200} />
      </Field>
      <Field label="Descrição">
        <TextArea value={meta.description} onChange={(e) => onChange({ ...meta, description: e.target.value })} />
      </Field>
    </div>
  );
}
