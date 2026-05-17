import type { Page } from 'playwright-core';

export interface CaptchaSolver {
  solve(page: Page): Promise<boolean>;
}
