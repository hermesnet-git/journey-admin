import { loadConfig } from './config.js';
import { createBffServer } from './server.js';

const config = loadConfig();
const server = createBffServer(config);

server.listen(config.port, config.host, () => {
  process.stdout.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'emulator-bff',
    message: 'Emulator BFF iniciado',
    host: config.host,
    port: config.port,
    upstream: config.journeyBaseUrl,
  })}\n`);
});

function shutdown(signal: string): void {
  process.stdout.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'emulator-bff',
    message: 'Encerrando Emulator BFF',
    signal,
  })}\n`);
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
