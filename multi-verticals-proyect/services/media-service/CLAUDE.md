# CLAUDE.md — services/media-service

> Upload, moderación IA y almacenamiento de imágenes.
> Puerto: 3002. Dos colas con prioridades distintas (Presenter vs scraper).
> Contiene los modelos IA de moderación y análisis de conversaciones.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este servicio

Servicio Node.js con dos responsabilidades:

1. **Moderación de imágenes** — aprueba o rechaza imágenes usando NSFWJS +
   face-api.js + clasificador ONNX por vertical. Dos prioridades: Presenters
   (alta, el usuario espera) y scraper (baja, batch).

2. **Análisis de conversaciones** — extrae etiquetas semánticas del comportamiento
   del cliente usando Llama 3.2 3B. Opera sobre texto descifrado en memoria —
   nunca persiste datos en claro.

3. **Generación de embeddings** — all-MiniLM-L6-v2 para pgvector.

**No hace llamadas a red durante la inferencia — todos los modelos corren localmente.**

---

## Estructura de carpetas

```text
services/media-service/
├── src/
│   ├── index.ts                       ← entry point: carga modelos + suscribe a colas
│   ├── image-moderator.ts             ← NSFWJS + face-api + ONNX
│   ├── conversation-analyzer.ts       ← Llama 3.2 3B: etiquetado de conversaciones
│   ├── embedding-generator.ts         ← all-MiniLM-L6-v2: embeddings para pgvector
│   ├── http/
│   │   └── upload.routes.ts           ← POST /media/upload (recibe imagen del gateway)
│   ├── jobs/
│   │   ├── moderate-presenter-image.ts ← prioridad 10 — Presenter sube foto
│   │   ├── moderate-scraper-image.ts   ← prioridad 1 — batch del scraper
│   │   ├── analyze-conversation.ts     ← etiquetado IA de conversaciones
│   │   ├── generate-embedding.ts       ← embeddings para pgvector
│   │   └── extract-services-text.ts   ← extrae servicios de texto libre (para scraper)
│   ├── prompts/
│   │   ├── base.ts                    ← prompt base con defensa anti-injection
│   │   └── by-vertical/
│   │       ├── massage.ts
│   │       ├── car.ts
│   │       └── dating.ts
│   ├── storage/
│   │   └── r2-adapter.ts             ← upload/download a Cloudflare R2
│   └── utils/
│       ├── sanitize-input.ts          ← limpieza de texto antes del modelo
│       └── phash.ts                   ← hash perceptual para deduplicación
└── models/                            ← NO en git — descargar con setup:models
    ├── llama-3.2-3b.Q4_K_M.gguf      ← ~2GB
    ├── nsfw/                          ← NSFWJS MobileNet (~15MB)
    ├── face-api/                      ← SSD MobileNet (~6MB)
    └── minilm/                        ← all-MiniLM-L6-v2 ONNX (~80MB)
```

---

## Dos colas de moderación con prioridades distintas

```typescript
// Prioridad 10 — Presenter sube foto — el usuario espera resultado en minutos
'moderate-presenter-image': { imageId, userId, vertical, tempR2Path }

// Prioridad 1 — Scraper — batch, sin urgencia, puede tardar horas
'moderate-scraper-image':   { imageId, providerId, vertical, sourceUrl }
```

---

## Pipeline de moderación de imágenes

```text
imagen recibida (upload o URL del scraper)
  → validación (formato JPG/PNG/WebP, tamaño, dimensiones mínimas)
  → subida a R2/temp/
  → job en cola (prioridad según origen)
  → worker descarga de R2/temp/
  → [1] NSFWJS: score de contenido explícito
        > 0.7  → rechazada automáticamente
        0.3-0.7 → revisión humana (fase futura)
        < 0.3  → continuar
  → [2] face-api: caras según regla de la vertical
        dating:     cara opcional
        masajes:    cara PROHIBIDA
        automoción: cara PROHIBIDA
  → [3] clasificador ONNX: imagen en contexto correcto de la vertical
  → [4] pHash: deduplicación perceptual
  → aprobada → sharp genera variantes WebP → mover a ruta definitiva en R2
  → publicar job 'send-notification' con resultado al Presenter
```

---

## Reglas críticas de seguridad

### El texto en claro NUNCA toca disco

```typescript
// ✅ CORRECTO — todo en memoria, GC limpia al salir del scope
async function processConversation(
  encryptedContent: Buffer,
  dek: Uint8Array
) {
  const plaintext = await decryptField(encryptedContent, dek)  // en memoria
  const tags      = await analyzer.analyze(plaintext)           // en memoria
  return tags
  // plaintext se GC al salir de la función
}

// ❌ INCORRECTO — escribe texto descifrado a disco
import { writeFileSync } from 'fs'
writeFileSync('/tmp/conversation.txt', plaintext)
```

### Los modelos NO hacen llamadas a red durante inferencia

```typescript
// ✅ CORRECTO — modelo local
const llama = await getLlama()
const model = await llama.loadModel({
  modelPath: './models/llama-3.2-3b.Q4_K_M.gguf'
})

// ❌ INCORRECTO — API externa
const response = await openai.chat.completions.create({ ... })
```

### Inputs siempre sanitizados y truncados antes del modelo

```typescript
const safe      = sanitizeInput(text)       // elimina tokens de control
const truncated = safe.slice(0, 2000)       // límite duro — nunca negociable
```

### Output del modelo siempre validado con Zod

```typescript
const result = CustomerTagsSchema.safeParse(parsed)
if (!result.success) {
  logger.warn({ conversationId }, 'ai.output.invalid — discarded')
  return null  // nunca guardar output inválido
}
return result.data
```

---

## Ciclo de vida del servicio

```typescript
// src/index.ts

async function main() {
  logger.info('Loading AI models...')

  // Modelos cargados UNA SOLA VEZ al arrancar (10-30 segundos — normal)
  await analyzer.initialize(process.env.AI_MODEL_PATH!)
  await moderator.initialize()
  await embeddingGenerator.initialize()

  logger.info('Models loaded. Starting HTTP server and subscribing to queues...')

  // Servidor HTTP para recibir uploads directos
  await fastify.listen({ port: Number(process.env.PORT ?? 3002), host: '0.0.0.0' })

  // Colas con prioridades distintas
  await queue.work('moderate-presenter-image', { teamSize: 4 }, moderatePresenterImageJob)
  await queue.work('moderate-scraper-image',   { teamSize: 4 }, moderateScraperImageJob)
  await queue.work('analyze-conversation',     { teamSize: 2 }, analyzeConversationJob)
  await queue.work('generate-embedding',       { teamSize: 1 }, generateEmbeddingJob)
  await queue.work('extract-services-text',    { teamSize: 2 }, extractServicesTextJob)

  logger.info('media-service ready')

  process.on('SIGTERM', async () => {
    await queue.stop()
    await fastify.close()
    process.exit(0)
  })
}
```

---

## Modelos IA — tabla de referencia

| Modelo | Uso | Tamaño | Licencia | RAM |
| -------- | --- | ------ | -------- | --- |
| Llama 3.2 3B Q4_K_M | Análisis conversaciones + extracción texto | ~2GB | Meta community | 3GB |
| NSFWJS MobileNet | Detección contenido explícito | ~15MB | MIT | <1GB |
| face-api SSD MobileNet | Detección de caras | ~6MB | MIT | <1GB |
| all-MiniLM-L6-v2 ONNX | Embeddings semánticos (pgvector) | ~80MB | Apache 2.0 | <1GB |

### RAM total recomendada: 6GB

---

## Script de descarga de modelos

```bash
#!/bin/bash
# services/media-service/scripts/download-models.sh

mkdir -p models/nsfw models/face-api models/minilm

# Llama 3.2 3B Q4_K_M
wget -O models/llama-3.2-3b.Q4_K_M.gguf \
  https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf

# all-MiniLM-L6-v2 ONNX (Apache 2.0)
wget -O models/minilm/model.onnx \
  https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx

echo "Models downloaded successfully"
```

---

## Tablas en schema `media`

```sql
media.assets    -- id, user_id, vertical, status, phash, r2_path, mime_type, width, height
media.jobs      -- id, asset_id, priority, status, attempts, error, created_at
```

---

## Variables de entorno requeridas

```env
PORT=3002
NODE_ENV=production
DATABASE_URL=              # schema media + lectura en shared
GATEWAY_INTERNAL_URL=http://api-gateway:3000  # para obtener DEK al analizar conversaciones

# Modelos IA
AI_MODEL_PATH=./models/llama-3.2-3b.Q4_K_M.gguf
EMBEDDING_MODEL_PATH=./models/minilm/model.onnx
NSFW_MODEL_PATH=./models/nsfw/
FACE_API_MODEL_PATH=./models/face-api/

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=             # URL pública para imágenes aprobadas

MAX_IMAGE_SIZE_MB=20
LOG_LEVEL=info
SERVICE_NAME=media-service
```

---

## Comandos habituales

```bash
# Setup inicial (descargar modelos — ejecutar una vez)
pnpm setup:models

# Desarrollo
pnpm dev

# Build
pnpm build

# Tests unitarios (modelos mockeados)
pnpm test:unit

# Tests de integración (Testcontainers)
pnpm test:integration

# Test de un job específico en local
pnpm test:job -- --job=analyze-conversation --fixture=fixtures/conversation.json
pnpm test:job -- --job=moderate-presenter-image --fixture=fixtures/test-image.jpg
```
