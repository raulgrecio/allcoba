# 10 · Sistema de verticales

> Cada vertical es un nicho de negocio con atributos, taxonomía y reglas propias.
> El sistema es data-driven: añadir una nueva vertical no requiere código nuevo.

---

## Qué es una vertical

Una vertical es una configuración que define:
- Qué atributos tiene un provider de ese tipo
- Qué tipo de servicios puede ofrecer (unitarios y paquetes)
- Qué dimensiones se califican en el sistema de reputación
- Qué reglas aplican a las imágenes (caras permitidas, contexto esperado)
- Qué etiquetas puede generar el pipeline de IA

Ejemplo: `hairdresser` vs `real-estate` son verticales completamente distintas aunque ambas usan los mismos módulos de código.

---

## Schema de configuración de una vertical

```typescript
// packages/domain/src/vertical/vertical.entity.ts

interface VerticalConfig {
  // Atributos del provider en esta vertical
  providerAttributes: AttributeDefinition[]

  // Taxonomía de servicios disponibles
  serviceCategories: ServiceCategory[]

  // Dimensiones de reputación activas
  reputationDimensions: ReputationDimension[]

  // Reglas de moderación de imágenes
  imageRules: ImageRules

  // Etiquetas que el pipeline de IA puede asignar a clientes
  customerTagDefinitions: TagDefinition[]

  // Búsqueda: qué campos indexar en el tsvector
  searchableFields: string[]
}

interface AttributeDefinition {
  key: string
  label: string
  type: 'text' | 'enum' | 'boolean' | 'number' | 'range'
  options?: string[]     // para type 'enum'
  required: boolean
  searchable: boolean    // si se incluye en el índice de búsqueda
  filterable: boolean    // si aparece como filtro en la UI
}

interface ServiceCategory {
  key: string
  label: string
  allowsPackages: boolean
  priceType: 'fixed' | 'range' | 'on_request'
  durationRequired: boolean
}

interface ReputationDimension {
  key: string
  label: string
  forRole: 'provider' | 'consumer' | 'both'
}

interface ImageRules {
  facePolicy: 'required' | 'forbidden' | 'optional'
  contextKeywords: string[]   // palabras clave para el clasificador ONNX
  minWidth: number
  minHeight: number
  maxSizeMb: number
}

interface TagDefinition {
  key: string
  type: 'enum' | 'boolean' | 'text'
  enumValues?: string[]
}
```

---

## Definición de verticales (seed data)

```typescript
// infra/seeds/verticals.ts

export const VERTICALS: VerticalConfig[] = [

  // ─── PELUQUERÍA ───────────────────────────────────────────
  {
    slug: 'hairdresser',
    name: 'Peluquería',
    providerAttributes: [
      { key: 'gender_focus',   label: 'Especialidad', type: 'enum',
        options: ['hombre', 'mujer', 'unisex', 'infantil'],
        required: true, searchable: true, filterable: true },
      { key: 'accepts_walkins', label: 'Acepta sin cita', type: 'boolean',
        required: false, searchable: false, filterable: true },
      { key: 'parking',        label: 'Parking disponible', type: 'boolean',
        required: false, searchable: false, filterable: true },
    ],
    serviceCategories: [
      { key: 'cut',         label: 'Corte',        allowsPackages: true,  priceType: 'fixed',      durationRequired: true },
      { key: 'color',       label: 'Color',        allowsPackages: true,  priceType: 'range',      durationRequired: true },
      { key: 'treatment',   label: 'Tratamiento',  allowsPackages: false, priceType: 'fixed',      durationRequired: true },
      { key: 'bridal',      label: 'Novia',        allowsPackages: true,  priceType: 'on_request', durationRequired: false },
      { key: 'extensions',  label: 'Extensiones',  allowsPackages: false, priceType: 'range',      durationRequired: true },
    ],
    reputationDimensions: [
      { key: 'punctuality',  label: 'Puntualidad', forRole: 'both' },
      { key: 'quality',      label: 'Calidad',     forRole: 'provider' },
      { key: 'cleanliness',  label: 'Limpieza',    forRole: 'provider' },
      { key: 'price_fair',   label: 'Precio justo',forRole: 'provider' },
    ],
    imageRules: {
      facePolicy: 'optional',
      contextKeywords: ['hair', 'salon', 'scissors', 'cut', 'color', 'style'],
      minWidth: 400, minHeight: 400, maxSizeMb: 10,
    },
    customerTagDefinitions: [
      { key: 'tipo_servicio',  type: 'enum',    enumValues: ['corte', 'color', 'tratamiento', 'novia', 'extensiones'] },
      { key: 'frecuencia',     type: 'enum',    enumValues: ['única', 'esporádica', 'mensual', 'quincenal', 'semanal'] },
      { key: 'es_recurrente',  type: 'boolean' },
      { key: 'disponibilidad', type: 'enum',    enumValues: ['mañanas', 'tardes', 'fines_de_semana'] },
    ],
    searchableFields: ['display_name', 'bio', 'address_text', 'attributes.gender_focus'],
  },

  // ─── INMOBILIARIA ─────────────────────────────────────────
  {
    slug: 'real-estate',
    name: 'Inmobiliaria',
    providerAttributes: [
      { key: 'agency_name',   label: 'Agencia',           type: 'text',    required: false, searchable: true,  filterable: false },
      { key: 'specialization', label: 'Especialización',  type: 'enum',
        options: ['venta', 'alquiler', 'ambos', 'lujo', 'comercial'],
        required: true, searchable: true, filterable: true },
      { key: 'coverage_zones', label: 'Zonas que cubre', type: 'text',    required: false, searchable: true,  filterable: false },
    ],
    serviceCategories: [
      { key: 'sale',        label: 'Venta',       allowsPackages: false, priceType: 'on_request', durationRequired: false },
      { key: 'rental',      label: 'Alquiler',    allowsPackages: false, priceType: 'range',      durationRequired: false },
      { key: 'valuation',   label: 'Tasación',    allowsPackages: false, priceType: 'fixed',      durationRequired: false },
      { key: 'management',  label: 'Gestión',     allowsPackages: false, priceType: 'on_request', durationRequired: false },
    ],
    reputationDimensions: [
      { key: 'honesty',     label: 'Honestidad',   forRole: 'both' },
      { key: 'response_time', label: 'Respuesta', forRole: 'provider' },
      { key: 'accuracy',    label: 'Información real', forRole: 'provider' },
      { key: 'seriousness', label: 'Seriedad',    forRole: 'consumer' },
    ],
    imageRules: {
      facePolicy: 'forbidden',   // fotos de pisos, no de personas
      contextKeywords: ['house', 'apartment', 'room', 'kitchen', 'bathroom', 'facade'],
      minWidth: 800, minHeight: 600, maxSizeMb: 20,
    },
    customerTagDefinitions: [
      { key: 'tipo_busqueda',  type: 'enum',    enumValues: ['compra', 'alquiler'] },
      { key: 'urgencia',       type: 'enum',    enumValues: ['baja', 'media', 'alta'] },
      { key: 'presupuesto',    type: 'enum',    enumValues: ['<100k', '100-200k', '200-400k', '>400k'] },
      { key: 'es_inversor',    type: 'boolean' },
    ],
    searchableFields: ['display_name', 'bio', 'address_text', 'attributes.specialization', 'attributes.coverage_zones'],
  },

  // ─── AUTOMOCIÓN ───────────────────────────────────────────
  {
    slug: 'car',
    name: 'Automoción',
    providerAttributes: [
      { key: 'dealer_type', label: 'Tipo',       type: 'enum',
        options: ['concesionario_oficial', 'segunda_mano', 'particular', 'taller'],
        required: true, searchable: true, filterable: true },
      { key: 'brands',      label: 'Marcas',     type: 'text',    required: false, searchable: true,  filterable: false },
      { key: 'financing',   label: 'Financiación', type: 'boolean', required: false, searchable: false, filterable: true },
    ],
    serviceCategories: [
      { key: 'sale',      label: 'Venta',     allowsPackages: false, priceType: 'fixed',      durationRequired: false },
      { key: 'repair',    label: 'Reparación', allowsPackages: true, priceType: 'range',      durationRequired: true },
      { key: 'itv_prep',  label: 'Prep. ITV', allowsPackages: false, priceType: 'fixed',      durationRequired: true },
    ],
    reputationDimensions: [
      { key: 'honesty',      label: 'Honestidad del anuncio', forRole: 'provider' },
      { key: 'price_fair',   label: 'Precio justo',           forRole: 'provider' },
      { key: 'seriousness',  label: 'Seriedad',               forRole: 'both' },
    ],
    imageRules: {
      facePolicy: 'forbidden',
      contextKeywords: ['car', 'vehicle', 'wheel', 'interior', 'dashboard', 'engine'],
      minWidth: 800, minHeight: 600, maxSizeMb: 15,
    },
    customerTagDefinitions: [
      { key: 'tipo_interes',   type: 'enum',    enumValues: ['compra', 'reparación', 'información'] },
      { key: 'urgencia',       type: 'enum',    enumValues: ['baja', 'media', 'alta'] },
      { key: 'es_recurrente',  type: 'boolean' },
    ],
    searchableFields: ['display_name', 'bio', 'address_text', 'attributes.brands', 'attributes.dealer_type'],
  },
]
```

---

## Cómo añadir una nueva vertical

1. Añadir la definición en `infra/seeds/verticals.ts` (sólo datos, sin código)
2. Ejecutar `pnpm seed:verticals` para insertar en BD
3. Si la vertical requiere etiquetas IA nuevas, actualizar el prompt base en `workers/ai-pipeline/src/prompts/`
4. Si la vertical tiene reglas de imágenes específicas, configurar `imageRules`
5. No se necesita código nuevo en la API — el sistema es genérico

---

## Modelo de servicios y paquetes

```typescript
// packages/domain/src/service/service.entity.ts

interface Service {
  id: string
  providerId: string
  name: string
  description?: string
  priceCents?: number    // null si es on_request
  durationMin?: number
  isPackage: boolean
  packageItems?: ServicePackageItem[]  // sólo si isPackage = true
  isActive: boolean
  attributes: Record<string, unknown>  // atributos específicos de la vertical
}

interface ServicePackageItem {
  serviceId: string
  quantity: number
  discountPercent?: number
}

// Ejemplo: paquete "Lavar + Cortar + Peinar"
const packExample: Service = {
  id: 'uuid',
  providerId: 'uuid',
  name: 'Pack completo',
  description: 'Lavado, corte y peinado. Precio especial combinando servicios.',
  priceCents: 4500,   // 45€
  durationMin: 90,
  isPackage: true,
  packageItems: [
    { serviceId: 'uuid-lavado',  quantity: 1 },
    { serviceId: 'uuid-corte',   quantity: 1 },
    { serviceId: 'uuid-peinado', quantity: 1, discountPercent: 15 },
  ],
  isActive: true,
  attributes: {},
}
```
