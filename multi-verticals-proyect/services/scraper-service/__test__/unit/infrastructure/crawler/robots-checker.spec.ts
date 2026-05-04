import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RobotsChecker } from '@/infrastructure/crawler/robots-checker.js';
import robotsParser from 'robots-parser';

vi.mock('robots-parser');

describe('Unit: RobotsChecker', () => {
  let checker: RobotsChecker;

  beforeEach(() => {
    vi.resetAllMocks();
    checker = new RobotsChecker();
    
    // Mock global fetch
    global.fetch = vi.fn();
  });

  it('debería permitir acceso si robots.txt dice que sí', async () => {
    const mockParser = { isAllowed: vi.fn().mockReturnValue(true) };
    vi.mocked(robotsParser).mockReturnValue(mockParser as any);
    
    vi.mocked(fetch).mockResolvedValue({
      text: vi.fn().mockResolvedValue('User-agent: *\nAllow: /')
    } as any);

    const allowed = await checker.isAllowed('https://example.com/page');
    
    expect(allowed).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://example.com/robots.txt');
  });

  it('debería denegar acceso si robots.txt dice que no', async () => {
    const mockParser = { isAllowed: vi.fn().mockReturnValue(false) };
    vi.mocked(robotsParser).mockReturnValue(mockParser as any);
    
    vi.mocked(fetch).mockResolvedValue({
      text: vi.fn().mockResolvedValue('User-agent: *\nDisallow: /')
    } as any);

    const allowed = await checker.isAllowed('https://example.com/private');
    
    expect(allowed).toBe(false);
  });

  it('debería usar caché para el mismo origen', async () => {
    const mockParser = { isAllowed: vi.fn().mockReturnValue(true) };
    vi.mocked(robotsParser).mockReturnValue(mockParser as any);
    
    vi.mocked(fetch).mockResolvedValue({
      text: vi.fn().mockResolvedValue('')
    } as any);

    await checker.isAllowed('https://example.com/p1');
    await checker.isAllowed('https://example.com/p2');

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('debería permitir acceso en caso de error de red', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    
    const allowed = await checker.isAllowed('https://example.com/error');
    
    expect(allowed).toBe(true);
  });
});
