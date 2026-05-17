import type { CrawlerPort } from '#application/ports/crawler.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { SourcePort } from '#application/ports/source.port.js';

import { DiscoveryAdapter } from './general/discovery.adapter.js';

type SourceDefinition = {
  pattern: RegExp;
  load: (crawler: CrawlerPort) => Promise<SourcePort>;
};

// ─── Real Estate ─────────────────────────────────────────────────────────────

const definitionsRealEstate: SourceDefinition[] = [
  {
    pattern: /idealista\.com/,
    load: async (c) => {
      const { IdealistaAdapter } = await import('./real-estate/idealista.adapter.js');
      return new IdealistaAdapter(c);
    },
  },
  {
    pattern: /fotocasa\.es/,
    load: async (c) => {
      const { FotocasaAdapter } = await import('./real-estate/fotocasa.adapter.js');
      return new FotocasaAdapter(c);
    },
  },
];

// ─── Motor ───────────────────────────────────────────────────────────────────

const definitionsMotor: SourceDefinition[] = [
  {
    pattern: /coches\.net/,
    load: async (c) => {
      const { CochesNetAdapter } = await import('./motor/coches-net.adapter.js');
      return new CochesNetAdapter(c);
    },
  },
];

// ─── General ─────────────────────────────────────────────────────────────────

const definitionsGeneral: SourceDefinition[] = [
  {
    pattern: /wallapop\.com/,
    load: async (c) => {
      const { WallapopAdapter } = await import('./general/wallapop.adapter.js');
      return new WallapopAdapter(c);
    },
  },
];

// ─── Dating ──────────────────────────────────────────────────────────────────

const definitionsDating: SourceDefinition[] = [
  {
    pattern: /ardienteplacer\.com/,
    load: async (c) => {
      const { ArdientePlacer } = await import('./dating/ardienteplacer.adapter.js');
      return new ArdientePlacer(c);
    },
  },
  {
    pattern: /bluemove\.es/,
    load: async (c) => {
      const { BluemoveAdapter } = await import('./dating/bluemove.adapter.js');
      return new BluemoveAdapter(c);
    },
  },
  {
    pattern: /chicasmalas\.es/,
    load: async (c) => {
      const { ChicasmalasAdapter } = await import('./dating/chicasmalas.adapter.js');
      return new ChicasmalasAdapter(c);
    },
  },
  {
    pattern: /citapasion\.com/,
    load: async (c) => {
      const { CitapasionAdapter } = await import('./dating/citapasion.adapter.js');
      return new CitapasionAdapter(c);
    },
  },
  {
    pattern: /destacamos\.net/,
    load: async (c) => {
      const { DestacamosAdapter } = await import('./dating/destacamos.adapter.js');
      return new DestacamosAdapter(c);
    },
  },
  {
    pattern: /erosguia\.com/,
    load: async (c) => {
      const { ErosguiaAdapter } = await import('./dating/erosguia.adapter.js');
      return new ErosguiaAdapter(c);
    },
  },
  {
    pattern: /escort-advisor\.xxx/,
    load: async (c) => {
      const { EscortAdvisorAdapter } = await import('./dating/escort-advisor.adapter.js');
      return new EscortAdvisorAdapter(c);
    },
  },
  {
    pattern: /eurogirlsescort\.(es|com)/,
    load: async (c) => {
      const { EuroGirlsEscortAdapter } = await import('./dating/eurogirlsescort.adapter.js');
      return new EuroGirlsEscortAdapter(c);
    },
  },
  {
    pattern: /gemidos\.tv/,
    load: async (c) => {
      const { GemidosAdapter } = await import('./dating/gemidos.adapter.js');
      return new GemidosAdapter(c);
    },
  },
  {
    pattern: /girlsbcn\.(net|com)/,
    load: async (c) => {
      const { GirlsBCNAdapter } = await import('./dating/girlsbcn.adapter.js');
      return new GirlsBCNAdapter(c);
    },
  },
  {
    pattern: /girlsmadrid\.com/,
    load: async (c) => {
      const { GirlsMadridAdapter } = await import('./dating/girlsmadrid.adapter.js');
      return new GirlsMadridAdapter(c);
    },
  },
  {
    pattern: /hotvalencia\.com/,
    load: async (c) => {
      const { HotValenciaAdapter } = await import('./dating/hotvalencia.adapter.js');
      return new HotValenciaAdapter(c);
    },
  },
  {
    pattern: /loquosex\.com/,
    load: async (c) => {
      const { LoquosexAdapter } = await import('./dating/loquosex.adapter.js');
      return new LoquosexAdapter(c);
    },
  },
  {
    pattern: /madrid69\.com/,
    load: async (c) => {
      const { Madrid69Adapter } = await import('./dating/madrid69.adapter.js');
      return new Madrid69Adapter(c);
    },
  },
  {
    pattern: /milescorts\.es/,
    load: async (c) => {
      const { MilescortsAdapter } = await import('./dating/milescorts.adapter.js');
      return new MilescortsAdapter(c);
    },
  },
  {
    pattern: /milpasiones\.com/,
    load: async (c) => {
      const { MilpasionesAdapter } = await import('./dating/milpasiones.adapter.js');
      return new MilpasionesAdapter(c);
    },
  },
  {
    pattern: /mislios\.com/,
    load: async (c) => {
      const { MisliosAdapter } = await import('./dating/mislios.adapter.js');
      return new MisliosAdapter(c);
    },
  },
  {
    pattern: /nuevoloquo\.(ch|com|es)/,
    load: async (c) => {
      const { NuevoloquoAdapter } = await import('./dating/nuevoloquo.adapter.js');
      return new NuevoloquoAdapter(c);
    },
  },
  {
    pattern: /nuevapasion\.com/,
    load: async (c) => {
      const { NuevapasionAdapter } = await import('./dating/nuevapasion.adapter.js');
      return new NuevapasionAdapter(c);
    },
  },
  {
    pattern: /topescortbabes\.com/,
    load: async (c) => {
      const { TopEscortBabesAdapter } = await import('./dating/topescortbabes.adapter.js');
      return new TopEscortBabesAdapter(c);
    },
  },
];

// ─── Registry ────────────────────────────────────────────────────────────────

const allDefinitions: SourceDefinition[] = [
  ...definitionsRealEstate,
  ...definitionsMotor,
  ...definitionsGeneral,
  ...definitionsDating,
];

export class SourceRegistry implements SourceResolverPort {
  private readonly discovery: DiscoveryAdapter;

  constructor(private readonly crawler: CrawlerPort) {
    this.discovery = new DiscoveryAdapter(crawler);
  }

  async resolve(url: string): Promise<SourcePort> {
    const definition = allDefinitions.find((d) => d.pattern.test(url));
    if (definition) return definition.load(this.crawler);
    return this.discovery;
  }
}
