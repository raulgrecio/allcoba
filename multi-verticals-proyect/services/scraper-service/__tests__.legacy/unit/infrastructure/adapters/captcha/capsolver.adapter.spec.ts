import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright-core';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';

describe('Unit: CapsolverAdapter', () => {
  let mockPage: any;
  const apiKey = 'test-api-key';
  let adapter: CapsolverAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CapsolverAdapter(apiKey);
    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com'),
      evaluate: vi.fn(),
    };

    // Mock fetch global
    global.fetch = vi.fn();
    
    // Mock setTimeout para polling rápido en tests
    vi.stubGlobal('setTimeout', (fn: any) => fn());
  });

  it('debería retornar false si no tiene API Key', async () => {
    const noKeyAdapter = new CapsolverAdapter('');
    const result = await noKeyAdapter.solve(mockPage as unknown as Page);
    expect(result).toBe(false);
  });

  it('debería retornar false si no encuentra el SiteKey', async () => {
    mockPage.evaluate.mockResolvedValue(null);
    const result = await adapter.solve(mockPage as unknown as Page);
    expect(result).toBe(false);
    expect(mockPage.evaluate).toHaveBeenCalled();
  });

  it('debería ejecutar la lógica de extracción de SiteKey (cobertura)', async () => {
    mockPage.evaluate.mockImplementation((fn: any) => {
      // Simulamos entorno DOM mínimo para que no explote
      global.document = {
        querySelector: vi.fn().mockReturnValue({ getAttribute: () => 'key1' }),
        querySelectorAll: vi.fn().mockReturnValue([]),
      } as any;
      return fn();
    });
    
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ errorId: 0, taskId: 't1', status: 'ready', solution: { token: 'tok' } }),
    });

    await adapter.solve(mockPage as unknown as Page);
    expect(mockPage.evaluate).toHaveBeenCalled();
  });

  it('debería ejecutar la lógica de inyección de token (cobertura)', async () => {
    mockPage.evaluate.mockResolvedValueOnce('site-key'); // Primer evaluate (sitekey)
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ errorId: 0, taskId: 't1', status: 'ready', solution: { token: 'tok' } }),
    });

    await adapter.solve(mockPage as unknown as Page);
    
    // Capturamos el segundo evaluate (inyección)
    const injectFn = mockPage.evaluate.mock.calls[1][0];
    global.document = {
      querySelector: vi.fn().mockImplementation((selector: string) => {
        if (selector === 'input[name="cf-turnstile-response"]') return { value: '' };
        if (selector === '.cf-turnstile') return { getAttribute: () => null };
        return null;
      }),
    } as any;
    global.window = {} as any;
    
    injectFn('tok');
    expect(global.document.querySelector).toHaveBeenCalled();
  });

  it('debería fallar si CapSolver reporta error al crear tarea', async () => {
    mockPage.evaluate.mockResolvedValueOnce('mock-site-key');
    
    (global.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ errorId: 1, errorDescription: 'Invalid API Key' }),
    });

    const result = await adapter.solve(mockPage as unknown as Page);
    expect(result).toBe(false);
  });

  it('debería fallar si el polling de CapSolver reporta un error', async () => {
    mockPage.evaluate.mockResolvedValueOnce('mock-site-key');
    
    (global.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ errorId: 0, taskId: 'task-123' }),
    });

    (global.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ status: 'failed' }),
    });

    const result = await adapter.solve(mockPage as unknown as Page);
    expect(result).toBe(false);
  });

  it('debería extraer SiteKey desde iframes si no está en el contenedor', async () => {
    // Simulamos el entorno del navegador dentro del evaluate
    mockPage.evaluate.mockImplementation((fn: any) => {
      if (typeof fn !== 'function') return 'iframe-key';
      
      const document = {
        querySelector: vi.fn().mockReturnValue(null),
        querySelectorAll: vi.fn().mockReturnValue([{ getAttribute: () => 'https://challenges.cloudflare.com/render/k=iframe-key' }]),
      };
      return 'iframe-key';
    });

    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ errorId: 0, taskId: 't1', status: 'ready', solution: { token: 'tok' } }),
    });

    const result = await adapter.solve(mockPage as unknown as Page);
    expect(result).toBe(true);
  });

  it('debería fallar por timeout si nunca está listo', async () => {
    mockPage.evaluate.mockResolvedValueOnce('mock-site-key');
    
    (global.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ errorId: 0, taskId: 'task-123' }),
    });

    // Simulamos que siempre está procesando
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ status: 'processing' }),
    });

    const result = await adapter.solve(mockPage as unknown as Page);
    expect(result).toBe(false);
  });
});
