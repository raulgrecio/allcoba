# 16 · Pipeline de media

> Stack: **Cloudflare R2** (storage) + **sharp** (transformaciones) + **ONNX/NSFWJS** (moderación)
> Sin S3. Sin Cloudinary. Sin licencias. R2 tiene free tier de 10GB y 0 egress fees.

---

## Flujo de una imagen desde el upload hasta estar disponible

```
Usuario sube imagen
      │
      ▼
[1] Validación básica (API)
    - Formato: JPG, PNG, WebP (no GIF, no SVG)
    - Tamaño: máx según vertical (10-20 MB)
    - Dimensiones mínimas: según vertical
      │ Falla → error 422, no se almacena nada
      ▼
[2] Upload a R2 (ruta temporal)
    /{vertical}/temp/{uuid}.{ext}
      │
      ▼
[3] Job en cola: 'moderate-image'
    { imageId, providerId, vertical, tempPath }
      │
      ▼
[4] Worker descarga de R2 temp → modera (ver 05-ai-pipeline.md)
      │
      ├─ Aprobada
      │     ▼
      │  [5a] sharp: generar variantes
      │       - original WebP (calidad 85)
      │       - medium: 800px ancho, WebP
      │       - thumb: 400px ancho, WebP
      │       Mover de temp/ a /{vertical}/{provider_id}/{hash}/
      │     ▼
      │  [5b] Registrar en DB: media_assets
      │     ▼
      │  [5c] Notificar al provider: imagen aprobada
      │
      ├─ Requiere revisión humana
      │     ▼
      │  [6a] Mover a /{vertical}/review/{uuid}/
      │  [6b] Crear tarea en moderation_queue
      │  [6c] Notificar al provider: imagen en revisión
      │
      └─ Rechazada
            ▼
         [7a] Eliminar de R2 temp/
         [7b] Notificar al provider: imagen rechazada + motivo
```

---

## Estructura de paths en R2

```
/{vertical}/
  temp/                              ← imágenes pendientes de moderación
    {uuid}.{ext}
  {provider_id}/
    {image_hash}/
      original.webp                  ← imagen original convertida a WebP
      medium.webp                    ← 800px ancho
      thumb.webp                     ← 400px ancho
  review/                            ← imágenes en revisión humana
    {uuid}/
      original.{ext}
```

---

## Deduplicación perceptual (pHash)

```typescript
// workers/ai-pipeline/src/image-dedup.ts
import Jimp from 'jimp';

// pHash: genera un hash de 64 bits basado en el contenido visual
// Dos imágenes con pHash similar (distancia Hamming < 10) son duplicados
async function computePHash(imageBuffer: Buffer): Promise<string> {
  const img = await Jimp.read(imageBuffer);
  img.resize(8, 8).grayscale();

  const pixels = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) pixels.push(Jimp.intToRGBA(img.getPixelColor(x, y)).r);

  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  return pixels.map((p) => (p >= avg ? '1' : '0')).join('');
}

function hammingDistance(hash1: string, hash2: string): number {
  return hash1.split('').filter((b, i) => b !== hash2[i]).length;
}

const DUPLICATE_THRESHOLD = 10; // distancia Hamming máxima para considerar duplicado
```

---

## Tabla de media assets

```sql
CREATE TABLE media_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id),
  vertical     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|review
  phash        TEXT,                             -- hash perceptual para dedup
  r2_path      TEXT,                             -- path base en R2
  mime_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  width        INTEGER,
  height       INTEGER,
  rejection_reason TEXT,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_provider ON media_assets(provider_id, status);
CREATE INDEX idx_media_phash    ON media_assets(phash) WHERE status = 'approved';
```
