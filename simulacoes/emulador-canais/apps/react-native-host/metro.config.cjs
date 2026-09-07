const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Os pacotes compartilhados preservam a extensao .js nos imports ESM para que
// seus artefatos compilados funcionem no Node. Durante o desenvolvimento, o
// Metro consome diretamente os fontes TypeScript do workspace; neste unico
// caso, tentamos o mesmo import sem a extensao antes da resolucao normal.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // O modulo pode ser um arquivo JavaScript real; a resolucao padrao abaixo
      // continua sendo a fonte de verdade para qualquer outro caso.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
