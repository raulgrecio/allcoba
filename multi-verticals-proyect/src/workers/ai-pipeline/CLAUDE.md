# CLAUDE.md — workers/ai-pipeline

> Contexto específico del worker de IA.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este proceso

Worker Node.js que ejecuta dos tareas independientes:

1. **Análisis de conversaciones** — extrae etiquetas semánticas del comportamiento del cliente usando Llama 3.2 3B. Opera sobre texto descifrado en memoria — nunca persiste datos en claro.
2. **Moderación de imágenes** — aprueba o rechaza imágenes subidas por providers usando NSFWJS + face-api.js + clasificador ONNX por vertical.

Este proceso **nunca expone un puerto HTTP**. Se comunica exclusivamente a través de la cola de jobs en PostgreSQL (pg-boss). No hace llamadas a red durante la inferencia — todos los modelos corren localmente.

---

## Estructura de carpetas

```
workers/ai-pipeline/
├── src/
│   ├── index.ts                      ← entry point: carga modelos + suscribe a colas
│   ├── conversation-analyzer.ts      ← Llama 3.2 3B: etiquetado de conversaciones
│   ├── image-moderator.ts            ← NSFWJS + face-api: moderación de imágenes
│   ├── embedding-generator.ts        ← all-MiniLM-L6-v2: embeddings para pgvector
│   ├── jobs/
│   │   ├── analyze-conversation.ts   ← handler del job 'analyze-conversation'
│   │   ├── moderate-image.ts         ← handler del job 'moderate-image'
│   │   └── generate-embedding.ts     ← handler del job 'generate-embedding'
│   ├── prompts/
│   │   ├── base.ts                   ← prompt base con defensa anti-injection
│   │   └── by-vertical/
│   │       ├── hairdresser.ts
│   │       ├── real-estate.ts
│   │       └── car.ts
│   └── utils/
│       ├── sanitize-input.ts         ← limpieza de texto antes del modelo
│       └── phash.ts                  ← hash perceptual para deduplicación
└── models/                           ← modelos descargados (NO en git — .gitignore)
    ├── llama-3.2-3b.Q4_K_M.gguf     ← ~2GB — descargar con script de setup
    ├── nsfw/                         ← modelo NSFWJS
    ├── face-api/                     ← modelo face-api.js
    └── minilm/                       ← all-MiniLM-L6-v2 ONNX
```

---

## Reglas críticas de seguridad

### El texto en claro NUNCA toca disco

```typescript
// ✅ CORRECTO — todo en memoria, el GC limpia al salir del scope
async function processConversation(encryptedContent: Buffer, dek: Uint8Array) {
  const plaintext = await decryptField(encryptedContent, dek)  // en memoria
  const tags = await analyzer.analyze(plaintext)                // en memoria
  // plaintext es recolectado por GC al salir de la función
  return tags
}

// ❌ INCORRECTO — escribe el texto descifrado a disco
import { writeFileSync } from 'fs'
writeFileSync('/tmp/conversation.txt', plaintext)
```

### El modelo no hace llamadas a red

```typescript
// ✅ CORRECTO — modelo local, sin red
const llama = await getLlama()
const model = await llama.loadModel({ modelPath: './models/llama-3.2-3b.Q4_K_M.gguf' })

// ❌ INCORRECTO — llamada a API externa
const response = await openai.chat.completions.create({ ... })
```

### Inputs siempre sanitizados y truncados

```typescript
// ANTES de pasar cualquier texto al modelo:
const safe = sanitizeInput(text)   // elimina tokens de control del modelo
const truncated = safe.slice(0, 2000)  // límite duro — nunca negociable
```

### Output siempre validado con Zod

```typescript
// Si el output no pasa el schema, se descarta — nunca se guarda output inválido
const result = CustomerTagsSchema.safeParse(parsed)
if (!result.success) {
  logger.warn({ conversationId }, 'ai.output.invalid — discarded')
  return null
}
return result.data
```

---

## Ciclo de vida del worker

```typescript
// src/index.ts

async function main() {
  logger.info('Loading AI models...')

  // Los modelos se cargan UNA SOLA VEZ al arrancar
  // La carga puede tardar 10-30 segundos — es normal
  await analyzer.initialize(process.env.AI_MODEL_PATH!)
  await moderator.initialize()
  await embeddingGenerator.initialize()

  logger.info('Models loaded. Subscribing to queues...')

  // Suscribir a las colas — el worker procesa jobs en paralelo
  await queue.work('analyze-conversation', { teamSize: 2 }, processAnalyzeConversationJob)
  await queue.work('moderate-image',       { teamSize: 4 }, processModerateImageJob)
  await queue.work('generate-embedding',   { teamSize: 1 }, processGenerateEmbeddingJob)

  logger.info('AI worker ready')

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Shutting down AI worker...')
    await queue.stop()
    process.exit(0)
  })
}

main().catch((err) => {
  logger.fatal(err, 'AI worker crashed on startup')
  process.exit(1)
})
```

---

## Modelos y cómo descargarlos

```bash
# Script de setup — ejecutar una vez al configurar el entorno
# workers/ai-pipeline/scripts/download-models.sh

#!/bin/bash
mkdir -p models

# Llama 3.2 3B Q4_K_M (Meta — community use license)
# ~2GB — cuantizado a 4 bits para caber en CPU con 4GB RAM
wget -O models/llama-3.2-3b.Q4_K_M.gguf \
  https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf

# all-MiniLM-L6-v2 ONNX (Apache 2.0 — sin restricciones comerciales)
# ~80MB — para embeddings de 384 dimensiones
wget -O models/minilm/model.onnx \
  https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx

echo "Models downloaded successfully"
```

| Modelo | Uso | Tamaño | Licencia | RAM requerida |
|--------|-----|--------|----------|---------------|
| Llama 3.2 3B Q4_K_M | Análisis conversaciones | ~2GB | Meta community | 3GB |
| NSFWJS MobileNet | Detección contenido explícito | ~15MB | MIT | <1GB |
| face-api SSD MobileNet | Detección de caras | ~6MB | MIT | <1GB |
| all-MiniLM-L6-v2 | Embeddings semánticos | ~80MB | Apache 2.0 | <1GB |

**RAM total recomendada para el worker: 6GB** (los modelos pequeños comparten memoria con Llama).

---

## Variables de entorno

```env
DATABASE_URL=postgresql://...
KEY_MGMT_DATABASE_URL=postgresql://...

AI_MODEL_PATH=./models/llama-3.2-3b.Q4_K_M.gguf
EMBEDDING_MODEL_PATH=./models/minilm/model.onnx
NSFW_MODEL_PATH=./models/nsfw/
FACE_API_MODEL_PATH=./models/face-api/

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

LOG_LEVEL=info
SERVICE_NAME=ai-worker
```

---

## Comandos habituales

```bash
# Setup inicial (descargar modelos)
npm run setup:models

# Desarrollo
npm run dev

# Build
npm run build

# Tests unitarios (con modelos mockeados)
npm run test:unit

# Test de un job específico en local
npm run test:job -- --job=analyze-conversation --fixture=fixtures/conversation.json
```
