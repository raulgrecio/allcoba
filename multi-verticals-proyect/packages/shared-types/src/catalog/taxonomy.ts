/**
 * Taxonomy references — closed catalogs that a profile can reference
 * (nationality, ethnic, hair, eyes, orientation, etc.).
 *
 * Same pattern as `geo.ts`: id + slug here, label per locale in
 * `entity_translations`. Free-text values that don't resolve to a slug
 * stay in `pending_resolution` and never enter the canonical record as
 * if they were a code.
 */

import type { Iso2Code } from '../primitives/enums.js';
import type {
  EthnicId,
  EyeId,
  HairId,
  NationalityId,
  OrientationId,
} from '../primitives/identity.js';

export interface NationalityRef {
  readonly id: NationalityId;
  /** `'spanish'`, `'venezuelan'`, `'brazilian'`. */
  readonly slug: string;
  /** ISO of the country this nationality belongs to, when 1:1. */
  readonly iso2Country?: Iso2Code;
}

export interface EthnicRef {
  readonly id: EthnicId;
  /** `'latin'`, `'european'`, `'asian'`, `'black'`, `'middle-eastern'`. */
  readonly slug: string;
}

export interface HairRef {
  readonly id: HairId;
  /** `'brown'`, `'blonde'`, `'black'`, … */
  readonly slug: string;
}

export interface EyeRef {
  readonly id: EyeId;
  /** `'brown'`, `'blue'`, `'green'`, … */
  readonly slug: string;
}

export interface OrientationRef {
  readonly id: OrientationId;
  /** `'hetero'`, `'bi'`, `'lesbian'`, … */
  readonly slug: string;
}

export const nationalityEquals = (a: NationalityRef, b: NationalityRef): boolean => a.id === b.id;
export const ethnicEquals = (a: EthnicRef, b: EthnicRef): boolean => a.id === b.id;
export const hairEquals = (a: HairRef, b: HairRef): boolean => a.id === b.id;
export const eyeEquals = (a: EyeRef, b: EyeRef): boolean => a.id === b.id;
export const orientationEquals = (a: OrientationRef, b: OrientationRef): boolean => a.id === b.id;
