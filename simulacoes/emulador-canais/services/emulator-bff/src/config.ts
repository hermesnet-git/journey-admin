export interface BffConfig {
  host: string;
  port: number;
  journeyBaseUrl: string;
  journeyTimeoutMs: number;
  adminBaseUrl: string;
  adminTimeoutMs: number;
  adminServiceUsername: string;
  adminServicePassword: string;
  wceBridgeBaseUrl: string;
  wceBridgeTimeoutMs: number;
  labBootstrapTtlMs: number;
  corsOrigins: ReadonlySet<string>;
  androidAvdBootTimeoutMs: number;
  androidExpoReadyTimeoutMs: number;
  androidFlutterReadyTimeoutMs: number;
}

function integerFromEnvironment(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} deve ser um inteiro entre ${minimum} e ${maximum}.`);
  }
  return parsed;
}

function baseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('MS_JOURNEY_BASE_URL deve usar HTTP ou HTTPS.');
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function loadConfig(): BffConfig {
  const origins = process.env.EMULATOR_CORS_ORIGINS
    ?? 'http://localhost:15170,http://127.0.0.1:15170,http://localhost:15171,http://127.0.0.1:15171,http://localhost:15172,http://127.0.0.1:15172,http://localhost:15173,http://127.0.0.1:15173';

  return {
    host: process.env.EMULATOR_BFF_HOST ?? '127.0.0.1',
    port: integerFromEnvironment('EMULATOR_BFF_PORT', 18085, 1024, 65535),
    journeyBaseUrl: baseUrl(process.env.MS_JOURNEY_BASE_URL ?? 'http://localhost:8085/api/v1'),
    journeyTimeoutMs: integerFromEnvironment('MS_JOURNEY_TIMEOUT_MS', 10_000, 100, 120_000),
    adminBaseUrl: baseUrl(process.env.ADMIN_BASE_URL ?? 'http://localhost:8081/api/v1'),
    adminTimeoutMs: integerFromEnvironment('ADMIN_TIMEOUT_MS', 10_000, 100, 120_000),
    adminServiceUsername: process.env.ADMIN_SERVICE_USERNAME ?? 'admin',
    adminServicePassword: process.env.ADMIN_SERVICE_PASSWORD ?? 'admin',
    wceBridgeBaseUrl: baseUrl(process.env.WCE_BRIDGE_BASE_URL ?? 'http://127.0.0.1:13001'),
    wceBridgeTimeoutMs: integerFromEnvironment('WCE_BRIDGE_TIMEOUT_MS', 10_000, 100, 120_000),
    labBootstrapTtlMs: integerFromEnvironment('LAB_BOOTSTRAP_TTL_MS', 600_000, 10_000, 3_600_000),
    corsOrigins: new Set(origins.split(',').map((origin) => origin.trim()).filter(Boolean)),
    androidAvdBootTimeoutMs: integerFromEnvironment('ANDROID_AVD_BOOT_TIMEOUT_MS', 180_000, 10_000, 600_000),
    androidExpoReadyTimeoutMs: integerFromEnvironment('ANDROID_EXPO_READY_TIMEOUT_MS', 60_000, 5_000, 300_000),
    androidFlutterReadyTimeoutMs: integerFromEnvironment('ANDROID_FLUTTER_READY_TIMEOUT_MS', 180_000, 10_000, 600_000),
  };
}
