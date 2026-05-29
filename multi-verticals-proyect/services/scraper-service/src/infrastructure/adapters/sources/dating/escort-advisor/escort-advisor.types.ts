export interface EscortAdvisorPhoto {
  readonly src: string;
}

export interface EscortAdvisorParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly nationality?: string;
  readonly ethnicity?: string;
  readonly services?: string[];
  /** "Madrid (M)" tal como aparece en "Ciudad:" de personal-info. */
  readonly city?: string;
  /** Texto libre de "Precio:", p.ej. "€€€€ de 201 y 500 euro". */
  readonly priceText?: string;
  /** Texto libre de "Recibo:", p.ej. "A mi casa Hotel/Motel En la casa del cliente". */
  readonly meetingRaw?: string;
  /** "Figura:", p.ej. "Atlética". */
  readonly bodyType?: string;
  /** "Ojos:", p.ej. "Marrones". */
  readonly eyeColor?: string;
  /** "Cabellos:", p.ej. "Oscuro largo". */
  readonly hairColor?: string;
}

export interface EscortAdvisorPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  /** WhatsApp desde onclick="whatsApp(+PHONE,...)". */
  readonly whatsapp?: string;
  readonly params: EscortAdvisorParams;
  readonly photos: readonly EscortAdvisorPhoto[];
  readonly isVerified: boolean;
  readonly reviewsRating?: number;
  readonly reviewsCount?: number;
}
