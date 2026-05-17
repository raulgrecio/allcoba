/**
 * Personal details — purely canonical (codes, ids, numbers).
 *
 * The HTML-with-links blob from sources is decomposed by the adapter into:
 *   - taxonomy ids (nationality, ethnic, hair, eyes, orientation)
 *   - numeric measurements (age, height, weight, bust/hip/waist)
 *   - meeting modality codes
 *   - language codes
 *
 * Localized labels are reconstructed in UI from `enum_labels` and
 * `entity_translations`. Free-text optional fields (drink/music/hobby)
 * are stored as `I18nText` when present.
 */

import type { Iso2Code, MeetingWith } from '../primitives/enums.js';
import type { I18nText } from '../primitives/i18n-text.js';
import type {
  Brand,
  EthnicId,
  EyeId,
  HairId,
  NationalityId,
  OrientationId,
} from '../primitives/identity.js';

export type PhoneE164 = Brand<string, 'PhoneE164'>;
export type Email = Brand<string, 'Email'>;

export const asPhoneE164 = (raw: string): PhoneE164 => raw as PhoneE164;
export const asEmail = (raw: string): Email => raw as Email;

export interface PersonalDetailsCanonical {
  readonly ageYears: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly bustCm?: number;
  readonly hipCm?: number;
  readonly waistCm?: number;
  readonly nationalityId?: NationalityId;
  readonly ethnicId?: EthnicId;
  readonly hairId?: HairId;
  readonly eyesId?: EyeId;
  readonly orientationId?: OrientationId;
  readonly spokenLanguageCodes: readonly Iso2Code[];
  readonly meetingWith: readonly MeetingWith[];
  /** Free-text — only set when the source provides it. */
  readonly drink?: I18nText;
  readonly music?: I18nText;
  readonly hobby?: I18nText;
}
