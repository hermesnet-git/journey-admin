import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeContextProvider, getBlauSkin } from '@telefonica/mistica'
import './index.css'
import { App } from './App'

const skin = getBlauSkin()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeContextProvider theme={{ skin, colorScheme: 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}>
      <App />
    </ThemeContextProvider>
  </StrictMode>,
)
