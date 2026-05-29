import { logger } from '@allcoba/kernel';

import { asConfidence } from '#domain/canonical/confidence.js';
import { PostgresProviderRepository } from '#infrastructure/adapters/persistence/postgres/postgres-provider.repository.js';

async function testConnection() {
  logger().info('Testing PostgreSQL Connection...');

  try {
    const repo = new PostgresProviderRepository();
    const id = crypto.randomUUID() as Parameters<typeof repo.create>[0]['id'];

    const now = new Date().toISOString();
    const provider = {
      id,
      vertical: 'general' as const,
      nickname: 'Test Provider',
      active: true,
      humanVerified: false,
      badges: { verified: false, trans: false, vip: false, pornstar: false },
      verificationStatus: 'pending_review' as const,
      meetingPlaces: { incall: false, outcall: false },
      contactOptions: [],
      personalDetails: { ageYears: 0, spokenLanguageCodes: [], meetingWith: [] },
      prices: [],
      photos: [],
      links: {},
      otherPlatforms: [],
      reviewsEnabled: false,
      reviewsCount: 0,
      reviewsRating: 0,
      reviews: [],
      tours: [],
      createdAt: now,
      updatedAt: now,
      externalRefs: [],
      signals: [],
      confidence: asConfidence(0.5),
      images: [],
      attributes: {},
      metadata: { test: true },
      lastScrapedAt: now,
    };

    logger().info({ id }, 'Attempting to create test provider...');
    await repo.create(provider);
    logger().info('Provider created successfully.');

    logger().info('Attempting to find provider by ID...');
    const found = await repo.findById(id);

    if (found?.id === id) {
      logger().info('Provider retrieved successfully and matches!');
    } else {
      logger().error('Provider not found or mismatch!');
      process.exit(1);
    }

    logger().info('PostgreSQL Repository is working correctly!');
    process.exit(0);
  } catch (error) {
    logger().error({ error }, 'Error during database test');
    process.exit(1);
  }
}

testConnection();
