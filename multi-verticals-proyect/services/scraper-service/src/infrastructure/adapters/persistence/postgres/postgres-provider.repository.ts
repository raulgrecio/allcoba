import { db } from './db-client.js';
import { DrizzleProviderRepository } from './drizzle-provider.repository.js';

export class PostgresProviderRepository extends DrizzleProviderRepository {
  constructor() {
    super(db);
  }
}
