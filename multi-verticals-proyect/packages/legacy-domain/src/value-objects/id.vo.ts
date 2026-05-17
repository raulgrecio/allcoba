import { ValueObject } from './value-object.base.js';

export abstract class Id extends ValueObject {
  protected constructor(public readonly value: string) {
    super();
  }

  equals(other: ValueObject): boolean {
    return (
      other instanceof Id &&
      other.constructor === this.constructor &&
      this.value === other.value
    );
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
