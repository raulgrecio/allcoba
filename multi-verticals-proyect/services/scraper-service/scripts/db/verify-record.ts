import postgres from 'postgres';

import { logger } from '@allcoba/kernel';

import { config } from '#infrastructure/config/env.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

async function verify() {
  const sql = postgres(config.databaseUrl!);
  const [_node, _script, vertical, id] = process.argv;

  if (!vertical || !id) {
    logger().error('Uso: npx tsx scripts/db/verify-record.ts <VERTICAL> <ID>');
    process.exit(1);
  }

  const tableName = `scraped_${vertical.toLowerCase()}`;

  try {
    logger().info({ tableName, id }, '🔍 Buscando registro...');

    // Consulta dinámica segura usando postgres-js
    const result = await sql`
      SELECT *
      FROM ${sql(tableName)}
      WHERE id = ${id}
    `;

    if (result.length === 0) {
      logger().warn('❌ No se encontró ningún registro con ese ID');
    } else {
      // Usamos JSON.stringify para ver el contenido completo de los JSONB
      logger().info(
        {
          record: result[0],
        },
        '✅ Registro encontrado:',
      );
    }
  } catch (error: unknown) {
    logger().error({ error }, '❌ Error durante la verificación:');
  } finally {
    await sql.end();
    process.exit(0);
  }
}

verify();
