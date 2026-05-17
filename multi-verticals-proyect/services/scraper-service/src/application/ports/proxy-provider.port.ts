export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface ProxyProvider {
  getConfig(strategy?: string): ProxyConfig | undefined;
}
