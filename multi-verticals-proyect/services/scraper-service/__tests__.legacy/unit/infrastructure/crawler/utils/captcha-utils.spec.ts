import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright-core';

import {
  extractTurnstileKey,
  injectTurnstileToken,
} from '#infrastructure/crawler/utils/captcha-utils.js';

describe('Unit: captcha-utils', () => {
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = {
      evaluate: vi.fn(),
    };
  });

  describe('extractTurnstileKey', () => {
    it('debería extraer SiteKey desde el contenedor oficial', async () => {
      mockPage.evaluate.mockImplementation((fn: any) => {
        global.document = {
          querySelector: vi.fn().mockReturnValue({ getAttribute: () => 'official-key' }),
          querySelectorAll: vi.fn().mockReturnValue([]),
        } as any;
        return fn();
      });

      const result = await extractTurnstileKey(mockPage as unknown as Page);
      expect(result).toBe('official-key');
    });

    it('debería extraer SiteKey desde un iframe si no está en el contenedor', async () => {
      mockPage.evaluate.mockImplementation((fn: any) => {
        global.document = {
          querySelector: vi.fn().mockReturnValue(null),
          querySelectorAll: vi
            .fn()
            .mockReturnValue([
              { getAttribute: () => 'https://challenges.cloudflare.com/render/k=iframe-key' },
            ]),
        } as any;
        return fn();
      });

      const result = await extractTurnstileKey(mockPage as unknown as Page);
      expect(result).toBe('iframe-key');
    });

    it('debería retornar null si no encuentra nada', async () => {
      mockPage.evaluate.mockImplementation((fn: any) => {
        global.document = {
          querySelector: vi.fn().mockReturnValue(null),
          querySelectorAll: vi.fn().mockReturnValue([]),
        } as any;
        return fn();
      });

      const result = await extractTurnstileKey(mockPage as unknown as Page);
      expect(result).toBeNull();
    });
  });

  describe('injectTurnstileToken', () => {
    it('debería inyectar el token y llamar al callback si existe', async () => {
      mockPage.evaluate.mockImplementation((fn: any, token: string) => {
        const mockInput = { value: '' };
        const mockCallback = vi.fn();
        global.document = {
          querySelector: vi.fn().mockImplementation((sel: string) => {
            if (sel === 'input[name="cf-turnstile-response"]') return mockInput;
            if (sel === '.cf-turnstile') return { getAttribute: () => 'myCallback' };
            return null;
          }),
        } as any;
        global.window = { myCallback: mockCallback } as any;

        fn(token);
        expect(mockInput.value).toBe(token);
        expect(mockCallback).toHaveBeenCalledWith(token);
      });

      await injectTurnstileToken(mockPage as unknown as Page, 'test-token');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });
});
