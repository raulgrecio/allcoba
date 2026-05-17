import type { Page } from 'playwright-core';

export const ProxyStrategy = {
  NONE: 'none',
  PROXY: 'proxy',
} as const;
export type ProxyStrategy = (typeof ProxyStrategy)[keyof typeof ProxyStrategy];

export const SolverStrategy = {
  NONE: 'none',
  MANUAL: 'manual',
  SOLVER: 'solver',
} as const;
export type SolverStrategy = (typeof SolverStrategy)[keyof typeof SolverStrategy];

export const CrawlerEngine = {
  PLAYWRIGHT: 'playwright',
  PATCHRIGHT: 'patchright',
  STATIC: 'static',
} as const;
export type CrawlerEngine = (typeof CrawlerEngine)[keyof typeof CrawlerEngine];

export interface NetworkOptions {
  useProxy?: boolean;
  proxyStrategy?: ProxyStrategy;
  trafficBlacklist?: string[];
}

export interface SolverOptions {
  solverStrategy?: SolverStrategy;
}

export interface EngineOptions {
  engine?: CrawlerEngine;
}

export interface SecurityStrategy extends NetworkOptions, SolverOptions, EngineOptions {
  sessionProfile?: string;
  blockImages?: boolean;
}

export interface CrawlResult {
  html: string;
  userAgent: string;
  serverIp?: string;
  outboundIp?: string;
  status: number;
  networkResponses?: Array<{ url: string; status: number; body: string; contentType: string }>;
}

export interface CrawlerOptions extends SecurityStrategy {
  headless?: boolean;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  manualPause?: boolean;
  skipInteractions?: boolean;
  captureNetwork?: boolean;
  ageGateSelectors?: string[];
  cookieSelectors?: string[];
  onSnapshot?: (html: string, step: string) => Promise<void>;
  onBeforeCapture?: (page: Page) => Promise<void>;
}

export interface CrawlerPort {
  fetch(url: string, options?: CrawlerOptions): Promise<CrawlResult>;
  isAllowed(url: string): Promise<boolean>;
  close(): Promise<void>;
}
