/**
 * Empty-input coverage sweep. Passes minimal HTML to every extractor so the
 * "field absent / falsy" branches get exercised without needing extra fixtures.
 * Also tests the corresponding mapper with the resulting empty payload so its
 * null-coalescing branches are covered too.
 */

import { describe, expect, it } from 'vitest';

import { extractEuroGirlsEscort } from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.extractor.js';
import { mapEuroGirlsEscort } from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.mapper.js';
import { extractLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.extractor.js';
import { mapLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.mapper.js';
import { extractGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.extractor.js';
import { mapGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.mapper.js';
import { extractDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.extractor.js';
import { mapDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.mapper.js';
import { extractGirlsMadrid } from '#infrastructure/adapters/sources/dating/girlsmadrid/girlsmadrid.extractor.js';
import { mapGirlsMadrid } from '#infrastructure/adapters/sources/dating/girlsmadrid/girlsmadrid.mapper.js';
import { extractArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.extractor.js';
import { mapArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.mapper.js';
import { extractMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.extractor.js';
import { mapMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.mapper.js';
import { extractProfileDataFromHtml } from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.extractor.js';
import { mapTopEscortBabes } from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.mapper.js';
import { extractCitapasion } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.extractor.js';
import { mapCitapasion } from '#infrastructure/adapters/sources/dating/citapasion/citapasion.mapper.js';
import { extractBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.extractor.js';
import { mapBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.mapper.js';
import { extractMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.extractor.js';
import { mapMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.mapper.js';
import { extractNuevoloquo } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.extractor.js';
import { mapNuevoloquo } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.mapper.js';
import { extractErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.extractor.js';
import { mapErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.mapper.js';
import { extractHotvalencia } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.extractor.js';
import { mapHotvalencia } from '#infrastructure/adapters/sources/dating/hotvalencia/hotvalencia.mapper.js';
import { extractNuevapasion } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.extractor.js';
import { mapNuevapasion } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.mapper.js';
import { extractMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.extractor.js';
import { mapMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.mapper.js';
import { extractWallapop } from '#infrastructure/adapters/sources/general/wallapop/wallapop.extractor.js';
import { mapWallapop } from '#infrastructure/adapters/sources/general/wallapop/wallapop.mapper.js';
import { extractIdealista } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.extractor.js';
import { mapIdealista } from '#infrastructure/adapters/sources/real-estate/idealista/idealista.mapper.js';
import { extractFotocasa } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.extractor.js';
import { mapFotocasa } from '#infrastructure/adapters/sources/real-estate/fotocasa/fotocasa.mapper.js';
import { extractGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.extractor.js';
import { mapGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.mapper.js';
import { extractEscortAdvisor } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.extractor.js';
import { mapEscortAdvisor } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.mapper.js';
import { extractCochesNet } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.extractor.js';
import { mapCochesNet } from '#infrastructure/adapters/sources/motor/coches-net/coches-net.mapper.js';

import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';

const EMPTY_HTML = '<html><body></body></html>';
const BASE = 'https://example.com/profile/1';
const resolver = new NullTaxonomyResolver();

describe('Empty-input extractor + mapper sweep — dating', () => {
  it('EuroGirlsEscort: extract + map empty HTML', async () => {
    const payload = extractEuroGirlsEscort(EMPTY_HTML);
    expect(payload).toBeDefined();
    const sp = await mapEuroGirlsEscort(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Loquosex: extract + map empty HTML', async () => {
    const payload = extractLoquosex(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapLoquosex(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('GirlsBcn: extract + map empty HTML', async () => {
    const payload = extractGirlsBcn(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapGirlsBcn(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Destacamos: extract + map empty HTML', async () => {
    const payload = extractDestacamos(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapDestacamos(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Girlsmadrid: extract + map empty HTML', async () => {
    const payload = extractGirlsMadrid(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapGirlsMadrid(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Ardienteplacer: extract + map empty HTML', async () => {
    const payload = extractArdienteplacer(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapArdienteplacer(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Milescorts: extract + map empty HTML', async () => {
    const payload = extractMilescorts(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapMilescorts(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('TopEscortBabes: extractProfileDataFromHtml returns null on empty HTML', () => {
    const payload = extractProfileDataFromHtml(EMPTY_HTML);
    // No JSON script in empty HTML → null (covers the null-return branch)
    expect(payload).toBeNull();
  });

  it('Citapasion: extract + map empty HTML', async () => {
    const payload = extractCitapasion(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapCitapasion(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Bluemove: extract + map empty HTML', async () => {
    const payload = extractBluemove(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapBluemove(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Nuevoloquo: extract + map empty HTML', async () => {
    const payload = extractNuevoloquo(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapNuevoloquo(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Gemidos: extract + map empty HTML', async () => {
    const payload = extractGemidos(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapGemidos(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('EscortAdvisor: extract + map empty HTML', async () => {
    const payload = extractEscortAdvisor(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapEscortAdvisor(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Erosguia: extract + map empty HTML', async () => {
    const payload = extractErosguia(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapErosguia(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Hotvalencia: extract + map empty HTML', async () => {
    const payload = extractHotvalencia(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapHotvalencia(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Milpasiones: extract + map empty HTML', async () => {
    const payload = extractMilpasiones(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapMilpasiones(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Nuevapasion: extract + map empty HTML', async () => {
    const payload = extractNuevapasion(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapNuevapasion(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });

  it('Madrid69: extract + map empty HTML', async () => {
    const payload = extractMadrid69(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapMadrid69(payload, resolver);
    expect(sp.vertical).toBe('dating');
  });
});

describe('Empty-input extractor + mapper sweep — general', () => {
  it('Wallapop: extract + map empty HTML', async () => {
    const payload = extractWallapop(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapWallapop(payload, resolver);
    expect(sp.vertical).toBe('general');
  });
});

describe('Empty-input extractor + mapper sweep — real-estate', () => {
  it('Idealista: extract + map empty HTML', async () => {
    const payload = extractIdealista(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapIdealista(payload, resolver);
    expect(sp.vertical).toBe('real-estate');
  });

  it('Fotocasa: extract + map empty HTML', async () => {
    const payload = extractFotocasa(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapFotocasa(payload, resolver);
    expect(sp.vertical).toBe('real-estate');
  });
});

describe('Empty-input extractor + mapper sweep — motor', () => {
  it('CochesNet: extract + map empty HTML', async () => {
    const payload = extractCochesNet(EMPTY_HTML, BASE);
    expect(payload).toBeDefined();
    const sp = await mapCochesNet(payload, resolver);
    expect(sp.vertical).toBe('motor');
  });
});
