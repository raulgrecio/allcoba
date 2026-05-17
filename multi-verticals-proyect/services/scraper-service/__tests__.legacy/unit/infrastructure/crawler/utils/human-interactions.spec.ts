import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright-core';
import { 
  handleCloudflareChallenge, 
  clickTurnstileWidget, 
  waitForCloudflareClear,
  simulateHumanMouse,
  randomWait
} from '#infrastructure/crawler/utils/human-interactions.js';

describe('Unit: Human Interactions', () => {
  let mockPage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockMouse = {
      move: vi.fn().mockResolvedValue(undefined),
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
    };

    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com'),
      content: vi.fn().mockResolvedValue(''),
      evaluate: vi.fn(),
      mouse: mockMouse,
      $: vi.fn(),
      frames: vi.fn().mockReturnValue([]),
      waitForFunction: vi.fn().mockResolvedValue(true),
    };

    vi.stubGlobal('setTimeout', (fn: any) => fn());
  });

  describe('randomWait', () => {
    it('debería esperar un tiempo aleatorio', async () => {
      const promise = randomWait(1, 10);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('simulateHumanMouse', () => {
    it('debería mover el ratón en múltiples pasos', async () => {
      await simulateHumanMouse(mockPage as unknown as Page, 100, 100);
      expect(mockPage.mouse.move).toHaveBeenCalled();
      // Al menos 15 pasos
      expect(mockPage.mouse.move.mock.calls.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('clickTurnstileWidget', () => {
    it('debería hacer clic si encuentra el input de Turnstile', async () => {
      const mockElement = {
        evaluate: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 100, height: 100 }),
      };
      mockPage.$.mockResolvedValue(mockElement);

      const result = await clickTurnstileWidget(mockPage as unknown as Page);
      expect(result).toBe(true);
      expect(mockPage.mouse.down).toHaveBeenCalled();
      expect(mockPage.mouse.up).toHaveBeenCalled();
    });

    it('debería intentar en frames si no encuentra el input', async () => {
      mockPage.$.mockResolvedValue(null);
      const mockFrame = {
        url: vi.fn().mockReturnValue('challenges.cloudflare.com'),
        frameElement: vi.fn().mockResolvedValue({
          boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 100, height: 100 }),
        }),
      };
      mockPage.frames.mockReturnValue([mockFrame]);

      const result = await clickTurnstileWidget(mockPage as unknown as Page);
      expect(result).toBe(true);
    });

    it('debería retornar false si no encuentra nada', async () => {
      mockPage.$.mockResolvedValue(null);
      mockPage.frames.mockReturnValue([]);
      const result = await clickTurnstileWidget(mockPage as unknown as Page);
      expect(result).toBe(false);
    });
  });

  describe('waitForCloudflareClear', () => {
    it('debería retornar true si la función de espera se resuelve', async () => {
      mockPage.waitForFunction.mockResolvedValue(true);
      const result = await waitForCloudflareClear(mockPage as unknown as Page, 1000);
      expect(result).toBe(true);
    });

    it('debería retornar false si hay timeout', async () => {
      mockPage.waitForFunction.mockRejectedValue(new Error('timeout'));
      const result = await waitForCloudflareClear(mockPage as unknown as Page, 1000);
      expect(result).toBe(false);
    });
  });

  describe('handleCloudflareChallenge', () => {
    it('no debería hacer nada si no hay Cloudflare', async () => {
      mockPage.content.mockResolvedValue('<html>limpio</html>');
      await handleCloudflareChallenge(mockPage as unknown as Page);
      expect(mockPage.mouse.move).not.toHaveBeenCalled();
    });

    it('debería intentar resolver si detecta Cloudflare', async () => {
      mockPage.content.mockResolvedValue('<html>challenges.cloudflare.com</html>');
      mockPage.waitForFunction.mockResolvedValue(true);
      
      await handleCloudflareChallenge(mockPage as unknown as Page);
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('debería manejar errores al intentar clic', async () => {
      mockPage.$.mockRejectedValue(new Error('fail'));
      const result = await clickTurnstileWidget(mockPage as unknown as Page);
      expect(result).toBe(false);
    });

    it('debería calcular el rectángulo correctamente si hay input', async () => {
       const mockElement = {
         evaluate: vi.fn().mockImplementation((fn: any) => {
           const el = { parentElement: { parentElement: { parentElement: { getBoundingClientRect: () => ({ x: 5, y: 5, width: 20, height: 20 }) } } } };
           return fn(el);
         }),
       };
       mockPage.$.mockResolvedValue(mockElement);
       const result = await clickTurnstileWidget(mockPage as unknown as Page);
       expect(result).toBe(true);
       const lastCall = mockPage.mouse.move.mock.lastCall;
       expect(lastCall[0]).toBeGreaterThan(12);
       expect(lastCall[0]).toBeLessThan(18);
       expect(lastCall[1]).toBeGreaterThan(12);
       expect(lastCall[1]).toBeLessThan(18);
    });
  });

  describe('waitForCloudflareClear (evaluate internal)', () => {
    it('debería validar el estado de la página en el evaluate', async () => {
       // Este test es para cubrir la lógica interna de la función pasada a waitForFunction
       mockPage.waitForFunction.mockImplementation(async (fn: any) => {
         // Simulamos el entorno global para el evaluate
         const originalDocument = global.document;
         global.document = { 
           title: 'Limpio', 
           querySelector: vi.fn().mockReturnValue(null),
           body: { innerText: 'Contenido real' }
         } as any;
         const res = fn();
         global.document = originalDocument;
         return res;
       });

       const result = await waitForCloudflareClear(mockPage as unknown as Page, 1000);
       expect(result).toBe(true);
    });
  });

  describe('handleCloudflareChallenge (Manual Resolution)', () => {
    it('debería esperar resolución manual si no es headless y falla la automática', async () => {
      mockPage.content.mockResolvedValue('<html>Verify you are human</html>');
      mockPage.$.mockResolvedValue(null); // Falla clic automático
      
      // Primera espera falla, segunda (manual) tiene éxito
      mockPage.waitForFunction
        .mockRejectedValueOnce(new Error('timeout auto'))
        .mockResolvedValueOnce(true);
      
      await handleCloudflareChallenge(mockPage as unknown as Page, { headless: false });
      expect(mockPage.waitForFunction).toHaveBeenCalledTimes(2);
    });

    it('debería fallar si la resolución manual agota el tiempo', async () => {
      mockPage.content.mockResolvedValue('<html>Verify you are human</html>');
      mockPage.waitForFunction.mockRejectedValue(new Error('timeout total'));
      
      await expect(handleCloudflareChallenge(mockPage as unknown as Page, { headless: false }))
        .rejects.toThrow('Cloudflare no se resolvió a tiempo (manual).');
    });
  });
});
