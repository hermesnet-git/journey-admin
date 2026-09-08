import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeContextProvider, getSkinByName } from '@telefonica/mistica';
import '@telefonica/mistica/css/mistica.css';
import { App } from './App.js';
import './styles.css';

const vivoSkin = getSkinByName('Vivo-evolution');
type LabColorScheme = 'light' | 'dark';

function initialColorScheme(): LabColorScheme {
  try {
    const stored = window.localStorage.getItem('elastic-journey:channel-lab:color-scheme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // O tema continua funcional quando o navegador bloqueia armazenamento local.
  }
  // Sem preferência salva, o Channel Lab abre no escuro por padrão.
  return 'dark';
}

function ThemedChannelLab() {
  const [colorScheme, setColorScheme] = useState<LabColorScheme>(initialColorScheme);

  const toggleColorScheme = (): void => {
    setColorScheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem('elastic-journey:channel-lab:color-scheme', next);
      } catch {
        // Mantém a troca em memória quando a persistência não está disponível.
      }
      return next;
    });
  };

  return (
    <ThemeContextProvider
      theme={{
        skin: vivoSkin,
        colorScheme,
        i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' },
      }}
    >
      <App colorScheme={colorScheme} onToggleColorScheme={toggleColorScheme} />
    </ThemeContextProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedChannelLab />
  </StrictMode>,
);
