import type { CrawlerPort } from '#application/ports/crawler.port.js';
import type {
  ResolvedSource,
  SourceResolverPort,
} from '#application/ports/source-resolver.port.js';

import { DiscoveryAdapter } from './general/discovery.adapter.js';

type SourceDefinition = {
  pattern: RegExp;
  load: (crawler: CrawlerPort) => Promise<ResolvedSource>;
};

// ─── Real Estate (v2 pipeline wrappers) ──────────────────────────────────────

const definitionsRealEstate: SourceDefinition[] = [
  {
    pattern: /idealista\.com/,
    load: async () => {
      const { IdealistaPipeline } = await import('./real-estate/idealista/idealista.pipeline.js');
      return new IdealistaPipeline();
    },
  },
  {
    pattern: /fotocasa\.es/,
    load: async () => {
      const { FotocasaPipeline } = await import('./real-estate/fotocasa/fotocasa.pipeline.js');
      return new FotocasaPipeline();
    },
  },
];

// ─── Motor (v2 pipeline wrappers) ────────────────────────────────────────────

const definitionsMotor: SourceDefinition[] = [
  {
    pattern: /coches\.net/,
    load: async () => {
      const { CochesNetPipeline } = await import('./motor/coches-net/coches-net.pipeline.js');
      return new CochesNetPipeline();
    },
  },
];

// ─── General (v2 pipeline wrappers) ──────────────────────────────────────────

const definitionsGeneral: SourceDefinition[] = [
  {
    pattern: /wallapop\.com/,
    load: async () => {
      const { WallapopPipeline } = await import('./general/wallapop/wallapop.pipeline.js');
      return new WallapopPipeline();
    },
  },
];

// ─── Dating (v2 pipeline wrappers) ───────────────────────────────────────────

const definitionsDating: SourceDefinition[] = [
  {
    pattern: /ardienteplacer\.com/,
    load: async () => {
      const { ArdienteplacerPipeline } = await import(
        './dating/ardienteplacer/ardienteplacer.pipeline.js'
      );
      return new ArdienteplacerPipeline();
    },
  },
  {
    pattern: /bluemove\.es/,
    load: async () => {
      const { BluemovePipeline } = await import('./dating/bluemove/bluemove.pipeline.js');
      return new BluemovePipeline();
    },
  },
  {
    pattern: /chicasmalas\.es/,
    load: async () => {
      const { ChicasmalasPipeline } = await import('./dating/chicasmalas/chicasmalas.pipeline.js');
      return new ChicasmalasPipeline();
    },
  },
  {
    pattern: /citapasion\.com/,
    load: async () => {
      const { CitapasionPipeline } = await import('./dating/citapasion/citapasion.pipeline.js');
      return new CitapasionPipeline();
    },
  },
  {
    pattern: /destacamos\.(net|com)/,
    load: async () => {
      const { DestacamosPipeline } = await import('./dating/destacamos/destacamos.pipeline.js');
      return new DestacamosPipeline();
    },
  },
  {
    pattern: /erosguia\.com/,
    load: async () => {
      const { ErosguiaPipeline } = await import('./dating/erosguia/erosguia.pipeline.js');
      return new ErosguiaPipeline();
    },
  },
  {
    pattern: /escort-advisor\.xxx/,
    load: async () => {
      const { EscortAdvisorPipeline } = await import(
        './dating/escort-advisor/escort-advisor.pipeline.js'
      );
      return new EscortAdvisorPipeline();
    },
  },
  {
    pattern: /eurogirlsescort\.(es|com)/,
    load: async () => {
      const { EuroGirlsEscortPipeline } = await import(
        './dating/eurogirlsescort/eurogirlsescort.pipeline.js'
      );
      return new EuroGirlsEscortPipeline();
    },
  },
  {
    pattern: /gemidos\.tv/,
    load: async () => {
      const { GemidosPipeline } = await import('./dating/gemidos/gemidos.pipeline.js');
      return new GemidosPipeline();
    },
  },
  {
    pattern: /girlsbcn\.(net|com)/,
    load: async () => {
      const { GirlsBcnPipeline } = await import('./dating/girlsbcn/girlsbcn.pipeline.js');
      return new GirlsBcnPipeline();
    },
  },
  {
    pattern: /girlsmadrid\.com/,
    load: async () => {
      const { GirlsmadridPipeline } = await import('./dating/girlsmadrid/girlsmadrid.pipeline.js');
      return new GirlsmadridPipeline();
    },
  },
  {
    pattern: /hotvalencia\.com/,
    load: async () => {
      const { HotvalenciaPipeline } = await import('./dating/hotvalencia/hotvalencia.pipeline.js');
      return new HotvalenciaPipeline();
    },
  },
  {
    pattern: /loquosex\.com/,
    load: async () => {
      const { LoquosexPipeline } = await import('./dating/loquosex/loquosex.pipeline.js');
      return new LoquosexPipeline();
    },
  },
  {
    pattern: /madrid69\.com/,
    load: async () => {
      const { Madrid69Pipeline } = await import('./dating/madrid69/madrid69.pipeline.js');
      return new Madrid69Pipeline();
    },
  },
  {
    pattern: /milescorts\.es/,
    load: async () => {
      const { MilescortsPipeline } = await import('./dating/milescorts/milescorts.pipeline.js');
      return new MilescortsPipeline();
    },
  },
  {
    pattern: /milpasiones\.com/,
    load: async () => {
      const { MilpasionesPipeline } = await import('./dating/milpasiones/milpasiones.pipeline.js');
      return new MilpasionesPipeline();
    },
  },
  {
    pattern: /mislios\.com/,
    load: async () => {
      const { MisliosPipeline } = await import('./dating/mislios/mislios.pipeline.js');
      return new MisliosPipeline();
    },
  },
  {
    pattern: /nuevoloquo\.(ch|com|es)/,
    load: async () => {
      const { NuevoloquoPipeline } = await import('./dating/nuevoloquo/nuevoloquo.pipeline.js');
      return new NuevoloquoPipeline();
    },
  },
  {
    pattern: /nuevapasion\.com/,
    load: async () => {
      const { NuevapasionPipeline } = await import('./dating/nuevapasion/nuevapasion.pipeline.js');
      return new NuevapasionPipeline();
    },
  },
  {
    pattern: /topescortbabes\.com/,
    load: async () => {
      const { TopEscortBabesPipeline } = await import(
        './dating/topescortbabes/topescortbabes.pipeline.js'
      );
      return new TopEscortBabesPipeline();
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

  async resolve(url: string): Promise<ResolvedSource> {
    const definition = allDefinitions.find((d) => d.pattern.test(url));
    if (definition) return definition.load(this.crawler);
    return this.discovery;
  }
}
