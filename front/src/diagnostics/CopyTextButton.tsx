import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';

// Botão de copiar texto puro (não JSON) pra valores curtos tipo taskId — compartilhado pelas 3
// opções de layout do drawer; `mutedColor`/`successColor` deixam o Inspector técnico (sempre
// escuro, fora do tema claro/escuro do app) usar suas próprias cores em vez das de skinVars.
export function CopyTextButton({ text, mutedColor, successColor }: { text: string; mutedColor?: string; successColor?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem feedback, sem quebrar a tela
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar"
      className="inline-flex items-center cursor-pointer border-0 bg-transparent p-0"
      style={{
        color: copied ? (successColor ?? skinVars.colors.success) : (mutedColor ?? skinVars.colors.textSecondary),
        marginLeft: 6,
        verticalAlign: 'middle',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}
