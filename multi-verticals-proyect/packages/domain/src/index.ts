export {
  ConflictError,
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './errors/base.errors.js';
export type { CountryCode } from './shared/country-code.js';
export { isSupportedCountry, SUPPORTED_COUNTRIES } from './shared/country-code.js';
export {
  combine,
  fail,
  failOne,
  ok,
  type ValidationIssue,
  type ValidationResult,
} from './shared/validation-result.js';
export { Address, type AddressInput, type Coordinates } from './value-objects/address.vo.js';
export { City } from './value-objects/city.vo.js';
export { Email } from './value-objects/email.vo.js';
export { Id } from './value-objects/id.vo.js';
export { Phone } from './value-objects/phone.vo.js';
export { PostalCode } from './value-objects/postal-code.vo.js';
export { Street } from './value-objects/street.vo.js';
export { UserId } from './value-objects/user-id.vo.js';
export { ValueObject } from './value-objects/value-object.base.js';
