# 19 · Infraestructura y despliegue

> Tres fases de infraestructura. Se empieza en coste cero y se escala sin reescribir.
> Cada servicio es intercambiable — nunca hay lock-in.

---

## Principio de sustitución de infraestructura

Cada servicio externo se usa a través de un adapter (ver arquitectura hexagonal). Migrar de Railway a un VPS propio = cambiar variables de entorno y desplegar el mismo código. No hay código que dependa del proveedor de hosting.

---

## Fase 0 — MVP (coste ~0€/mes)

Para validar el producto. Límites de free tier suficientes para primeros 100-500 providers.

| Servicio           | Proveedor                          | Free tier                             |
| ------------------ | ---------------------------------- | ------------------------------------- |
| PostgreSQL         | **Supabase**                       | 500MB, 2 proyectos                    |
| API (Node.js)      | **Railway**                        | 500h/mes, 512MB RAM                   |
| Workers (IA, ETL)  | **Railway**                        | segundo servicio en el mismo proyecto |
| Web frontend       | **Cloudflare Pages**               | ilimitado, CDN global                 |
| Imágenes (R2)      | **Cloudflare R2**                  | 10GB, 0 egress fees                   |
| Logs               | **Grafana Cloud**                  | 50GB/mes                              |
| Errores            | **Sentry**                         | 5K errores/mes                        |
| Push notifications | **FCM** (Firebase Cloud Messaging) | gratuito, sólo mensajería             |

**Importante sobre Supabase**: se usa únicamente como PostgreSQL gestionado. No se usa Supabase Auth, Supabase Storage, Supabase Realtime, ni ninguna API propietaria de Supabase. La conexión es un `DATABASE_URL` estándar de PostgreSQL.

```text
Arquitectura Fase 0:

  [Vercel Pages]         [Railway: API]        [Supabase PostgreSQL]
  React + Nextjs         Fastify + Node.js  ←→  marketplace DB
                                            ←→  keymanagement DB
  [Flutter App]          [Railway: Workers]  →  [Cloudflare R2]
  iOS + Android          IA pipeline             imágenes
                         ETL scraper
```

---

## Fase 1 — Tracción (coste ~15-40€/mes)

Cuando el free tier de Supabase/Railway se queda corto (~500 providers activos, ~10K requests/día).

| Servicio             | Proveedor                         | Coste aprox.                     |
| -------------------- | --------------------------------- | -------------------------------- |
| PostgreSQL + PostGIS | **Hetzner VPS CX21** (2vCPU, 4GB) | ~6€/mes                          |
| API + Workers        | **Hetzner VPS CX21**              | ~6€/mes (mismo VPS o segundo)    |
| Backups              | **Backblaze B2**                  | ~0€ (10GB free, luego $0.006/GB) |
| Exposición pública   | **Cloudflare Tunnel**             | gratuito                         |
| Web frontend         | **Cloudflare Pages**              | gratuito                         |
| R2 imágenes          | **Cloudflare R2**                 | ~0€ hasta 10GB                   |

```text
Arquitectura Fase 1:

  [Cloudflare CDN]
       │
  [Cloudflare Tunnel]  ←── tunnel cifrado sin IP pública expuesta
       │
  [Hetzner VPS]
    ├── PostgreSQL 16 (puerto sólo en localhost)
    ├── API Fastify (proceso Node.js, PM2)
    ├── Worker IA (proceso Node.js, PM2)
    └── Worker ETL (proceso Node.js, PM2)
       │
  [Backblaze B2]  ←── backups diarios pg_dump cifrado
```

**Docker Compose para desarrollo local** (idéntico al de producción Fase 1):

```yaml
# infra/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_DB: marketplace
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432" # sólo en desarrollo — en prod sin puerto público
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/init.sql:/docker-entrypoint-initdb.d/init.sql

  postgres_keys: # base de datos de claves — completamente separada
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keymanagement
      POSTGRES_USER: ${KM_DB_USER}
      POSTGRES_PASSWORD: ${KM_DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - keys_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/marketplace
      KEY_MGMT_DATABASE_URL: postgresql://${KM_DB_USER}:${KM_DB_PASSWORD}@postgres_keys:5432/keymanagement
      NODE_ENV: development
    ports:
      - "3000:3000"
    depends_on: [postgres, postgres_keys]
    volumes:
      - ./apps/api/src:/app/src # hot reload en desarrollo

  worker_ai:
    build:
      context: .
      dockerfile: workers/ai-pipeline/Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/marketplace
    volumes:
      - ./workers/ai-pipeline/models:/app/models # modelos LLM en local
    depends_on: [postgres]

volumes:
  postgres_data:
  keys_data:
```

---

## Fase 2 — Escala (coste variable, ~100€+/mes)

Cuando el VPS único no es suficiente (~5K providers activos, ~100K requests/día).

| Componente   | Migración                                                     |
| ------------ | ------------------------------------------------------------- |
| PostgreSQL   | → **Neon** (serverless, branching) o **RDS PostgreSQL**       |
| Cola de jobs | → **BullMQ + Redis** (Upstash free tier o Redis Cloud)        |
| Search       | → **Typesense** self-hosted o **Meilisearch Cloud**           |
| CDN media    | → **Bunny.net** ($0.01/GB, más barato que R2 a escala)        |
| API          | → múltiples instancias detrás de **Cloudflare Load Balancer** |

Cada migración es **independiente** — se puede migrar el search sin tocar la cola, o la cola sin tocar PostgreSQL. Esto es posible porque cada componente está detrás de un adapter.

---

## Gestión de secretos

```text
Desarrollo:     .env.local (nunca en git — .gitignore lo excluye)
Staging/Prod:   Variables de entorno del proveedor de hosting
                (Railway env vars, Hetzner con vault propio)

Nunca:
  - Secretos en código fuente
  - Secretos en Dockerfile
  - Secretos en logs
  - Secretos en variables de entorno del sistema operativo sin restricción de usuario
```

```bash
# .env.example — documentación de variables requeridas (sin valores reales)
NODE_ENV=development
PORT=3000

# Base de datos principal
DATABASE_URL=postgresql://user:password@localhost:5432/marketplace

# Base de datos de claves (SEPARADA — distinta instancia)
KEY_MGMT_DATABASE_URL=postgresql://user:password@localhost:5433/keymanagement

# JWT (generar con: node -e "require('crypto').generateKeyPairSync('rsa', {modulusLength:2048})")
JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=

# Plataforma
PLATFORM_SALT=         # 32 bytes aleatorios — NUNCA cambiar en producción
SESSION_SECRET=        # 32 bytes aleatorios

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Observabilidad
SENTRY_DSN=
GRAFANA_LOKI_URL=
LOG_LEVEL=info

# Workers
AI_MODEL_PATH=./models/llama-3.2-3b.Q4_K_M.gguf
```

---

## Dockerfiles de producción

```dockerfile
# apps/api/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
# Usuario sin privilegios
RUN addgroup -S marketplace && adduser -S api -G marketplace
COPY --from=builder --chown=api:marketplace /app/dist ./dist
COPY --from=builder --chown=api:marketplace /app/node_modules ./node_modules
USER api
EXPOSE 3000
CMD ["node", "dist/apps/api/src/index.js"]
```

---

## Backups

```bash
# Script de backup diario (cron en el VPS)
# infra/scripts/backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="marketplace_${DATE}.dump"

# Dump comprimido y cifrado
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file=/tmp/$BACKUP_FILE

# Cifrar antes de subir (clave en variable de entorno)
openssl enc -aes-256-cbc -salt \
  -in /tmp/$BACKUP_FILE \
  -out /tmp/${BACKUP_FILE}.enc \
  -pass env:BACKUP_ENCRYPTION_KEY

# Subir a Backblaze B2 (CLI de B2)
b2 upload-file marketplace-backups /tmp/${BACKUP_FILE}.enc ${BACKUP_FILE}.enc

# Limpiar local
rm /tmp/$BACKUP_FILE /tmp/${BACKUP_FILE}.enc

# Eliminar backups de más de 30 días en B2
b2 delete-file-version ... # lógica de retención
```
