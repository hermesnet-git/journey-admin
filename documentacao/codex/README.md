# Dynamic Journey — apresentação de arquitetura

Apresentação HTML interativa que também funciona como documentação navegável da arquitetura da plataforma Dynamic Journey.

## Como abrir

Abra `index.html` diretamente no navegador. O artefato não possui dependências externas, não exige instalação e funciona sem servidor.

Para servir por HTTP localmente, qualquer servidor estático pode ser usado a partir desta pasta. Exemplo:

```powershell
python -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Modos de uso

- **Apresentação:** uma visão por tela, com navegação pelas setas, botões inferiores ou teclado.
- **Modo leitura:** exibe todas as visões em sequência, adequado para consulta como documentação.
- **Impressão/PDF:** a folha de estilo de impressão gera uma página 16:9 por visão.
- **Detalhes:** componentes clicáveis abrem um painel com responsabilidades, contratos e a principal fonte local.

Atalhos: `←`/`→` navegam, `O` abre o sumário, `R` alterna o modo leitura, `F` alterna tela cheia e `T` alterna o tema.

## Estrutura

- `index.html`: conteúdo semântico das 15 visões.
- `styles.css`: tema inspirado na skin Vivo Evolution/Mística, layout responsivo e impressão.
- `app.js`: navegação, sumário, temas, sequência interativa, foco por camada e painéis de detalhe.

## Fontes consolidadas

- `../../requisitos/admin/progresso.md`
- `../../requisitos/admin/ej-admin-arquitetura-logica.md`
- `../../requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md`
- `../../simulacoes/emulador-canais/docs/arquitetura.md`
- `../../simulacoes/emulador-canais/docs/status-implementacao.md`
- Implementações atuais de `admin/back`, `ms-transform-publication`, `ms-espec-registry`, `ms-journey` e `ms-runtime-camunda`.

## Premissas editoriais

- `ms-runtime-engine` é o nome lógico apresentado; a implementação atual encontrada no repositório é `ms-runtime-camunda`.
- A publicação foi representada como duas projeções coordenadas: processo BPMN no motor e snapshots SDUI no Strapi via `ms-espec-registry`.
- O Emulador de Canais foi descrito como laboratório/prova arquitetural, não como topologia produtiva.
- Percentuais e estados correspondem às datas registradas nas fontes durante a elaboração.

