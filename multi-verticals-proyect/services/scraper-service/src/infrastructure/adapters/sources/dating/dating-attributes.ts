/**
 * PROPUESTA de reestructuración de DatingAttributes.
 *
 * Criterios de diseño:
 *   1. Sin redundancias con RawExtraction — name, description, phones, email,
 *      location (city/country/…), imageUrls, price/currency ya van arriba.
 *   2. whatsapp/telegram se mantienen aquí como valor crudo scrapeado.
 *      El pipeline los eleva a RawExtraction.contacts vía extractContacts().
 *   3. Grupos semánticos claros → fácil de mapear al dominio Presenter.
 *   4. Cada campo lleva comentario solo cuando el nombre no es obvio.
 */

// ── Constantes compartidas ────────────────────────────────────────────────────

/**
 * Palabras clave de modalidad de lugar (lowercase).
 * Usadas por adapters para separar serviceLocations de servicios reales.
 */
export const SERVICE_LOCATION_KEYWORDS = new Set([
  'a domicilio',
  'domicilio',
  'hotel',
  'apartamento propio',
  'piso propio',
  'piso privado',
  'piso compartido',
  'sauna',
  'club',
  'coche',
  'incall',
  'outcall',
]);

// ── Sub-tipos ─────────────────────────────────────────────────────────────────

export type EscortRate = {
  /**
   * Texto libre tal como lo expresa el sitio: "30min", "1h", "2h", "noche".
   * Normalizar a minutos en el dominio, no aquí.
   */
  duration: string;
  incall?: number;
  outcall?: number;
};

export type EscortService = {
  name: string;
  /** true = incluido en tarifa base */
  included: boolean;
  /** true = disponible con coste adicional */
  extra: boolean;
};

export type EscortReview = {
  author: string;
  /** ISO date string tal como aparece en el sitio */
  date: string;
  rating: number;
  text: string;
  city?: string;
  appointmentDate?: string;
  duration?: string;
};

export type DatingAttributes = {
  // ── IDENTIDAD ───────────────────────────────────────────────────────────────
  // Quién es la persona más allá de lo físico.
  // nickname: nombre artístico o alias de la escort.
  // title: título del anuncio (si es distinto al nickname).

  nickname?: string;
  title?: string;

  // ── FÍSICO ──────────────────────────────────────────────────────────────────
  // Rasgos corporales scrapeados del perfil. Todos opcionales.

  age?: number;
  gender?: string; // Mujer / Hombre / Transexual / Travesti
  heightCm?: number;
  weightKg?: number;
  measurements?: string; // "90-60-90" bust-waist-hip
  hairColor?: string;
  hairLength?: string;
  eyeColor?: string;
  breastSize?: string; // copa: "A" | "B" | "C" | "D" | "E+"
  breastType?: string; // "Natural" | "Silicona"
  pubicHair?: string; // "Rasurado" | "Natural" | "Depilado"
  tattoos?: boolean;
  piercings?: boolean;

  // ── IDENTIDAD ───────────────────────────────────────────────────────────────
  // Quién es la persona más allá de lo físico.
  // nationality: país de origen scrapeado (texto libre).
  //   ⚠ No confundir con location.country (país donde opera).

  ethnicity?: string;
  languages?: string[];
  nationality?: string;
  orientation?: string; // "Hetero" | "Bisexual" | "Gay"
  profession?: string; // profesión secundaria si la declara
  smoker?: boolean;

  // ── DISPONIBILIDAD ──────────────────────────────────────────────────────────
  // Cómo y cuándo está disponible para citas.
  availability?: string[]; // días de la semana disponibles
  clientType?: string; // "Incall" | "Outcall" | "Ambos"
  schedule?: string; // "24 horas", "Lunes-Viernes"
  serviceType?: string; // "Hombres" | "Mujeres" | "Parejas" | "Todos"
  travelScope?: string; // "Local" | "Nacional" | "Internacional"

  // ── CUENTA Y VERIFICACIÓN ───────────────────────────────────────────────────
  // Estado dentro de la plataforma de origen.
  agency?: string;
  badges?: string[]; // ["video", "review", "new", "pornstar", "duo"]
  independent?: boolean;
  photoVerified?: boolean; // fotos verificadas por la plataforma
  verified?: boolean; // identidad verificada por la plataforma
  videoAvailable?: boolean; // tiene vídeo publicado

  // ── COMERCIAL ───────────────────────────────────────────────────────────────
  // Tarifas y cartera de servicios declarados.
  // El precio base por hora va en RawExtraction.price (campo de primer nivel).
  // rates contiene el desglose completo si el sitio lo expone.

  rates: EscortRate[];
  services: EscortService[];
  /** Métodos de pago aceptados: "Bizum", "Efectivo", "Tarjeta"… */
  paymentMethods?: string[];
  /**
   * Modalidades de lugar tal como las expresa el sitio. Texto libre — normalizar en dominio.
   * Semántica orientativa para el normalizer:
   *   "A Domicilio" | "Hotel"            → outcall (ella va al cliente)
   *   "Apartamento propio" | "Piso propio" → incall en piso propio → señal de independent=true
   *   "Piso compartido"                  → señal de independent=false (posible gestión externa)
   */
  serviceLocations?: string[];

  // Contacto adicional
  // whatsapp, telegram, instagram, tiktok, website van en RawExtraction.contacts — no aquí.

  // ── RESEÑAS ─────────────────────────────────────────────────────────────────

  /** Puntuación agregada del sitio origen. score: 0–5, count: nº de votos. */
  siteRating?: { score: number; count: number };
  reviews?: EscortReview[];
};
