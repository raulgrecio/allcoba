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

      try {
        let result;

        if (imageUrl) {
          result = await container.processScraperImageUseCase.execute({
            imageUrl,
            sourceName,
          });
        } else {
          log.info('Processing internal image uploaded via base64');
          const buffer = Buffer.from(imageBufferBase64!, 'base64');
          result = await container.processInternalUploadUseCase.execute({
            imageBuffer: buffer,
            sourceName,
          });
        }

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
        delete (responsePayload as Record<string, unknown>).normalizedBuffer;
        delete (responsePayload as Record<string, unknown>).thumbnailBuffer;

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
