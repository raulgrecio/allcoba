import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { logger } from '@allcoba/kernel';

import { Container } from '../../di/container.js';

interface ProcessMediaRequestBody {
  imageBufferBase64?: string;
  imageUrl?: string;
  sourceName?: string;
}

export async function mediaRoutes(fastify: FastifyInstance) {
  const log = logger().child({ component: 'MediaRoutes' });
  const container = Container.getInstance();

  fastify.post(
    '/media/process',
    async (request: FastifyRequest<{ Body: ProcessMediaRequestBody }>, reply: FastifyReply) => {
      const { imageBufferBase64, imageUrl, sourceName } = request.body;

      if (!imageBufferBase64 && !imageUrl) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Either imageBufferBase64 or imageUrl must be provided.',
        });
      }

      let buffer: Buffer;

      try {
        if (imageUrl) {
          log.info({ imageUrl }, 'Downloading image from external URL directly in media-service');
          const response = await fetch(imageUrl);
          if (!response.ok) {
            log.error({ imageUrl, status: response.status }, 'Failed to download image URL');
            return reply.send({
              id: '',
              url: imageUrl,
              status: 'rejected',
              rejectReason: `Failed to download image from URL, HTTP Status: ${response.status}`,
              hashes: { sha256: '', phash: '' },
              metadata: { format: '', width: 0, height: 0, size: 0 },
              ocrText: '',
              stegoText: '',
              detected: { phones: [], emails: [], urls: [], brands: [] },
              flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
              adapterAssessment: {
                hasInjectedInfo: false,
                injectedInfoTypes: [],
                injectedInfoDetails: [],
              },
            });
          }
          buffer = Buffer.from(await response.arrayBuffer());
        } else {
          log.info('Processing internal image uploaded via base64');
          buffer = Buffer.from(imageBufferBase64!, 'base64');
        }

        const result = await container.runImagePipelineUseCase.execute(
          buffer,
          imageUrl || 'internal://upload',
          sourceName,
        );

        // Convert buffers to base64 strings for clean JSON serialization
        const responsePayload = {
          ...result,
          normalizedBufferBase64: result.normalizedBuffer
            ? result.normalizedBuffer.toString('base64')
            : undefined,
          thumbnailBufferBase64: result.thumbnailBuffer
            ? result.thumbnailBuffer.toString('base64')
            : undefined,
        };

        // Remove actual Buffers as they don't serialize nicely
        delete (responsePayload as any).normalizedBuffer;
        delete (responsePayload as any).thumbnailBuffer;

        return reply.send(responsePayload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({ error: msg }, 'Error processing image in controller');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: `Unexpected error during image processing: ${msg}`,
        });
      }
    },
  );
}
