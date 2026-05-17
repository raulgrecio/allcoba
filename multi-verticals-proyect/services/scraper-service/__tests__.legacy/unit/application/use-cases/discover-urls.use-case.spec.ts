import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';

describe('Unit: DiscoverUrlsUseCase', () => {
  let mockSource: any;
  let mockSourceResolver: any;
  let mockScrapeUrlUseCase: any;
  let mockRepository: any;
  let useCase: DiscoverUrlsUseCase;

  beforeEach(() => {
    // Evitar las pausas aleatorias (de 2 a 4 segundos) en los tests
    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => cb() as any);
    mockSource = {
      identifier: 'test-source',
      fetchHtml: vi.fn(),
      extractProfileLinks: vi.fn(),
      extractNextPageUrl: vi.fn(),
    };

    mockSourceResolver = {
      resolve: vi.fn().mockResolvedValue(mockSource),
    };

    mockScrapeUrlUseCase = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as ScrapeUrlUseCase;

    mockRepository = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new DiscoverUrlsUseCase(mockSourceResolver, mockRepository, mockScrapeUrlUseCase);
  });

  it('procesa una lista y extrae perfiles hasta alcanzar el límite', async () => {
    mockSource.fetchHtml.mockResolvedValue({ html: '<html>listado1</html>' });

    // La primera página devuelve 2 links
    mockSource.extractProfileLinks.mockReturnValueOnce([
      'https://example.com/perfil/1',
      'https://example.com/perfil/2',
    ]);

    // No hay página siguiente
    mockSource.extractNextPageUrl.mockReturnValueOnce(undefined);

    await useCase.execute('https://example.com/listado', 5);

    expect(mockSourceResolver.resolve).toHaveBeenCalledWith('https://example.com/listado');
    expect(mockSource.fetchHtml).toHaveBeenCalledTimes(1);
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledTimes(2);
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/perfil/1');
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/perfil/2');
  });

  it('respeta el parámetro skip ignorando los primeros N perfiles', async () => {
    mockSource.fetchHtml.mockResolvedValue({ html: '<html>listado1</html>' });

    // Devuelve 3 links
    mockSource.extractProfileLinks.mockReturnValueOnce([
      'https://example.com/perfil/1',
      'https://example.com/perfil/2',
      'https://example.com/perfil/3',
    ]);
    mockSource.extractNextPageUrl.mockReturnValueOnce(undefined);

    // Limit = 5, Skip = 2
    await useCase.execute('https://example.com/listado', 5, 2);

    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledTimes(1); // Solo procesa el tercero
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/perfil/3');
  });

  it('navega por la paginación hasta agotar el límite o no haber más links', async () => {
    mockSource.fetchHtml
      .mockResolvedValueOnce({ html: '<html>pagina 1</html>' })
      .mockResolvedValueOnce({ html: '<html>pagina 2</html>' });

    // Página 1 devuelve 2 links y URL a página 2
    mockSource.extractProfileLinks.mockReturnValueOnce([
      'https://example.com/p1/a',
      'https://example.com/p1/b',
    ]);
    mockSource.extractNextPageUrl.mockReturnValueOnce('https://example.com/listado?page=2');

    // Página 2 devuelve 2 links y no hay más páginas
    mockSource.extractProfileLinks.mockReturnValueOnce([
      'https://example.com/p2/c',
      'https://example.com/p2/d',
    ]);
    mockSource.extractNextPageUrl.mockReturnValueOnce(undefined);

    // Límite de 3 perfiles
    await useCase.execute('https://example.com/listado', 3);

    expect(mockSource.fetchHtml).toHaveBeenCalledTimes(2); // Entró a la p1 y p2
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledTimes(3); // Solo bajó 3 a pesar de haber 4
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/p1/a');
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/p1/b');
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledWith('https://example.com/p2/c');
    expect(mockScrapeUrlUseCase.execute).not.toHaveBeenCalledWith('https://example.com/p2/d');
  });

  it('se detiene si una página devuelve 0 perfiles nuevos', async () => {
    mockSource.fetchHtml.mockResolvedValue({ html: '<html>misma pagina</html>' });

    // Página 1 devuelve links
    mockSource.extractProfileLinks.mockReturnValueOnce(['https://example.com/p1']);
    mockSource.extractNextPageUrl.mockReturnValueOnce('https://example.com/listado?page=2');

    // Página 2 devuelve LOS MISMOS links (simulando que la paginación falló y devolvió la p1)
    mockSource.extractProfileLinks.mockReturnValueOnce(['https://example.com/p1']);

    await useCase.execute('https://example.com/listado', 10);

    expect(mockSource.fetchHtml).toHaveBeenCalledTimes(2);
    // Solo procesó el primer link, al ver que la página 2 no dio links nuevos (uniqueLinks === 0), salió del bucle
    expect(mockScrapeUrlUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
