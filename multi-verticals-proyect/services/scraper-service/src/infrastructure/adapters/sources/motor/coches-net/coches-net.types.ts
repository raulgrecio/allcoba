import type {
  BodyType,
  EnvironmentalLabel,
  FuelType,
  Transmission,
  VehicleCondition,
} from '@allcoba/shared-types';

export interface CochesNetPhoto {
  readonly position: number;
  readonly url: string;
}

export interface CochesNetPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly description?: string;

  readonly priceAmount: number;
  readonly make?: string;
  readonly model?: string;
  readonly version?: string;
  readonly year?: number;
  readonly kilometers?: number;
  readonly fuelType?: FuelType;
  readonly transmission?: Transmission;
  readonly bodyType?: BodyType;
  readonly color?: string;
  readonly environmentalLabel?: EnvironmentalLabel;
  readonly condition?: VehicleCondition;

  readonly province?: string;

  readonly photos: readonly CochesNetPhoto[];

  readonly isProfessional: boolean;
  readonly warrantyMonths?: number;
  readonly hasOfficialWarranty: boolean;
}
