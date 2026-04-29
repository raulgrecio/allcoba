export interface AppConfig {
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
}

function readConfig(): AppConfig {
  // eslint-disable-next-line node/prefer-global/process
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  return {
    // eslint-disable-next-line node/prefer-global/process
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
  };
}

export const config: AppConfig = readConfig();
