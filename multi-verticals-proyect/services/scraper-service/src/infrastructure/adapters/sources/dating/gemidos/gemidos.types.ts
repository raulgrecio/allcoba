export interface GemidosPhoto {
  readonly src: string;
}

/** Un servicio ofertado con su slug canónico, etiqueta visible y categoría. */
export interface GemidosService {
  /** Valor del href tal como aparece en el HTML, p.ej. "servicio-gfe", "oral-69". */
  readonly slug: string;
  /** Texto visible del tag, p.ej. "GFE", "69". */
  readonly label: string;
  /** Grupo funcional inferido de la clase CSS del elemento. */
  readonly category: 'services' | 'oral' | 'fantasy' | 'massage' | 'online' | 'extra';
}

export interface GemidosParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly measurements?: string;
  readonly nationality?: string;
  readonly ethnicity?: string;
  /** Servicios estructurados con slug, etiqueta y categoría. */
  readonly services?: GemidosService[];
  /** Tags de ubicación tal como aparecen en .pub-location-tag. */
  readonly locationTags?: string[];
  /** Dirección libre del perfil ("Me encuentro en …"). */
  readonly address?: string;
  /** Texto de horario de atención (.pub-hours-time), p.ej. "FULL TIME". */
  readonly workingHours?: string;
}

export interface GemidosPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  /** WhatsApp desde data-whatsapp-phone en .pub-menu button. */
  readonly whatsapp?: string;
  readonly params: GemidosParams;
  readonly photos: readonly GemidosPhoto[];
  readonly isVerified: boolean;
}
