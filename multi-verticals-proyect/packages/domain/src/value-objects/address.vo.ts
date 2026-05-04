import type { CountryCode } from '../shared/country-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { combine, failOne, ok } from '../shared/validation-result.js';
import { City } from './city.vo.js';
import { PostalCode } from './postal-code.vo.js';
import { Street } from './street.vo.js';
import { ValueObject } from './value-object.base.js';

export type Coordinates = { lat: number; lng: number };

export type AddressInput = {
  street: string;
  city: string;
  postalCode: string;
  country: CountryCode;
  coordinates?: Coordinates;
};

export class Address extends ValueObject {
  private constructor(
    public readonly street: Street,
    public readonly city: City,
    public readonly postalCode: PostalCode,
    public readonly country: CountryCode,
    public readonly coordinates?: Coordinates,
  ) {
    super();
  }

  static create(input: AddressInput): ValidationResult<Address> {
    const parts = combine([
      Street.create(input.street),
      City.create(input.city),
      PostalCode.create(input.postalCode, input.country),
    ] as const);

    if (!parts.success) return parts;

    const [street, city, postalCode] = parts.value;

    if (input.coordinates) {
      const { lat, lng } = input.coordinates;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return failOne('COORDINATES_OUT_OF_RANGE', 'Invalid lat/lng', ['coordinates']);
      }
    }

    return ok(new Address(street, city, postalCode, input.country, input.coordinates));
  }

  formatted(): string {
    return `${this.street.toString()}, ${this.postalCode.toString()} ${this.city.toString()}, ${this.country}`;
  }

  equals(other: ValueObject): boolean {
    return (
      other instanceof Address &&
      this.street.equals(other.street) &&
      this.city.equals(other.city) &&
      this.postalCode.equals(other.postalCode) &&
      this.country === other.country
    );
  }

  toJSON() {
    return {
      street: this.street.toString(),
      city: this.city.toString(),
      postalCode: this.postalCode.toString(),
      country: this.country,
      coordinates: this.coordinates,
    };
  }
}
