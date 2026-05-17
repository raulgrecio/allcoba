import { ProviderId } from '@allcoba/domain';
import { logger } from '@allcoba/kernel';

import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { PostgresProviderRepository } from '#infrastructure/adapters/persistence/postgres-provider.repository.js';

async function testConnection() {
  logger().info('🚀 Testing PostgreSQL Connection...');

  try {
    const repo = new PostgresProviderRepository();
    const id = ProviderId.generate();

    const provider = ScrapedProvider.create({
      id,
      displayName: 'Test Provider',
      vertical: Vertical.GENERAL,
      confidenceScore: ConfidenceScore.high(),
      metadata: { test: true },
    });

    logger().info(`📝 Attempting to create provider with ID: ${id.value} in vertical GENERAL...`);
    await repo.create(provider);
    logger().info('✅ Provider created successfully.');

    logger().info(`🔍 Attempting to find provider by ID...`);
    const found = await repo.findById(id);

    if (found && found.id.value === id.value) {
      logger().info('✅ Provider retrieved successfully and matches!');
      logger().info(`DisplayName: ${found.displayName}`);
    } else {
      logger().error('❌ Provider not found or mismatch!');
      process.exit(1);
    }

    logger().info('🎉 PostgreSQL Repository is working correctly!');
    process.exit(0);
  } catch (error) {
    logger().error({ error }, `❌ Error during database test`);
    // Print more details about the error
    if (error && typeof error === 'object' && 'code' in error) {
      logger().error(`Error Code: ${(error as any).code}`);
    }
    process.exit(1);
  }
}

testConnection();
